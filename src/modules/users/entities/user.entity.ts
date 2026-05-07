import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AccountStatus } from '../../../common/enums/account-status.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { PartnerProfileEntity } from '../../partners/entities/partner-profile.entity';

@Entity('users')
@Index('idx_users_role', ['role'])
@Index('idx_users_account_status', ['accountStatus'])
@Index('idx_users_phone', ['phone'])
@Index('idx_users_email', ['email'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role!: UserRole;

  @Column({
    name: 'first_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  firstName!: string | null;

  @Column({
    name: 'last_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  lastName!: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    unique: true,
  })
  phone!: string;

  @Column({
    type: 'varchar',
    length: 150,
    unique: true,
    nullable: true,
  })
  email!: string | null;

  @Exclude()
  @Column({
    name: 'password_hash',
    type: 'text',
  })
  passwordHash!: string;

  @Column({
    name: 'profile_photo_url',
    type: 'text',
    nullable: true,
  })
  profilePhotoUrl!: string | null;

  @Column({
    name: 'account_status',
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
  })
  accountStatus!: AccountStatus;

  @Column({
    name: 'last_login_at',
    type: 'timestamp',
    nullable: true,
  })
  lastLoginAt!: Date | null;

  @OneToOne(() => PartnerProfileEntity, (partnerProfile) => partnerProfile.user)
  partnerProfile?: PartnerProfileEntity;

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
