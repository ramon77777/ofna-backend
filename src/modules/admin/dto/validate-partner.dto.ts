import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

import { PartnerValidationStatus } from '../../../common/enums/partner-validation-status.enum';

export class ValidatePartnerDto {
  @IsEnum(PartnerValidationStatus)
  validationStatus!: PartnerValidationStatus;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  comment?: string;
}