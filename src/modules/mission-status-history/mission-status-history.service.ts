import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MissionStatus } from '../../common/enums/mission-status.enum';
import { MissionEntity } from '../missions/entities/mission.entity';
import { MissionStatusHistoryEntity } from './entities/mission-status-history.entity';

import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';

@Injectable()
export class MissionStatusHistoryService {
  constructor(
    @InjectRepository(MissionStatusHistoryEntity)
    private readonly missionStatusHistoryRepository: Repository<MissionStatusHistoryEntity>,
    @InjectRepository(MissionEntity)
    private readonly missionsRepository: Repository<MissionEntity>,
  ) {}

  async addHistoryEntry(
    missionId: string,
    payload: {
      previousStatus: MissionStatus | null;
      newStatus: MissionStatus;
      comment?: string | null;
    },
  ): Promise<MissionStatusHistoryEntity> {
    const mission = await this.missionsRepository.findOne({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    const history = this.missionStatusHistoryRepository.create({
      mission,
      oldStatus: payload.previousStatus,
      newStatus: payload.newStatus,
      comment: payload.comment ?? null,
    });

    return await this.missionStatusHistoryRepository.save(history);
  }

  async getMissionHistory(
    missionId: string,
  ): Promise<MissionStatusHistoryEntity[]> {
    return this.missionStatusHistoryRepository.find({
      where: {
        mission: { id: missionId },
      },
      relations: {
        mission: true,
      },
      order: {
        changedAt: 'ASC',
      },
    });
  }

  async getMissionHistoryForUser(
    currentUser: CurrentUserData,
    missionId: string,
  ): Promise<MissionStatusHistoryEntity[]> {
    const mission = await this.missionsRepository.findOne({
      where: { id: missionId },
      relations: {
        client: true,
        partnerProfile: {
          user: true,
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    const userRole = currentUser.role;
    const userId = currentUser.sub;

    const isAdmin = userRole === UserRole.ADMIN;
    const isMissionClient = mission.client?.id === userId;
    const isMissionPartner = mission.partnerProfile?.user?.id === userId;

    if (!isAdmin && !isMissionClient && !isMissionPartner) {
      throw new ForbiddenException(
        'Vous n’êtes pas autorisé à consulter l’historique de cette mission.',
      );
    }

    return this.getMissionHistory(missionId);
  }
}
