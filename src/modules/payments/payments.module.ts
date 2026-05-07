import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommissionEntity } from '../commissions/entities/commission.entity';
import { MissionEntity } from '../missions/entities/mission.entity';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { UserEntity } from '../users/entities/user.entity';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

// ✅ AJOUTS
import { WalletTransactionsModule } from '../wallet-transactions/wallet-transactions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../../gateways/realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MissionEntity,
      CommissionEntity,
      WalletEntity,
      PartnerProfileEntity,
      UserEntity,
    ]),
    WalletTransactionsModule,
    NotificationsModule,
    RealtimeModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
