import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { SupportStatus } from '../../../common/enums/support-status.enum';
import { SupportType } from '../../../common/enums/support-type.enum';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('support_tickets')
@Index('idx_support_tickets_user_id', ['user'])
@Index('idx_support_tickets_support_type', ['supportType'])
@Index('idx_support_tickets_support_status', ['supportStatus'])
@Index('idx_support_tickets_assigned_admin_id', ['assignedAdmin'])
export class SupportTicketEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({
    name: 'support_type',
    type: 'enum',
    enum: SupportType,
  })
  supportType!: SupportType;

  @Column({
    type: 'varchar',
    length: 200,
  })
  subject!: string;

  @Column({
    type: 'text',
  })
  message!: string;

  @Column({
    name: 'support_status',
    type: 'enum',
    enum: SupportStatus,
    default: SupportStatus.OUVERT,
  })
  supportStatus!: SupportStatus;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assigned_admin_id' })
  assignedAdmin!: UserEntity | null;

  @Column({
    name: 'closed_at',
    type: 'timestamp',
    nullable: true,
  })
  closedAt!: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
  })
  updatedAt!: Date;
}