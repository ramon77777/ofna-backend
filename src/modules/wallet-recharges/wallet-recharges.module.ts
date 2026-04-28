import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { WalletTransactionEntity } from '../wallet-transactions/entities/wallet-transaction.entity';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import { WalletRechargeEntity } from './entities/wallet-recharge.entity';
import { WalletRechargesController } from './wallet-recharges.controller';
import { WalletRechargesService } from './wallet-recharges.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletRechargeEntity,
      WalletEntity,
      PartnerProfileEntity,
      WalletTransactionEntity,
    ]),
  ],
  controllers: [WalletRechargesController],
  providers: [WalletRechargesService],
  exports: [WalletRechargesService],
})
export class WalletRechargesModule {}