import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RealtimeGateway } from '../../gateways/realtime/realtime.gateway';
import { UserEntity } from '../users/entities/user.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationEntity } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationsRepository: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private async getUserOrFail(userId: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private buildNotificationCreatedPayload(
    notification: NotificationEntity,
  ): Record<string, unknown> {
    return {
      notificationId: notification.id,
      title: notification.title,
      message: notification.message,
      notificationType: notification.notificationType,
      isRead: notification.isRead,
      sentAt: notification.sentAt ?? null,
      createdAt: notification.createdAt,
    };
  }

  private buildNotificationReadPayload(
    notification: NotificationEntity,
  ): Record<string, unknown> {
    return {
      notificationId: notification.id,
      isRead: notification.isRead,
      sentAt: notification.sentAt ?? null,
      createdAt: notification.createdAt,
      message: 'La notification a été marquée comme lue.',
    };
  }

  private buildNotificationsAllReadPayload(
    userId: string,
    unreadCount: number,
  ): Record<string, unknown> {
    return {
      userId,
      unreadCount,
      message: 'Toutes les notifications ont été marquées comme lues.',
    };
  }

  async createNotification(
    dto: CreateNotificationDto,
  ): Promise<NotificationEntity> {
    const user = await this.getUserOrFail(dto.userId);

    const notification = this.notificationsRepository.create({
      user,
      title: dto.title.trim(),
      message: dto.message.trim(),
      notificationType: dto.notificationType,
      isRead: false,
      sentAt: new Date(),
    });

    await this.notificationsRepository.save(notification);

    const freshNotification = await this.notificationsRepository.findOneOrFail({
      where: { id: notification.id },
      relations: {
        user: true,
      },
    });

    this.realtimeGateway.emitToUser(
      freshNotification.user.id,
      'notification.created',
      this.buildNotificationCreatedPayload(freshNotification),
    );

    return freshNotification;
  }

  async getMyNotifications(userId: string): Promise<NotificationEntity[]> {
    await this.getUserOrFail(userId);

    return this.notificationsRepository.find({
      where: {
        user: { id: userId },
      },
      relations: {
        user: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getNotificationById(
    userId: string,
    notificationId: string,
  ): Promise<NotificationEntity> {
    await this.getUserOrFail(userId);

    const notification = await this.notificationsRepository.findOne({
      where: {
        id: notificationId,
        user: { id: userId },
      },
      relations: {
        user: true,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationEntity> {
    const notification = await this.getNotificationById(userId, notificationId);

    if (!notification.isRead) {
      notification.isRead = true;
      await this.notificationsRepository.save(notification);
    }

    const freshNotification = await this.notificationsRepository.findOneOrFail({
      where: { id: notification.id },
      relations: {
        user: true,
      },
    });

    this.realtimeGateway.emitToUser(
      freshNotification.user.id,
      'notification.read',
      this.buildNotificationReadPayload(freshNotification),
    );

    return freshNotification;
  }

  async markAllAsRead(userId: string): Promise<NotificationEntity[]> {
    await this.getUserOrFail(userId);

    const notifications = await this.notificationsRepository.find({
      where: {
        user: { id: userId },
      },
      relations: {
        user: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    let hasChanges = false;

    for (const notification of notifications) {
      if (!notification.isRead) {
        notification.isRead = true;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await this.notificationsRepository.save(notifications);
    }

    const freshNotifications = await this.notificationsRepository.find({
      where: {
        user: { id: userId },
      },
      relations: {
        user: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    this.realtimeGateway.emitToUser(
      userId,
      'notification.all-read',
      this.buildNotificationsAllReadPayload(userId, 0),
    );

    return freshNotifications;
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    await this.getUserOrFail(userId);

    const unreadCount = await this.notificationsRepository.count({
      where: {
        user: { id: userId },
        isRead: false,
      },
    });

    return { unreadCount };
  }
}
