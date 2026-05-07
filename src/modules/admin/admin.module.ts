// src/modules/admin/admin.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommissionEntity } from '../commissions/entities/commission.entity';
import { MissionEntity } from '../missions/entities/mission.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PartnerDocumentEntity } from '../partner-documents/entities/partner-document.entity';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { UserEntity } from '../users/entities/user.entity';
import { WalletRechargeEntity } from '../wallet-recharges/entities/wallet-recharge.entity';
import { WalletTransactionEntity } from '../wallet-transactions/entities/wallet-transaction.entity';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartnerProfileEntity,
      PartnerDocumentEntity,
      UserEntity,
      MissionEntity,
      CommissionEntity,
      WalletRechargeEntity,
      WalletEntity,
      WalletTransactionEntity,
    ]),
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
