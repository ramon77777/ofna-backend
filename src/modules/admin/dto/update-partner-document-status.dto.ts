// src/modules/admin/dto/update-partner-document-status.dto.ts

import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

import { PartnerDocumentStatus } from '../../../common/enums/partner-document-status.enum';

export class UpdatePartnerDocumentStatusDto {
  @IsEnum(PartnerDocumentStatus)
  documentStatus!: PartnerDocumentStatus;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  adminComment?: string;
}
