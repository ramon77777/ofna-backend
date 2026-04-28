import { IsEnum, IsString, Length, IsOptional } from 'class-validator';

import { PartnerDocumentType } from '../../../common/enums/partner-document-type.enum';

export class CreatePartnerDocumentDto {
  @IsEnum(PartnerDocumentType)
  documentType!: PartnerDocumentType;

  @IsString()
  @Length(1, 5000)
  fileUrl!: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  adminComment?: string;
}