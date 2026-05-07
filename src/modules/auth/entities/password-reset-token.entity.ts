import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserEntity } from '../../users/entities/user.entity';

@Entity('password_reset_tokens')
@Index('idx_password_reset_tokens_user_id', ['user'])
@Index('idx_password_reset_tokens_token_hash', ['tokenHash'])
@Index('idx_password_reset_tokens_expires_at', ['expiresAt'])
export class PasswordResetTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({
    name: 'token_hash',
    type: 'text',
  })
  tokenHash!: string;

  @Column({
    name: 'expires_at',
    type: 'timestamp',
  })
  expiresAt!: Date;

  @Column({
    name: 'used_at',
    type: 'timestamp',
    nullable: true,
  })
  usedAt!: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt!: Date;
}
