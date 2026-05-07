import { IsOptional, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  token!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}
