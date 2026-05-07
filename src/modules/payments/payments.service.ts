import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { CommissionOperationType } from '../../common/enums/commission-operation-type.enum';
import { MissionStatus } from '../../common/enums/mission-status.enum';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { WalletStatus } from '../../common/enums/wallet-status.enum';
import { WalletTransactionSource } from '../../common/enums/wallet-transaction-source.enum';
import { WalletTransactionType } from '../../common/enums/wallet-transaction-type.enum';
import { RealtimeGateway } from '../../gateways/realtime/realtime.gateway';
import { CommissionEntity } from '../commissions/entities/commission.entity';
import { MissionEntity } from '../missions/entities/mission.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { UserEntity } from '../users/entities/user.entity';
import { WalletTransactionsService } from '../wallet-transactions/wallet-transactions.service';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import { ProcessMissionCommissionDto } from './dto/process-mission-commission.dto';

type ProcessMissionCommissionResult = {
  mission: MissionEntity;
  commission: CommissionEntity;
  wallet: WalletEntity;
  previousBalance: string | null;
  newBalance: string;
  commissionAmount: string;
  wasAlreadyProcessed: boolean;
  message: string;
};

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(MissionEntity)
    private readonly missionsRepository: Repository<MissionEntity>,

    @InjectRepository(CommissionEntity)
    private readonly commissionsRepository: Repository<CommissionEntity>,

    @InjectRepository(WalletEntity)
    private readonly walletsRepository: Repository<WalletEntity>,

    @InjectRepository(PartnerProfileEntity)
    private readonly partnerProfilesRepository: Repository<PartnerProfileEntity>,

    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,

    private readonly walletTransactionsService: WalletTransactionsService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeGateway: RealtimeGateway,
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

  async processMissionCommission(
    missionId: string,
    dto: ProcessMissionCommissionDto,
  ): Promise<{
    mission: MissionEntity;
    commission: CommissionEntity;
    wallet: WalletEntity;
    message: string;
  }> {
    const result = await this.missionsRepository.manager.transaction(
      async (
        manager: EntityManager,
      ): Promise<ProcessMissionCommissionResult> => {
        const missionRepository = manager.getRepository(MissionEntity);
        const commissionRepository = manager.getRepository(CommissionEntity);
        const walletRepository = manager.getRepository(WalletEntity);

        const lockedMission = await missionRepository
          .createQueryBuilder('mission')
          .where('mission.id = :missionId', { missionId })
          .setLock('pessimistic_write')
          .getOne();

        if (!lockedMission) {
          throw new NotFoundException('Mission not found');
        }

        const mission = await missionRepository.findOne({
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
          throw new BadRequestException('Mission has no assigned partner');
        }

        if (!mission.validatedAmount) {
          throw new BadRequestException('Mission has no validated amount');
        }

        if (mission.missionStatus !== MissionStatus.TERMINEE) {
          throw new BadRequestException(
            'Commission can only be processed for a completed mission',
          );
        }

        const partnerProfile = mission.partnerProfile;
        const wallet = partnerProfile.wallet;

        if (!wallet) {
          throw new BadRequestException('Partner wallet not found');
        }

        const operationAmount = Number(mission.validatedAmount);
        const commissionRate = Number(dto.commissionRate ?? '10');
        const commissionAmount = (operationAmount * commissionRate) / 100;

        if (Number.isNaN(operationAmount) || operationAmount <= 0) {
          throw new BadRequestException('Invalid validated amount');
        }

        if (Number.isNaN(commissionRate) || commissionRate < 0) {
          throw new BadRequestException('Invalid commission rate');
        }

        const existingCommission = await commissionRepository.findOne({
          where: {
            mission: { id: mission.id },
            operationType: CommissionOperationType.MISSION,
          },
          relations: {
            mission: true,
            partnerProfile: {
              user: true,
              wallet: true,
            },
          },
        });

        if (existingCommission) {
          if (!mission.commissionProcessed) {
            await missionRepository.update(
              { id: mission.id },
              { commissionProcessed: true },
            );
          }

          const syncedMission = await missionRepository.findOneOrFail({
            where: { id: mission.id },
            relations: {
              client: true,
              partnerProfile: {
                user: true,
                wallet: true,
              },
              commissions: true,
            },
          });

          return {
            mission: syncedMission,
            commission: existingCommission,
            wallet: syncedMission.partnerProfile?.wallet ?? wallet,
            previousBalance: null,
            newBalance:
              syncedMission.partnerProfile?.wallet?.balance ?? wallet.balance,
            commissionAmount: Number(
              existingCommission.commissionAmount,
            ).toFixed(2),
            wasAlreadyProcessed: true,
            message: 'Commission already existed and mission was synced',
          };
        }

        if (mission.commissionProcessed) {
          const syncedMission = await missionRepository.findOneOrFail({
            where: { id: mission.id },
            relations: {
              client: true,
              partnerProfile: {
                user: true,
                wallet: true,
              },
              commissions: true,
            },
          });

          const syncedCommission = await commissionRepository.findOne({
            where: {
              mission: { id: mission.id },
              operationType: CommissionOperationType.MISSION,
            },
            relations: {
              mission: true,
              partnerProfile: {
                user: true,
                wallet: true,
              },
            },
          });

          if (!syncedCommission) {
            throw new BadRequestException(
              'Mission is marked as commission processed but no commission exists',
            );
          }

          return {
            mission: syncedMission,
            commission: syncedCommission,
            wallet: syncedMission.partnerProfile?.wallet ?? wallet,
            previousBalance: null,
            newBalance:
              syncedMission.partnerProfile?.wallet?.balance ?? wallet.balance,
            commissionAmount: Number(syncedCommission.commissionAmount).toFixed(
              2,
            ),
            wasAlreadyProcessed: true,
            message: 'Commission already processed',
          };
        }

        const currentBalance = Number(wallet.balance);

        if (currentBalance < commissionAmount) {
          throw new BadRequestException(
            `Insufficient wallet balance. Required: ${commissionAmount.toFixed(2)}, available: ${currentBalance.toFixed(2)}`,
          );
        }

        const newBalance = currentBalance - commissionAmount;

        await walletRepository.update(
          { id: wallet.id },
          {
            balance: newBalance.toFixed(2),
            walletStatus: this.computeWalletStatus(newBalance),
          },
        );

        const commission = commissionRepository.create({
          partnerProfile: { id: partnerProfile.id } as PartnerProfileEntity,
          mission: { id: mission.id } as MissionEntity,
          order: null,
          operationType: CommissionOperationType.MISSION,
          operationAmount: operationAmount.toFixed(2),
          commissionRate: commissionRate.toFixed(2),
          commissionAmount: commissionAmount.toFixed(2),
          debitedAt: new Date(),
          note: dto.note ?? 'Automatic commission after completed mission',
        });

        const savedCommission = await commissionRepository.save(commission);

        await missionRepository.update(
          { id: mission.id },
          { commissionProcessed: true },
        );

        const freshMission = await missionRepository.findOneOrFail({
          where: { id: mission.id },
          relations: {
            client: true,
            partnerProfile: {
              user: true,
              wallet: true,
            },
            commissions: true,
          },
        });

        return {
          mission: freshMission,
          commission: savedCommission,
          wallet: freshMission.partnerProfile?.wallet ?? wallet,
          previousBalance: currentBalance.toFixed(2),
          newBalance: newBalance.toFixed(2),
          commissionAmount: commissionAmount.toFixed(2),
          wasAlreadyProcessed: false,
          message: 'Mission commission processed successfully',
        };
      },
    );

    if (!result.wasAlreadyProcessed) {
      try {
        await this.walletTransactionsService.createTransaction({
          walletId: result.wallet.id,
          transactionType: WalletTransactionType.DEBIT,
          sourceType: WalletTransactionSource.COMMISSION,
          amount: result.commissionAmount,
          balanceBefore: result.previousBalance ?? result.wallet.balance,
          balanceAfter: result.newBalance,
          missionId: result.mission.id,
          label: 'Débit commission mission',
        });
      } catch (error) {
        console.error(
          'Wallet transaction creation failed after mission commission processing:',
          error,
        );
      }

      try {
        const partnerUserId = result.mission.partnerProfile?.user?.id;

        if (partnerUserId) {
          await this.notificationsService.createNotification({
            userId: partnerUserId,
            title: 'Commission prélevée',
            message: `Une commission de ${result.commissionAmount} a été prélevée.`,
            notificationType: NotificationType.WALLET,
          });

          this.realtimeGateway.emitToUser(partnerUserId, 'wallet.updated', {
            walletId: result.wallet.id,
            previousBalance: result.previousBalance,
            newBalance: result.newBalance,
            amount: result.commissionAmount,
            type: 'debit',
            source: 'commission',
            missionId: result.mission.id,
          });

          this.realtimeGateway.emitToUser(
            partnerUserId,
            'commission.processed',
            {
              missionId: result.mission.id,
              commissionAmount: result.commissionAmount,
              newBalance: result.newBalance,
            },
          );
        }
      } catch (error) {
        console.error(
          'Notification or realtime emission failed after mission commission processing:',
          error,
        );
      }
    }

    return {
      mission: result.mission,
      commission: result.commission,
      wallet: result.wallet,
      message: result.message,
    };
  }

  async getMissionCommissions(missionId: string): Promise<CommissionEntity[]> {
    return this.commissionsRepository.find({
      where: {
        mission: { id: missionId },
      },
      relations: {
        mission: true,
        partnerProfile: {
          user: true,
          wallet: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getPartnerCommissions(
    partnerProfileId: string,
  ): Promise<CommissionEntity[]> {
    return this.commissionsRepository.find({
      where: {
        partnerProfile: { id: partnerProfileId },
      },
      relations: {
        mission: true,
        partnerProfile: {
          user: true,
          wallet: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getPartnerCommissionsByUserId(
    userId: string,
  ): Promise<CommissionEntity[]> {
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

    return this.commissionsRepository.find({
      where: {
        partnerProfile: { id: partnerProfile.id },
      },
      relations: {
        mission: true,
        partnerProfile: {
          user: true,
          wallet: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
