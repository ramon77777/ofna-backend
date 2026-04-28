import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post()
  async createNotification(
    @Body() dto: CreateNotificationDto,
  ): Promise<NotificationEntity> {
    return this.notificationsService.createNotification(dto);
  }

  @Get('me')
  async getMyNotifications(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<NotificationEntity[]> {
    return this.notificationsService.getMyNotifications(currentUser.sub);
  }

  @Get('me/unread-count')
  async getUnreadCount(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<{ unreadCount: number }> {
    return this.notificationsService.getUnreadCount(currentUser.sub);
  }

  @Get(':notificationId')
  async getNotificationById(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('notificationId') notificationId: string,
  ): Promise<NotificationEntity> {
    return this.notificationsService.getNotificationById(
      currentUser.sub,
      notificationId,
    );
  }

  @Patch(':notificationId/read')
  async markAsRead(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('notificationId') notificationId: string,
  ): Promise<NotificationEntity> {
    return this.notificationsService.markAsRead(
      currentUser.sub,
      notificationId,
    );
  }

  @Patch('me/read-all')
  async markAllAsRead(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<NotificationEntity[]> {
    return this.notificationsService.markAllAsRead(currentUser.sub);
  }
}