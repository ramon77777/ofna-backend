import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { CommissionOperationType } from '../../common/enums/commission-operation-type.enum';
import { MissionStatus } from '../../common/enums/mission-status.enum';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { WalletStatus } from '../../common/enums/wallet-status.enum';
import { WalletTransactionSource } from '../../common/enums/wallet-transaction-source.enum';
import { WalletTransactionType } from '../../common/enums/wallet-transaction-type.enum';
import { RealtimeGateway } from '../../gateways/realtime/realtime.gateway';
import { MissionStatusHistoryService } from '../mission-status-history/mission-status-history.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { UserEntity } from '../users/entities/user.entity';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import { AcceptMissionDto } from './dto/accept-mission.dto';
import { CancelMissionDto } from './dto/cancel-mission.dto';
import { CreateMissionDto } from './dto/create-mission.dto';
import { ProposeMissionPriceDto } from './dto/propose-mission-price.dto';
import { UpdateMissionStatusDto } from './dto/update-mission-status.dto';
import { ValidateMissionPriceDto } from './dto/validate-mission-price.dto';
import { MissionEntity } from './entities/mission.entity';
import { CommissionEntity } from '../commissions/entities/commission.entity';

import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';

@Injectable()
export class MissionsService {
  private readonly commissionRate = 10;

  constructor(
    @InjectRepository(MissionEntity)
    private readonly missionsRepository: Repository<MissionEntity>,

    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,

    @InjectRepository(PartnerProfileEntity)
    private readonly partnerProfilesRepository: Repository<PartnerProfileEntity>,

    private readonly missionStatusHistoryService: MissionStatusHistoryService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly dataSource: DataSource,
  ) {}

  private getWalletStatus(balance: number): WalletStatus {
    if (balance <= 0) {
      return WalletStatus.VIDE;
    }

    if (balance < 5000) {
      return WalletStatus.FAIBLE;
    }

    return WalletStatus.ACTIF;
  }

  private buildMissionCreatedPayload(
    mission: MissionEntity,
    message: string,
  ): Record<string, unknown> {
    return {
      missionId: mission.id,
      missionType: mission.missionType,
      missionStatus: mission.missionStatus,
      selectionMode: mission.selectionMode,
      partnerProfileId: mission.partnerProfile?.id ?? null,
      createdAt: mission.createdAt,
      message,
    };
  }

  private buildMissionAcceptedPayload(
    mission: MissionEntity,
    previousStatus: MissionStatus,
    message: string,
  ): Record<string, unknown> {
    return {
      missionId: mission.id,
      missionStatus: mission.missionStatus,
      acceptedAt: mission.acceptedAt ?? null,
      partnerProfileId: mission.partnerProfile?.id ?? null,
      previousStatus,
      newStatus: mission.missionStatus,
      message,
    };
  }

  private buildMissionPriceProposedPayload(
    mission: MissionEntity,
    previousStatus: MissionStatus,
    message: string,
  ): Record<string, unknown> {
    return {
      missionId: mission.id,
      missionStatus: mission.missionStatus,
      proposedAmount: mission.proposedAmount ?? null,
      previousStatus,
      newStatus: mission.missionStatus,
      message,
    };
  }

  private buildMissionPriceValidatedPayload(
    mission: MissionEntity,
    previousStatus: MissionStatus,
    message: string,
  ): Record<string, unknown> {
    return {
      missionId: mission.id,
      missionStatus: mission.missionStatus,
      validatedAmount: mission.validatedAmount ?? null,
      paymentMode: mission.paymentMode ?? null,
      previousStatus,
      newStatus: mission.missionStatus,
      message,
    };
  }

  private buildMissionStatusUpdatedPayload(
    mission: MissionEntity,
    previousStatus: MissionStatus,
    message: string,
  ): Record<string, unknown> {
    return {
      missionId: mission.id,
      missionStatus: mission.missionStatus,
      previousStatus,
      newStatus: mission.missionStatus,
      updatedAt: mission.updatedAt,
      acceptedAt: mission.acceptedAt ?? null,
      completedAt: mission.completedAt ?? null,
      cancelledAt: mission.cancelledAt ?? null,
      commissionProcessed: mission.commissionProcessed,
      message,
    };
  }

  private buildMissionCancelledPayload(
    mission: MissionEntity,
    previousStatus: MissionStatus,
    message: string,
  ): Record<string, unknown> {
    return {
      missionId: mission.id,
      missionStatus: mission.missionStatus,
      cancelledAt: mission.cancelledAt ?? null,
      previousStatus,
      newStatus: mission.missionStatus,
      message,
    };
  }

  async createMission(
    clientUserId: string,
    dto: CreateMissionDto,
  ): Promise<MissionEntity> {
    const client = await this.usersRepository.findOne({
      where: { id: clientUserId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    let partnerProfile: PartnerProfileEntity | null = null;

    if (dto.partnerProfileId) {
      partnerProfile = await this.partnerProfilesRepository.findOne({
        where: { id: dto.partnerProfileId },
        relations: {
          user: true,
          wallet: true,
        },
      });

      if (!partnerProfile) {
        throw new NotFoundException('Partner profile not found');
      }
    }

    const mission = this.missionsRepository.create({
      client,
      partnerProfile,
      missionType: dto.missionType,
      panneType: dto.panneType ?? null,
      vehicleType: dto.vehicleType ?? null,
      departureAddress: dto.departureAddress,
      departureLatitude: dto.departureLatitude,
      departureLongitude: dto.departureLongitude,
      destinationAddress: dto.destinationAddress ?? null,
      destinationLatitude: dto.destinationLatitude ?? null,
      destinationLongitude: dto.destinationLongitude ?? null,
      selectionMode: dto.selectionMode,
      proposedAmount: null,
      validatedAmount: null,
      paymentMode: null,
      missionStatus: MissionStatus.EN_ATTENTE,
      acceptedAt: null,
      completedAt: null,
      cancelledAt: null,
      commissionProcessed: false,
    });

    await this.missionsRepository.save(mission);

    await this.missionStatusHistoryService.addHistoryEntry(mission.id, {
      previousStatus: null,
      newStatus: MissionStatus.EN_ATTENTE,
      comment: 'Mission created',
    });

    await this.notificationsService.createNotification({
      userId: client.id,
      title: 'Mission créée',
      message: 'Votre mission a été créée avec succès.',
      notificationType: NotificationType.MISSION,
    });

    const freshMission = await this.getMissionById(mission.id);

    this.realtimeGateway.emitToUser(
      freshMission.client.id,
      'mission.created',
      this.buildMissionCreatedPayload(
        freshMission,
        'Votre mission a été créée.',
      ),
    );

    if (freshMission.partnerProfile?.user?.id) {
      await this.notificationsService.createNotification({
        userId: freshMission.partnerProfile.user.id,
        title: 'Nouvelle mission assignée',
        message: 'Une nouvelle mission vous a été assignée.',
        notificationType: NotificationType.MISSION,
      });

      this.realtimeGateway.emitToUser(
        freshMission.partnerProfile.user.id,
        'mission.created',
        this.buildMissionCreatedPayload(
          freshMission,
          'Une nouvelle mission vous a été assignée.',
        ),
      );
    }

    return freshMission;
  }

  async getMissionById(missionId: string): Promise<MissionEntity> {
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

  async getMissionByIdForUser(
    currentUser: CurrentUserData,
    missionId: string,
  ): Promise<MissionEntity> {
    const mission = await this.getMissionById(missionId);

    const userRole = currentUser.role;
    const userId = currentUser.sub;

    const isAdmin = userRole === UserRole.ADMIN;
    const isMissionClient = mission.client?.id === userId;
    const isMissionPartner = mission.partnerProfile?.user?.id === userId;

    if (!isAdmin && !isMissionClient && !isMissionPartner) {
      throw new ForbiddenException(
        'Vous n’êtes pas autorisé à consulter cette mission.',
      );
    }

    return mission;
  }

  async getClientMissions(clientUserId: string): Promise<MissionEntity[]> {
    return this.missionsRepository.find({
      where: {
        client: { id: clientUserId },
      },
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

  async getPartnerMissions(partnerUserId: string): Promise<MissionEntity[]> {
    return this.missionsRepository.find({
      where: {
        partnerProfile: {
          user: { id: partnerUserId },
        },
      },
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

  async getPartnerMissionById(
    partnerUserId: string,
    missionId: string,
  ): Promise<MissionEntity> {
    const mission = await this.missionsRepository.findOne({
      where: {
        id: missionId,
        partnerProfile: {
          user: { id: partnerUserId },
        },
      },
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
      throw new NotFoundException('Mission not found for this partner');
    }

    return mission;
  }

  async acceptMission(
    partnerUserId: string,
    missionId: string,
    dto: AcceptMissionDto,
  ): Promise<MissionEntity> {
    const mission = await this.missionsRepository.findOne({
      where: { id: missionId },
      relations: {
        client: true,
        partnerProfile: {
          user: true,
          wallet: true,
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (!mission.partnerProfile) {
      const partnerProfile = await this.partnerProfilesRepository.findOne({
        where: {
          user: { id: partnerUserId },
        },
        relations: {
          user: true,
          wallet: true,
        },
      });

      if (!partnerProfile) {
        throw new NotFoundException('Partner profile not found');
      }

      mission.partnerProfile = partnerProfile;
    }

    if (mission.partnerProfile.user.id !== partnerUserId) {
      throw new BadRequestException('This mission is not assigned to you');
    }

    if (mission.missionStatus !== MissionStatus.EN_ATTENTE) {
      throw new BadRequestException(
        'Mission cannot be accepted in its current state',
      );
    }

    const previousStatus = mission.missionStatus;

    mission.missionStatus = MissionStatus.ACCEPTEE;
    mission.acceptedAt = new Date();

    await this.missionsRepository.save(mission);

    await this.missionStatusHistoryService.addHistoryEntry(mission.id, {
      previousStatus,
      newStatus: MissionStatus.ACCEPTEE,
      comment: dto.comment ?? 'Mission accepted',
    });

    await this.notificationsService.createNotification({
      userId: mission.client.id,
      title: 'Mission acceptée',
      message: 'Votre mission a été acceptée par un partenaire.',
      notificationType: NotificationType.MISSION,
    });

    const freshMission = await this.getMissionById(mission.id);

    this.realtimeGateway.emitToUser(
      freshMission.client.id,
      'mission.accepted',
      this.buildMissionAcceptedPayload(
        freshMission,
        previousStatus,
        'Votre mission a été acceptée.',
      ),
    );

    if (freshMission.partnerProfile?.user?.id) {
      await this.notificationsService.createNotification({
        userId: freshMission.partnerProfile.user.id,
        title: 'Mission acceptée',
        message: 'Vous avez accepté cette mission.',
        notificationType: NotificationType.MISSION,
      });

      this.realtimeGateway.emitToUser(
        freshMission.partnerProfile.user.id,
        'mission.accepted',
        this.buildMissionAcceptedPayload(
          freshMission,
          previousStatus,
          'Vous avez accepté cette mission.',
        ),
      );
    }

    return freshMission;
  }

  async proposePrice(
    partnerUserId: string,
    missionId: string,
    dto: ProposeMissionPriceDto,
  ): Promise<MissionEntity> {
    const mission = await this.missionsRepository.findOne({
      where: { id: missionId },
      relations: {
        client: true,
        partnerProfile: {
          user: true,
          wallet: true,
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (
      !mission.partnerProfile ||
      mission.partnerProfile.user.id !== partnerUserId
    ) {
      throw new BadRequestException('This mission is not assigned to you');
    }

    const previousStatus = mission.missionStatus;
    mission.proposedAmount = dto.proposedAmount;

    await this.missionsRepository.save(mission);

    await this.missionStatusHistoryService.addHistoryEntry(mission.id, {
      previousStatus,
      newStatus: mission.missionStatus,
      comment: dto.comment ?? `Price proposed: ${dto.proposedAmount}`,
    });

    await this.notificationsService.createNotification({
      userId: mission.client.id,
      title: 'Prix proposé',
      message: `Un prix de ${dto.proposedAmount} a été proposé pour votre mission.`,
      notificationType: NotificationType.MISSION,
    });

    const freshMission = await this.getMissionById(mission.id);

    this.realtimeGateway.emitToUser(
      freshMission.client.id,
      'mission.price.proposed',
      this.buildMissionPriceProposedPayload(
        freshMission,
        previousStatus,
        'Un prix a été proposé pour votre mission.',
      ),
    );

    if (freshMission.partnerProfile?.user?.id) {
      await this.notificationsService.createNotification({
        userId: freshMission.partnerProfile.user.id,
        title: 'Prix proposé',
        message: 'Votre proposition de prix a été enregistrée.',
        notificationType: NotificationType.MISSION,
      });

      this.realtimeGateway.emitToUser(
        freshMission.partnerProfile.user.id,
        'mission.price.proposed',
        this.buildMissionPriceProposedPayload(
          freshMission,
          previousStatus,
          'Votre proposition de prix a été enregistrée.',
        ),
      );
    }

    return freshMission;
  }

  async validatePrice(
    clientUserId: string,
    missionId: string,
    dto: ValidateMissionPriceDto,
  ): Promise<MissionEntity> {
    const mission = await this.missionsRepository.findOne({
      where: {
        id: missionId,
        client: { id: clientUserId },
      },
      relations: {
        client: true,
        partnerProfile: {
          user: true,
          wallet: true,
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    const previousStatus = mission.missionStatus;

    mission.validatedAmount = dto.validatedAmount;
    mission.paymentMode = dto.paymentMode;

    await this.missionsRepository.save(mission);

    await this.missionStatusHistoryService.addHistoryEntry(mission.id, {
      previousStatus,
      newStatus: mission.missionStatus,
      comment: dto.comment ?? `Price validated: ${dto.validatedAmount}`,
    });

    if (mission.partnerProfile?.user?.id) {
      await this.notificationsService.createNotification({
        userId: mission.partnerProfile.user.id,
        title: 'Prix validé',
        message: `Le client a validé le prix de ${dto.validatedAmount}.`,
        notificationType: NotificationType.MISSION,
      });
    }

    await this.notificationsService.createNotification({
      userId: mission.client.id,
      title: 'Prix validé',
      message: 'Vous avez validé le prix de la mission.',
      notificationType: NotificationType.MISSION,
    });

    const freshMission = await this.getMissionById(mission.id);

    this.realtimeGateway.emitToUser(
      freshMission.client.id,
      'mission.price.validated',
      this.buildMissionPriceValidatedPayload(
        freshMission,
        previousStatus,
        'Vous avez validé le prix de la mission.',
      ),
    );

    if (freshMission.partnerProfile?.user?.id) {
      this.realtimeGateway.emitToUser(
        freshMission.partnerProfile.user.id,
        'mission.price.validated',
        this.buildMissionPriceValidatedPayload(
          freshMission,
          previousStatus,
          'Le client a validé votre prix.',
        ),
      );
    }

    return freshMission;
  }

  private async processAutomaticMissionCommission(
    missionId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const mission = await manager.findOne(MissionEntity, {
        where: { id: missionId },
        relations: {
          partnerProfile: {
            wallet: true,
          },
          commissions: true,
        },
      });

      if (!mission) {
        throw new NotFoundException('Mission not found');
      }

      if (mission.commissionProcessed) {
        return;
      }

      if (mission.commissions && mission.commissions.length > 0) {
        await manager.update(
          MissionEntity,
          { id: mission.id },
          { commissionProcessed: true },
        );
        return;
      }

      if (mission.missionStatus !== MissionStatus.TERMINEE) {
        return;
      }

      if (!mission.partnerProfile) {
        throw new BadRequestException(
          'Cette mission n’a pas de partenaire assigné.',
        );
      }

      if (!mission.partnerProfile.wallet) {
        throw new BadRequestException('Le partenaire n’a pas de portefeuille.');
      }

      if (!mission.validatedAmount) {
        throw new BadRequestException(
          'Cette mission n’a pas de montant validé.',
        );
      }

      const wallet = mission.partnerProfile.wallet;
      const operationAmount = Number(mission.validatedAmount);
      const commissionRate = 10;

      if (Number.isNaN(operationAmount) || operationAmount <= 0) {
        throw new BadRequestException('Montant validé invalide.');
      }

      const commissionAmount = Number(
        ((operationAmount * commissionRate) / 100).toFixed(2),
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

      const balanceAfter = Number(
        (balanceBefore - commissionAmount).toFixed(2),
      );

      const commission = manager.create(CommissionEntity, {
        partnerProfile: mission.partnerProfile,
        mission,
        order: null,
        operationType: CommissionOperationType.MISSION,
        operationAmount: operationAmount.toFixed(2),
        commissionRate: commissionRate.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        note: 'Commission automatique après mission terminée',
        debitedAt: new Date(),
      });

      const savedCommission = await manager.save(CommissionEntity, commission);

      wallet.balance = balanceAfter.toFixed(2);
      wallet.walletStatus =
        balanceAfter <= 0
          ? WalletStatus.VIDE
          : balanceAfter < 5000
            ? WalletStatus.FAIBLE
            : WalletStatus.ACTIF;

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
          savedCommission.id,
          'Commission prélevée automatiquement après mission terminée',
        ],
      );

      await manager.update(
        MissionEntity,
        { id: mission.id },
        { commissionProcessed: true },
      );
    });
  }

  private assertValidPartnerStatusTransition(
    currentStatus: MissionStatus,
    nextStatus: MissionStatus,
  ): void {
    const allowedTransitions: Record<MissionStatus, MissionStatus[]> = {
      [MissionStatus.EN_ATTENTE]: [MissionStatus.ACCEPTEE],
      [MissionStatus.ACCEPTEE]: [MissionStatus.EN_ROUTE],
      [MissionStatus.EN_ROUTE]: [MissionStatus.ARRIVE_SUR_PLACE],
      [MissionStatus.ARRIVE_SUR_PLACE]: [MissionStatus.EN_COURS],
      [MissionStatus.EN_COURS]: [MissionStatus.TERMINEE],
      [MissionStatus.TERMINEE]: [],
      [MissionStatus.ANNULEE]: [],
    };

    const allowedNextStatuses = allowedTransitions[currentStatus] ?? [];

    if (!allowedNextStatuses.includes(nextStatus)) {
      throw new BadRequestException(
        `Transition de statut invalide : ${currentStatus} vers ${nextStatus}.`,
      );
    }
  }

  async updateMissionStatus(
    partnerUserId: string,
    missionId: string,
    dto: UpdateMissionStatusDto,
  ): Promise<MissionEntity> {
    const mission = await this.missionsRepository.findOne({
      where: { id: missionId },
      relations: {
        client: true,
        partnerProfile: {
          user: true,
          wallet: true,
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (
      !mission.partnerProfile ||
      mission.partnerProfile.user.id !== partnerUserId
    ) {
      throw new BadRequestException('This mission is not assigned to you');
    }

    const previousStatus = mission.missionStatus;

    this.assertValidPartnerStatusTransition(previousStatus, dto.missionStatus);

    mission.missionStatus = dto.missionStatus;

    if (dto.missionStatus === MissionStatus.TERMINEE) {
      if (!mission.validatedAmount) {
        throw new BadRequestException(
          'Impossible de terminer la mission sans montant validé.',
        );
      }

      mission.completedAt = new Date();
    }

    await this.missionsRepository.save(mission);

    await this.missionStatusHistoryService.addHistoryEntry(mission.id, {
      previousStatus,
      newStatus: dto.missionStatus,
      comment: dto.comment ?? `Mission status updated to ${dto.missionStatus}`,
    });

    if (dto.missionStatus === MissionStatus.TERMINEE) {
      await this.processAutomaticMissionCommission(mission.id);
    }

    const freshMission = await this.getMissionById(mission.id);

    const statusUpdatedMessage =
      freshMission.missionStatus === MissionStatus.ANNULEE
        ? 'La mission a été annulée.'
        : `Le statut de la mission est maintenant : ${freshMission.missionStatus}.`;

    await this.notificationsService.createNotification({
      userId: freshMission.client.id,
      title: 'Statut mission mis à jour',
      message: statusUpdatedMessage,
      notificationType: NotificationType.MISSION,
    });

    if (freshMission.partnerProfile?.user?.id) {
      await this.notificationsService.createNotification({
        userId: freshMission.partnerProfile.user.id,
        title: 'Statut mission mis à jour',
        message: statusUpdatedMessage,
        notificationType: NotificationType.MISSION,
      });
    }

    const statusUpdatedPayload = this.buildMissionStatusUpdatedPayload(
      freshMission,
      previousStatus,
      statusUpdatedMessage,
    );

    this.realtimeGateway.emitToUser(
      freshMission.client.id,
      'mission.status.updated',
      statusUpdatedPayload,
    );

    if (freshMission.partnerProfile?.user?.id) {
      this.realtimeGateway.emitToUser(
        freshMission.partnerProfile.user.id,
        'mission.status.updated',
        statusUpdatedPayload,
      );
    }

    if (freshMission.missionStatus === MissionStatus.ANNULEE) {
      const cancelledPayload = this.buildMissionCancelledPayload(
        freshMission,
        previousStatus,
        'La mission a été annulée.',
      );

      this.realtimeGateway.emitToUser(
        freshMission.client.id,
        'mission.cancelled',
        cancelledPayload,
      );

      if (freshMission.partnerProfile?.user?.id) {
        this.realtimeGateway.emitToUser(
          freshMission.partnerProfile.user.id,
          'mission.cancelled',
          cancelledPayload,
        );
      }
    }

    return freshMission;
  }

  async cancelMission(
    clientUserId: string,
    missionId: string,
    dto: CancelMissionDto,
  ): Promise<MissionEntity> {
    const mission = await this.missionsRepository.findOne({
      where: {
        id: missionId,
        client: { id: clientUserId },
      },
      relations: {
        client: true,
        partnerProfile: {
          user: true,
          wallet: true,
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    const previousStatus = mission.missionStatus;

    mission.missionStatus = MissionStatus.ANNULEE;
    mission.cancelledAt = new Date();

    await this.missionsRepository.save(mission);

    await this.missionStatusHistoryService.addHistoryEntry(mission.id, {
      previousStatus,
      newStatus: MissionStatus.ANNULEE,
      comment: dto.comment ?? 'Mission cancelled by client',
    });

    await this.notificationsService.createNotification({
      userId: mission.client.id,
      title: 'Mission annulée',
      message: 'Votre mission a été annulée.',
      notificationType: NotificationType.MISSION,
    });

    if (mission.partnerProfile?.user?.id) {
      await this.notificationsService.createNotification({
        userId: mission.partnerProfile.user.id,
        title: 'Mission annulée',
        message: 'La mission a été annulée par le client.',
        notificationType: NotificationType.MISSION,
      });
    }

    const freshMission = await this.getMissionById(mission.id);

    const clientStatusUpdatedPayload = this.buildMissionStatusUpdatedPayload(
      freshMission,
      previousStatus,
      'Votre mission a été annulée.',
    );

    const partnerStatusUpdatedPayload = this.buildMissionStatusUpdatedPayload(
      freshMission,
      previousStatus,
      'La mission a été annulée par le client.',
    );

    const clientCancelledPayload = this.buildMissionCancelledPayload(
      freshMission,
      previousStatus,
      'Votre mission a été annulée.',
    );

    const partnerCancelledPayload = this.buildMissionCancelledPayload(
      freshMission,
      previousStatus,
      'La mission a été annulée par le client.',
    );

    this.realtimeGateway.emitToUser(
      freshMission.client.id,
      'mission.status.updated',
      clientStatusUpdatedPayload,
    );

    this.realtimeGateway.emitToUser(
      freshMission.client.id,
      'mission.cancelled',
      clientCancelledPayload,
    );

    if (freshMission.partnerProfile?.user?.id) {
      this.realtimeGateway.emitToUser(
        freshMission.partnerProfile.user.id,
        'mission.status.updated',
        partnerStatusUpdatedPayload,
      );

      this.realtimeGateway.emitToUser(
        freshMission.partnerProfile.user.id,
        'mission.cancelled',
        partnerCancelledPayload,
      );
    }

    return freshMission;
  }
}
