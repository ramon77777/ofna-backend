import { IsBoolean } from 'class-validator';

export class UpdatePartnerVisibilityDto {
  @IsBoolean()
  isVisible!: boolean;
}
