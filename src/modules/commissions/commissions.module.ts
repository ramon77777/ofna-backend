import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { CommissionEntity } from './entities/commission.entity';
import { CommissionsController } from './commissions.controller';
import { CommissionsService } from './commissions.service';

@Module({
  imports: [TypeOrmModule.forFeature([CommissionEntity, PartnerProfileEntity])],
  controllers: [CommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
