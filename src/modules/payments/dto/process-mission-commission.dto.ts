import { IsNumberString, IsOptional, IsString, Length } from 'class-validator';

export class ProcessMissionCommissionDto {
  @IsOptional()
  @IsNumberString()
  commissionRate?: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  note?: string;
}