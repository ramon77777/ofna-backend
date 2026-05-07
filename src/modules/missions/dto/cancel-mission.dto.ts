import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelMissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
