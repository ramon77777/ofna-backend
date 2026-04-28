import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';

import { PartnerActivityType } from '../../../common/enums/partner-activity-type.enum';

export class UpdatePartnerProfileDto {
  @IsOptional()
  @IsEnum(PartnerActivityType)
  activityType?: PartnerActivityType;

  @IsOptional()
  @IsString()
  @Length(1, 150)
  businessName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  interventionZone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  address?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(\.\d+)?$/, {
    message: 'latitude must be a valid decimal string',
  })
  latitude?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(\.\d+)?$/, {
    message: 'longitude must be a valid decimal string',
  })
  longitude?: string;
}