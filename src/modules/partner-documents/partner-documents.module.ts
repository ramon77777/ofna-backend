import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { UserEntity } from '../users/entities/user.entity';
import { PartnerDocumentsController } from './partner-documents.controller';
import { PartnerDocumentsService } from './partner-documents.service';
import { PartnerDocumentEntity } from './entities/partner-document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartnerDocumentEntity,
      PartnerProfileEntity,
      UserEntity,
    ]),
  ],
  controllers: [PartnerDocumentsController],
  providers: [PartnerDocumentsService],
  exports: [PartnerDocumentsService, TypeOrmModule],
})
export class PartnerDocumentsModule {}
