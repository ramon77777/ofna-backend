import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RealtimeModule } from '../../gateways/realtime/realtime.module';
import { CommissionEntity } from '../commissions/entities/commission.entity';
import { MissionStatusHistoryEntity } from '../mission-status-history/entities/mission-status-history.entity';
import { MissionStatusHistoryModule } from '../mission-status-history/mission-status-history.module';
import { MissionEntity } from './entities/mission.entity';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { NotificationEntity } from '../notifications/entities/notification.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { UserEntity } from '../users/entities/user.entity';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import { WalletTransactionEntity } from '../wallet-transactions/entities/wallet-transaction.entity';

import { ReviewEntity } from '../reviews/entities/review.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MissionEntity,
      MissionStatusHistoryEntity,
      PartnerProfileEntity,
      UserEntity,
      WalletEntity,
      WalletTransactionEntity,
      NotificationEntity,
      CommissionEntity,
      ReviewEntity,
    ]),
    MissionStatusHistoryModule,
    NotificationsModule,
    RealtimeModule,
  ],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
