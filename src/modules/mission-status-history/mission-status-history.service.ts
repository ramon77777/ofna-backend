import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MissionStatus } from '../../common/enums/mission-status.enum';
import { MissionEntity } from '../missions/entities/mission.entity';
import { MissionStatusHistoryEntity } from './entities/mission-status-history.entity';

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
}