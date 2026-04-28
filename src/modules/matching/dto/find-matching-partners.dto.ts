import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class FindMatchingPartnersDto {
  @IsOptional()
  @IsNumberString()
  maxDistanceKm?: string;

  @IsOptional()
  @IsString()
  missionId?: string;
}