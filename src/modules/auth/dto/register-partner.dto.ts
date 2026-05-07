import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

import { PartnerActivityType } from '../../../common/enums/partner-activity-type.enum';

export class RegisterPartnerDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @IsString()
  @Length(8, 30)
  @Matches(/^[0-9+\s()-]+$/, {
    message: 'phone format is invalid',
  })
  phone!: string;

  @IsOptional()
  @IsEmail()
  @Length(3, 150)
  email?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(PartnerActivityType)
  activityType!: PartnerActivityType;

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
  address?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(\.\d+)?$/, {
    message: 'latitude must be a valid decimal number',
  })
  latitude?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(\.\d+)?$/, {
    message: 'longitude must be a valid decimal number',
  })
  longitude?: string;
}
