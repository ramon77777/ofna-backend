import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

import { PartnerDocumentType } from '../../../common/enums/partner-document-type.enum';

export class UpdatePartnerDocumentDto {
  @IsOptional()
  @IsEnum(PartnerDocumentType)
  documentType?: PartnerDocumentType;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  fileUrl?: string;
}
