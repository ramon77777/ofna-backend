import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PartnerActivityType } from '../../../common/enums/partner-activity-type.enum';
import { PartnerValidationStatus } from '../../../common/enums/partner-validation-status.enum';
import { PartnerDocumentEntity } from '../../partner-documents/entities/partner-document.entity';
import { ReviewEntity } from '../../reviews/entities/review.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { WalletEntity } from '../../wallets/entities/wallet.entity';

@Entity('partner_profiles')
@Index('idx_partner_profiles_activity_type', ['activityType'])
@Index('idx_partner_profiles_validation_status', ['validationStatus'])
@Index('idx_partner_profiles_is_available', ['isAvailable'])
@Index('idx_partner_profiles_is_visible', ['isVisible'])
@Index('idx_partner_profiles_visibility_combo', [
  'validationStatus',
  'isVisible',
  'isAvailable',
])
export class PartnerProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => UserEntity, (user) => user.partnerProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({
    name: 'activity_type',
    type: 'enum',
    enum: PartnerActivityType,
  })
  activityType!: PartnerActivityType;

  @Column({
    name: 'business_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  businessName!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    name: 'intervention_zone',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  interventionZone!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  address!: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  latitude!: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  longitude!: string | null;

  @Column({
    name: 'validation_status',
    type: 'enum',
    enum: PartnerValidationStatus,
    default: PartnerValidationStatus.EN_ATTENTE,
  })
  validationStatus!: PartnerValidationStatus;

  @Column({
    name: 'average_rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
  })
  averageRating!: string;

  @Column({
    name: 'reviews_count',
    type: 'int',
    default: 0,
  })
  reviewsCount!: number;

  @Column({
    name: 'is_available',
    type: 'boolean',
    default: false,
  })
  isAvailable!: boolean;

  @Column({
    name: 'is_visible',
    type: 'boolean',
    default: false,
  })
  isVisible!: boolean;

  @Column({
    name: 'validated_at',
    type: 'timestamp',
    nullable: true,
  })
  validatedAt!: Date | null;

  @OneToMany(
    () => PartnerDocumentEntity,
    (partnerDocument) => partnerDocument.partnerProfile,
  )
  documents?: PartnerDocumentEntity[];

  @OneToOne(() => WalletEntity, (wallet) => wallet.partnerProfile)
  wallet?: WalletEntity;

  @OneToMany(() => ReviewEntity, (review) => review.partnerProfile)
  reviews?: ReviewEntity[];

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