import { IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpdateAvatarDto {
  @IsOptional()
  @IsString()
  @Length(1, 5000)
  @IsUrl(
    {
      require_tld: false,
    },
    {
      message: 'profilePhotoUrl must be a valid URL',
    },
  )
  profilePhotoUrl?: string | null;
}