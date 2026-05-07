import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { WalletStatus } from '../../common/enums/wallet-status.enum';
import { WalletTransactionSource } from '../../common/enums/wallet-transaction-source.enum';
import { WalletTransactionType } from '../../common/enums/wallet-transaction-type.enum';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { WalletTransactionEntity } from '../wallet-transactions/entities/wallet-transaction.entity';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import { CreateWalletRechargeDto } from './dto/create-wallet-recharge.dto';
import { UpdateWalletRechargeStatusDto } from './dto/update-wallet-recharge-status.dto';
import { WalletRechargeEntity } from './entities/wallet-recharge.entity';

@Injectable()
export class WalletRechargesService {
  constructor(
    @InjectRepository(WalletRechargeEntity)
    private readonly walletRechargesRepository: Repository<WalletRechargeEntity>,

    @InjectRepository(WalletEntity)
    private readonly walletsRepository: Repository<WalletEntity>,

    @InjectRepository(PartnerProfileEntity)
    private readonly partnerProfilesRepository: Repository<PartnerProfileEntity>,

    @InjectRepository(WalletTransactionEntity)
    private readonly walletTransactionsRepository: Repository<WalletTransactionEntity>,

    private readonly dataSource: DataSource,
  ) {}

  private computeWalletStatus(balance: number): WalletStatus {
    if (balance <= 0) {
      return WalletStatus.VIDE;
    }

    if (balance < 5000) {
      return WalletStatus.FAIBLE;
    }

    return WalletStatus.ACTIF;
  }

  private getRechargeReferencePrefix(rechargeMode: string): string {
    const prefixes: Record<string, string> = {
      wave: 'WAVE',
      orange_money: 'OM',
      mtn_money: 'MTN',
      moov_money: 'MOOV',
      espece: 'CASH',
    };

    return prefixes[String(rechargeMode).toLowerCase()] ?? 'PAY';
  }

  private formatReferenceDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
  }

  private async generateRechargeReference(
    rechargeMode: string,
  ): Promise<string> {
    const now = new Date();
    const datePart = this.formatReferenceDate(now);
    const prefix = this.getRechargeReferencePrefix(rechargeMode);

    const countForToday = await this.walletRechargesRepository.count({
      where: {},
    });

    const sequence = String(countForToday + 1).padStart(5, '0');

    return `OFNA-${prefix}-${datePart}-${sequence}`;
  }

  private async ensureWalletForUser(userId: string): Promise<WalletEntity> {
    const partnerProfile = await this.partnerProfilesRepository.findOne({
      where: {
        user: { id: userId },
      },
      relations: {
        user: true,
        wallet: true,
      },
    });

    if (!partnerProfile) {
      throw new NotFoundException('Partner profile not found');
    }

    if (partnerProfile.wallet) {
      return this.walletsRepository.findOneOrFail({
        where: { id: partnerProfile.wallet.id },
        relations: {
          partnerProfile: true,
        },
      });
    }

    const wallet = this.walletsRepository.create({
      partnerProfile,
      balance: '0.00',
      walletStatus: WalletStatus.VIDE,
    });

    await this.walletsRepository.save(wallet);

    return this.walletsRepository.findOneOrFail({
      where: { id: wallet.id },
      relations: {
        partnerProfile: true,
      },
    });
  }

  async createRecharge(
    userId: string,
    dto: CreateWalletRechargeDto,
  ): Promise<WalletRechargeEntity> {
    const wallet = await this.ensureWalletForUser(userId);

    const amount = Number(dto.amount);

    if (Number.isNaN(amount) || amount <= 0) {
      throw new BadRequestException(
        'Le montant de la recharge doit être supérieur à 0.',
      );
    }

    const balanceBeforeCreation = Number(wallet.balance);

    if (Number.isNaN(balanceBeforeCreation)) {
      throw new BadRequestException('Solde portefeuille invalide.');
    }

    const walletStatusBeforeCreation = this.computeWalletStatus(
      balanceBeforeCreation,
    );

    const recharge = this.walletRechargesRepository.create({
      wallet,
      amount: amount.toFixed(2),
      rechargeMode: dto.rechargeMode,
      transactionReference:
        dto.transactionReference?.trim() ||
        (await this.generateRechargeReference(dto.rechargeMode)),
      transactionStatus: TransactionStatus.EN_ATTENTE,
      rechargedAt: null,
    });

    await this.walletRechargesRepository.save(recharge);

    /**
     * Sécurité métier importante :
     * La création d'une recharge partenaire ne doit JAMAIS créditer le portefeuille.
     * Le solde ne doit bouger que lorsque l'admin valide la recharge.
     *
     * Cette sauvegarde remet explicitement le portefeuille dans son état initial
     * après la soumission, même si une ancienne logique ou un effet secondaire
     * tente de modifier le solde pendant la création.
     */
    const freshWallet = await this.walletsRepository.findOne({
      where: { id: wallet.id },
      relations: {
        partnerProfile: true,
      },
    });

    if (!freshWallet) {
      throw new NotFoundException('Wallet not found');
    }

    freshWallet.balance = balanceBeforeCreation.toFixed(2);
    freshWallet.walletStatus = walletStatusBeforeCreation;

    await this.walletsRepository.save(freshWallet);

    return this.walletRechargesRepository.findOneOrFail({
      where: { id: recharge.id },
      relations: {
        wallet: true,
      },
    });
  }

  async getMyRecharges(userId: string): Promise<WalletRechargeEntity[]> {
    const wallet = await this.ensureWalletForUser(userId);

    return this.walletRechargesRepository.find({
      where: {
        wallet: { id: wallet.id },
      },
      relations: {
        wallet: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getRechargeById(
    userId: string,
    rechargeId: string,
  ): Promise<WalletRechargeEntity> {
    const wallet = await this.ensureWalletForUser(userId);

    const recharge = await this.walletRechargesRepository.findOne({
      where: {
        id: rechargeId,
        wallet: { id: wallet.id },
      },
      relations: {
        wallet: true,
      },
    });

    if (!recharge) {
      throw new NotFoundException('Wallet recharge not found');
    }

    return recharge;
  }

  async getAllRechargesForAdmin(): Promise<WalletRechargeEntity[]> {
    return this.walletRechargesRepository.find({
      relations: {
        wallet: {
          partnerProfile: {
            user: true,
          },
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async updateRechargeStatusAsAdmin(
    rechargeId: string,
    dto: UpdateWalletRechargeStatusDto,
  ): Promise<WalletRechargeEntity> {
    await this.dataSource.transaction(async (manager) => {
      const recharge = await manager.findOne(WalletRechargeEntity, {
        where: { id: rechargeId },
        relations: {
          wallet: {
            partnerProfile: {
              user: true,
            },
          },
        },
      });

      if (!recharge) {
        throw new NotFoundException('Wallet recharge not found');
      }

      const wallet = recharge.wallet;

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (recharge.transactionStatus !== TransactionStatus.EN_ATTENTE) {
        throw new BadRequestException('Cette recharge a déjà été traitée.');
      }

      const rechargeAmount = Number(recharge.amount);

      if (Number.isNaN(rechargeAmount) || rechargeAmount <= 0) {
        throw new BadRequestException('Montant de recharge invalide.');
      }

      if (dto.transactionReference !== undefined) {
        recharge.transactionReference = dto.transactionReference.trim() || null;
      }

      if (dto.transactionStatus === TransactionStatus.ECHOUEE) {
        recharge.transactionStatus = TransactionStatus.ECHOUEE;
        recharge.rechargedAt = null;

        await manager.save(WalletRechargeEntity, recharge);
        return;
      }

      if (dto.transactionStatus !== TransactionStatus.REUSSIE) {
        throw new BadRequestException('Statut de recharge invalide.');
      }

      const balanceBefore = Number(wallet.balance);

      if (Number.isNaN(balanceBefore)) {
        throw new BadRequestException('Solde portefeuille invalide.');
      }

      const balanceAfter = Number((balanceBefore + rechargeAmount).toFixed(2));

      wallet.balance = balanceAfter.toFixed(2);
      wallet.walletStatus = this.computeWalletStatus(balanceAfter);

      await manager.save(WalletEntity, wallet);

      const transaction = manager.create(WalletTransactionEntity, {
        wallet,
        transactionType: WalletTransactionType.CREDIT,
        sourceType: WalletTransactionSource.RECHARGE,
        amount: rechargeAmount.toFixed(2),
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        mission: null,
        label: 'Recharge portefeuille',
        reference: recharge.transactionReference ?? recharge.id,
        note: 'Recharge validée par le super admin',
      });

      await manager.save(WalletTransactionEntity, transaction);

      recharge.transactionStatus = TransactionStatus.REUSSIE;
      recharge.rechargedAt = new Date();

      await manager.save(WalletRechargeEntity, recharge);
    });

    return this.walletRechargesRepository.findOneOrFail({
      where: { id: rechargeId },
      relations: {
        wallet: {
          partnerProfile: {
            user: true,
          },
        },
      },
    });
  }
}
