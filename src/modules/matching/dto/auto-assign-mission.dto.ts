import { IsNumberString, IsOptional } from 'class-validator';

export class AutoAssignMissionDto {
  @IsOptional()
  @IsNumberString()
  maxDistanceKm?: string;
}
