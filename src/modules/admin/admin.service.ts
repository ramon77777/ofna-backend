import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { CommissionOperationType } from '../../common/enums/commission-operation-type.enum';
import { MissionStatus } from '../../common/enums/mission-status.enum';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { PartnerDocumentStatus } from '../../common/enums/partner-document-status.enum';
import { PartnerValidationStatus } from '../../common/enums/partner-validation-status.enum';
import { WalletStatus } from '../../common/enums/wallet-status.enum';
import { WalletTransactionSource } from '../../common/enums/wallet-transaction-source.enum';
import { WalletTransactionType } from '../../common/enums/wallet-transaction-type.enum';
import { CommissionEntity } from '../commissions/entities/commission.entity';
import { MissionEntity } from '../missions/entities/mission.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PartnerDocumentEntity } from '../partner-documents/entities/partner-document.entity';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { WalletRechargeEntity } from '../wallet-recharges/entities/wallet-recharge.entity';
import { WalletTransactionEntity } from '../wallet-transactions/entities/wallet-transaction.entity';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import { RequestPartnerDocumentsDto } from './dto/request-partner-documents.dto';
import { ValidatePartnerDto } from './dto/validate-partner.dto';

@Injectable()
export class AdminService {
  private readonly commissionRate = 10;

  constructor(
    @InjectRepository(PartnerProfileEntity)
    private readonly partnerProfilesRepository: Repository<PartnerProfileEntity>,

    @InjectRepository(PartnerDocumentEntity)
    private readonly partnerDocumentsRepository: Repository<PartnerDocumentEntity>,

    @InjectRepository(MissionEntity)
    private readonly missionsRepository: Repository<MissionEntity>,

    @InjectRepository(CommissionEntity)
    private readonly commissionsRepository: Repository<CommissionEntity>,

    @InjectRepository(WalletRechargeEntity)
    private readonly walletRechargesRepository: Repository<WalletRechargeEntity>,

    @InjectRepository(WalletTransactionEntity)
    private readonly walletTransactionsRepository: Repository<WalletTransactionEntity>,

    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  private getWalletStatus(balance: number): WalletStatus {
    if (balance <= 0) return WalletStatus.VIDE;
    if (balance < 5000) return WalletStatus.FAIBLE;
    return WalletStatus.ACTIF;
  }

  async getPendingPartners(): Promise<PartnerProfileEntity[]> {
    return this.partnerProfilesRepository.find({
      where: [
        { validationStatus: PartnerValidationStatus.EN_ATTENTE },
        { validationStatus: PartnerValidationStatus.EN_COURS_VERIFICATION },
        { validationStatus: PartnerValidationStatus.DOCUMENTS_A_COMPLETER },
      ],
      relations: {
        user: true,
        documents: true,
        wallet: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getAllPartners(): Promise<PartnerProfileEntity[]> {
    return this.partnerProfilesRepository.find({
      relations: {
        user: true,
        wallet: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getPartnerDetails(partnerProfileId: string): Promise<PartnerProfileEntity> {
    const partner = await this.partnerProfilesRepository.findOne({
      where: { id: partnerProfileId },
      relations: {
        user: true,
        documents: {
          verifiedByAdmin: true,
        },
        wallet: true,
        reviews: true,
      },
    });

    if (!partner) {
      throw new NotFoundException('Partner profile not found');
    }

    return partner;
  }

  async validatePartner(
    partnerProfileId: string,
    dto: ValidatePartnerDto,
  ): Promise<PartnerProfileEntity> {
    const partner = await this.partnerProfilesRepository.findOne({
      where: { id: partnerProfileId },
      relations: {
        user: true,
        documents: true,
        wallet: true,
      },
    });

    if (!partner) {
      throw new NotFoundException('Partner profile not found');
    }

    partner.validationStatus = dto.validationStatus;

    if (dto.validationStatus === PartnerValidationStatus.VALIDE) {
      partner.validatedAt = new Date();
      partner.isVisible = true;
    }

    if (
      dto.validationStatus === PartnerValidationStatus.REJETE ||
      dto.validationStatus === PartnerValidationStatus.DOCUMENTS_A_COMPLETER
    ) {
      partner.isVisible = false;
    }

    await this.partnerProfilesRepository.save(partner);

    await this.notificationsService.createNotification({
      userId: partner.user.id,
      title: 'Mise à jour de votre dossier partenaire',
      message:
        dto.comment ??
        `Votre dossier partenaire a été mis à jour: ${dto.validationStatus}.`,
      notificationType: NotificationType.VALIDATION_COMPTE,
    });

    return this.getPartnerDetails(partnerProfileId);
  }

  async requestPartnerDocuments(
    partnerProfileId: string,
    dto: RequestPartnerDocumentsDto,
  ): Promise<PartnerProfileEntity> {
    const partner = await this.partnerProfilesRepository.findOne({
      where: { id: partnerProfileId },
      relations: {
        user: true,
        documents: true,
        wallet: true,
      },
    });

    if (!partner) {
      throw new NotFoundException('Partner profile not found');
    }

    partner.validationStatus = PartnerValidationStatus.DOCUMENTS_A_COMPLETER;
    partner.isVisible = false;

    await this.partnerProfilesRepository.save(partner);

    for (const document of partner.documents ?? []) {
      if (document.documentStatus === PartnerDocumentStatus.SOUMIS) {
        document.documentStatus = PartnerDocumentStatus.A_REPRENDRE;
        document.adminComment = dto.message;
        await this.partnerDocumentsRepository.save(document);
      }
    }

    await this.notificationsService.createNotification({
      userId: partner.user.id,
      title: 'Documents complémentaires demandés',
      message: dto.message,
      notificationType: NotificationType.VALIDATION_COMPTE,
    });

    return this.getPartnerDetails(partnerProfileId);
  }

  async getAllMissions(): Promise<MissionEntity[]> {
    return this.missionsRepository.find({
      relations: {
        client: true,
        partnerProfile: {
          user: true,
          wallet: true,
        },
        commissions: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getMissionDetails(missionId: string): Promise<MissionEntity> {
    const mission = await this.missionsRepository.findOne({
      where: { id: missionId },
      relations: {
        client: true,
        partnerProfile: {
          user: true,
          wallet: true,
        },
        commissions: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    return mission;
  }

  async getAllCommissions(): Promise<CommissionEntity[]> {
    return this.commissionsRepository.find({
      relations: {
        partnerProfile: {
          user: true,
          wallet: true,
        },
        mission: {
          client: true,
          partnerProfile: {
            user: true,
          },
        },
        order: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async processMissionCommission(missionId: string): Promise<MissionEntity> {
    await this.dataSource.transaction(async (manager) => {
      const mission = await manager.findOne(MissionEntity, {
        where: { id: missionId },
        relations: {
          client: true,
          partnerProfile: {
            user: true,
            wallet: true,
          },
          commissions: true,
        },
      });

      if (!mission) {
        throw new NotFoundException('Mission not found');
      }

      if (mission.missionStatus !== MissionStatus.TERMINEE) {
        throw new BadRequestException(
          'Seules les missions terminées peuvent être commissionnées.',
        );
      }

      if (mission.commissionProcessed) {
        return;
      }

      if (mission.commissions && mission.commissions.length > 0) {
        mission.commissionProcessed = true;
        await manager.save(MissionEntity, mission);
        return;
      }

      if (!mission.partnerProfile) {
        throw new BadRequestException('Cette mission n’a pas de partenaire assigné.');
      }

      if (!mission.partnerProfile.wallet) {
        throw new BadRequestException('Le partenaire n’a pas de portefeuille.');
      }

      if (!mission.validatedAmount) {
        throw new BadRequestException('Cette mission n’a pas de montant validé.');
      }

      const wallet = mission.partnerProfile.wallet;
      const operationAmount = Number(mission.validatedAmount);

      if (Number.isNaN(operationAmount) || operationAmount <= 0) {
        throw new BadRequestException('Montant validé invalide.');
      }

      const commissionAmount = Number(
        ((operationAmount * this.commissionRate) / 100).toFixed(2),
      );

      const balanceBefore = Number(wallet.balance);

      if (Number.isNaN(balanceBefore)) {
        throw new BadRequestException('Solde portefeuille invalide.');
      }

      if (balanceBefore < commissionAmount) {
        throw new BadRequestException(
          'Solde portefeuille insuffisant pour prélever la commission.',
        );
      }

      const balanceAfter = Number((balanceBefore - commissionAmount).toFixed(2));

      const insertedCommission = await manager.query(
        `
        INSERT INTO commissions (
          partner_profile_id,
          mission_id,
          order_id,
          operation_type,
          operation_amount,
          commission_rate,
          commission_amount,
          note,
          debited_at,
          created_at
        )
        VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id
        `,
        [
          mission.partnerProfile.id,
          mission.id,
          CommissionOperationType.MISSION,
          operationAmount.toFixed(2),
          this.commissionRate.toFixed(2),
          commissionAmount.toFixed(2),
          'Commission traitée manuellement par le super admin',
        ],
      );

      const commissionId = insertedCommission[0]?.id as string;

      wallet.balance = balanceAfter.toFixed(2);
      wallet.walletStatus = this.getWalletStatus(balanceAfter);

      await manager.save(WalletEntity, wallet);

      await manager.query(
        `
        INSERT INTO wallet_transactions (
          wallet_id,
          transaction_type,
          source_type,
          amount,
          balance_before,
          balance_after,
          mission_id,
          label,
          reference,
          note,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        `,
        [
          wallet.id,
          WalletTransactionType.DEBIT,
          WalletTransactionSource.COMMISSION,
          commissionAmount.toFixed(2),
          balanceBefore.toFixed(2),
          balanceAfter.toFixed(2),
          mission.id,
          'Commission mission',
          commissionId,
          'Commission prélevée par le super admin',
        ],
      );

      mission.commissionProcessed = true;
      await manager.save(MissionEntity, mission);
    });

    return this.getMissionDetails(missionId);
  }

  async getFinanceDashboard() {
    const totalCommissionRaw = await this.commissionsRepository
      .createQueryBuilder('commission')
      .select('COALESCE(SUM(commission.commissionAmount), 0)', 'total')
      .getRawOne<{ total: string }>();

    const totalRechargesRaw = await this.walletRechargesRepository
      .createQueryBuilder('recharge')
      .select('COALESCE(SUM(recharge.amount), 0)', 'total')
      .getRawOne<{ total: string }>();

    const pendingRecharges = await this.walletRechargesRepository.count({
      where: { transactionStatus: 'en_attente' as any },
    });

    const totalTransactions = await this.walletTransactionsRepository.count();

    const recentCommissions = await this.commissionsRepository.find({
      relations: {
        partnerProfile: {
          user: true,
          wallet: true,
        },
        mission: {
          client: true,
          partnerProfile: {
            user: true,
          },
        },
        order: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 8,
    });

    const recentTransactions = await this.walletTransactionsRepository.find({
      relations: {
        wallet: {
          partnerProfile: {
            user: true,
          },
        },
        mission: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 8,
    });

    const recentRecharges = await this.walletRechargesRepository.find({
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
      take: 8,
    });

    return {
      stats: {
        totalCommissionAmount: Number(totalCommissionRaw?.total ?? '0').toFixed(2),
        totalRechargeAmount: Number(totalRechargesRaw?.total ?? '0').toFixed(2),
        pendingRecharges,
        totalTransactions,
      },
      recentCommissions,
      recentTransactions,
      recentRecharges,
    };
  }

  async getDashboard() {
    const totalPartners = await this.partnerProfilesRepository.count();

    const pendingPartners = await this.partnerProfilesRepository.count({
      where: [
        { validationStatus: PartnerValidationStatus.EN_ATTENTE },
        { validationStatus: PartnerValidationStatus.EN_COURS_VERIFICATION },
        { validationStatus: PartnerValidationStatus.DOCUMENTS_A_COMPLETER },
      ],
    });

    const validatedPartners = await this.partnerProfilesRepository.count({
      where: { validationStatus: PartnerValidationStatus.VALIDE },
    });

    const totalMissions = await this.missionsRepository.count();

    const completedMissions = await this.missionsRepository.count({
      where: { missionStatus: MissionStatus.TERMINEE },
    });

    const pendingRecharges = await this.walletRechargesRepository.count({
      where: { transactionStatus: 'en_attente' as any },
    });

    const documentsToRedo = await this.partnerDocumentsRepository.count({
      where: { documentStatus: PartnerDocumentStatus.A_REPRENDRE },
    });

    const commissionsToProcess = await this.missionsRepository.count({
      where: {
        missionStatus: MissionStatus.TERMINEE,
        commissionProcessed: false,
      },
    });

    const totalCommissionRaw = await this.commissionsRepository
      .createQueryBuilder('commission')
      .select('COALESCE(SUM(commission.commissionAmount), 0)', 'total')
      .getRawOne<{ total: string }>();

    const recentMissions = await this.missionsRepository.find({
      relations: {
        client: true,
        partnerProfile: {
          user: true,
          wallet: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
      take: 6,
    });

    const recentPartners = await this.partnerProfilesRepository.find({
      relations: {
        user: true,
        wallet: true,
        documents: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 6,
    });

    const operationalAlerts: Array<{
      level: 'warning' | 'info' | 'success';
      title: string;
      message: string;
    }> = [];

    if (pendingPartners > 0) {
      operationalAlerts.push({
        level: 'warning',
        title: 'Validation partenaire en attente',
        message: `${pendingPartners} dossier(s) partenaire nécessitent une action du super administrateur.`,
      });
    }

    if (documentsToRedo > 0) {
      operationalAlerts.push({
        level: 'warning',
        title: 'Documents à reprendre',
        message: `${documentsToRedo} document(s) partenaire sont en attente de reprise.`,
      });
    }

    if (pendingRecharges > 0) {
      operationalAlerts.push({
        level: 'info',
        title: 'Recharges en attente',
        message: `${pendingRecharges} recharge(s) portefeuille attendent un traitement.`,
      });
    }

    if (commissionsToProcess > 0) {
      operationalAlerts.push({
        level: 'info',
        title: 'Commissions non encore traitées',
        message: `${commissionsToProcess} mission(s) terminées n’ont pas encore de commission traitée.`,
      });
    }

    if (operationalAlerts.length === 0) {
      operationalAlerts.push({
        level: 'success',
        title: 'Situation opérationnelle stable',
        message: 'Aucune alerte critique détectée pour le moment.',
      });
    }

    return {
      stats: {
        totalPartners,
        pendingPartners,
        validatedPartners,
        totalMissions,
        completedMissions,
        totalCommissionAmount: Number(totalCommissionRaw?.total ?? '0').toFixed(2),
        pendingRecharges,
        documentsToRedo,
        commissionsToProcess,
      },
      recentMissions,
      recentPartners,
      operationalAlerts,
    };
  }
}