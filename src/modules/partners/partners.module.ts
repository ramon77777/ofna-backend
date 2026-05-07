import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommissionEntity } from '../commissions/entities/commission.entity';
import { UserEntity } from '../users/entities/user.entity';
import { WalletTransactionEntity } from '../wallet-transactions/entities/wallet-transaction.entity';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import { PartnerProfileEntity } from './entities/partner-profile.entity';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartnerProfileEntity,
      UserEntity,
      WalletEntity,
      WalletTransactionEntity,
      CommissionEntity,
    ]),
  ],
  controllers: [PartnersController],
  providers: [PartnersService],
  exports: [PartnersService, TypeOrmModule],
})
export class PartnersModule {}
