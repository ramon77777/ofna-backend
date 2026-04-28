import { IsEnum, IsString, Length } from 'class-validator';

import { NotificationType } from '../../../common/enums/notification-type.enum';

export class CreateNotificationDto {
  @IsString()
  userId!: string;

  @IsString()
  @Length(1, 200)
  title!: string;

  @IsString()
  @Length(1, 5000)
  message!: string;

  @IsEnum(NotificationType)
  notificationType!: NotificationType;
}