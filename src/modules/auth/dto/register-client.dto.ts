import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterClientDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @IsString()
  @Length(8, 30)
  @Matches(/^[0-9+\s()-]+$/, {
    message: 'phone format is invalid',
  })
  phone!: string;

  @IsOptional()
  @IsEmail()
  @Length(3, 150)
  email?: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
