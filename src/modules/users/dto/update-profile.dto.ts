import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(8, 30)
  @Matches(/^[0-9+\s()-]+$/, {
    message: 'phone format is invalid',
  })
  phone?: string;

  @IsOptional()
  @IsEmail()
  @Length(3, 150)
  email?: string;
}