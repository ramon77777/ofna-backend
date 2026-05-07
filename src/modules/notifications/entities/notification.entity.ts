import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { NotificationType } from '../../../common/enums/notification-type.enum';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('notifications')
@Index('idx_notifications_user_id', ['user'])
@Index('idx_notifications_notification_type', ['notificationType'])
@Index('idx_notifications_is_read', ['isRead'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({
    type: 'varchar',
    length: 200,
  })
  title!: string;

  @Column({
    type: 'text',
  })
  message!: string;

  @Column({
    name: 'notification_type',
    type: 'enum',
    enum: NotificationType,
  })
  notificationType!: NotificationType;

  @Column({
    name: 'is_read',
    type: 'boolean',
    default: false,
  })
  isRead!: boolean;

  @Column({
    name: 'sent_at',
    type: 'timestamp',
    default: () => 'NOW()',
  })
  sentAt!: Date;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt!: Date;
}
