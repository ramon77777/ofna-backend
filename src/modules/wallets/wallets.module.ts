import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { WalletRechargeEntity } from '../wallet-recharges/entities/wallet-recharge.entity';
import { WalletEntity } from './entities/wallet.entity';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletEntity,
      PartnerProfileEntity,
      WalletRechargeEntity,
    ]),
  ],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService, TypeOrmModule],
})
export class WalletsModule {}