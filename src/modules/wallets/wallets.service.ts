import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { WalletStatus } from '../../common/enums/wallet-status.enum';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { WalletRechargeEntity } from '../wallet-recharges/entities/wallet-recharge.entity';
import { WalletEntity } from './entities/wallet.entity';
import { WalletSummary } from './interfaces/wallet-summary.interface';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletsRepository: Repository<WalletEntity>,
    @InjectRepository(PartnerProfileEntity)
    private readonly partnerProfilesRepository: Repository<PartnerProfileEntity>,
    @InjectRepository(WalletRechargeEntity)
    private readonly walletRechargesRepository: Repository<WalletRechargeEntity>,
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

  async ensureWalletForUser(userId: string): Promise<WalletEntity> {
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

  async getMyWallet(userId: string): Promise<WalletEntity> {
    return this.ensureWalletForUser(userId);
  }

  async getWalletHistory(userId: string): Promise<WalletRechargeEntity[]> {
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

  async getWalletSummary(userId: string): Promise<WalletSummary> {
    const wallet = await this.ensureWalletForUser(userId);
    const history = await this.getWalletHistory(userId);

    const successfulRecharges = history.filter(
      (item) => item.transactionStatus === 'reussie',
    );

    const numericBalance = Number(wallet.balance);
    wallet.walletStatus = this.computeWalletStatus(numericBalance);
    await this.walletsRepository.save(wallet);

    return {
      wallet,
      totalRecharges: history.length,
      successfulRechargesCount: successfulRecharges.length,
      latestRecharge: history[0] ?? null,
    };
  }

  async refreshWalletStatus(userId: string): Promise<WalletEntity> {
    const wallet = await this.ensureWalletForUser(userId);
    const numericBalance = Number(wallet.balance);

    wallet.walletStatus = this.computeWalletStatus(numericBalance);

    await this.walletsRepository.save(wallet);

    return this.walletsRepository.findOneOrFail({
      where: { id: wallet.id },
      relations: {
        partnerProfile: true,
      },
    });
  }
  
}