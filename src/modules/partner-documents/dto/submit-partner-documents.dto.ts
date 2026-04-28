import { IsOptional, IsString, Length } from 'class-validator';

export class SubmitPartnerDocumentsDto {
  @IsOptional()
  @IsString()
  @Length(1, 5000)
  note?: string;
}