import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdatePartnerLocationDto {
  @IsLatitude()
  partnerLatitude!: string;

  @IsLongitude()
  partnerLongitude!: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  comment?: string;
}
