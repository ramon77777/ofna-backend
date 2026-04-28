import { IsOptional, IsString, Length } from 'class-validator';

export class AcceptMissionDto {
  @IsOptional()
  @IsString()
  @Length(1, 5000)
  comment?: string;
}