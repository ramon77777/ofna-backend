import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MissionEntity } from '../missions/entities/mission.entity';
import { MissionStatusHistoryEntity } from './entities/mission-status-history.entity';
import { MissionStatusHistoryService } from './mission-status-history.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MissionStatusHistoryEntity, MissionEntity]),
  ],
  providers: [MissionStatusHistoryService],
  exports: [MissionStatusHistoryService],
})
export class MissionStatusHistoryModule {}
