import { IsString, Length } from 'class-validator';

export class RequestPartnerDocumentsDto {
  @IsString()
  @Length(1, 5000)
  message!: string;
}
