import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

import { PartnerDocumentStatus } from '../../../common/enums/partner-document-status.enum';
import { PartnerDocumentType } from '../../../common/enums/partner-document-type.enum';

export class UpdatePartnerDocumentDto {
  @IsOptional()
  @IsEnum(PartnerDocumentType)
  documentType?: PartnerDocumentType;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  fileUrl?: string;

  @IsOptional()
  @IsEnum(PartnerDocumentStatus)
  documentStatus?: PartnerDocumentStatus;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  adminComment?: string;
}