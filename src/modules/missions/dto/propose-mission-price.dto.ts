import { IsNumberString, IsOptional, IsString, Length } from 'class-validator';

export class ProposeMissionPriceDto {
  @IsNumberString()
  proposedAmount!: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  comment?: string;
}
