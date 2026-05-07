import { IsOptional, IsString } from 'class-validator';

export class RequestPasswordResetDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
