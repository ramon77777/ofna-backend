import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ReviewType } from '../../../common/enums/review-type.enum';
import { MissionEntity } from '../../missions/entities/mission.entity';
import { OrderEntity } from '../../orders/entities/order.entity';
import { PartnerProfileEntity } from '../../partners/entities/partner-profile.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('reviews')
@Check('CHK_reviews_rating_range', '"rating" BETWEEN 1 AND 5')
@Index('idx_reviews_client_id', ['client'])
@Index('idx_reviews_partner_profile_id', ['partnerProfile'])
@Index('idx_reviews_mission_id', ['mission'])
@Index('idx_reviews_order_id', ['order'])
@Index('idx_reviews_review_type', ['reviewType'])
@Index('uq_reviews_mission_id', ['mission'], {
  unique: true,
  where: 'mission_id IS NOT NULL',
})
@Index('uq_reviews_order_id', ['order'], {
  unique: true,
  where: 'order_id IS NOT NULL',
})
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'client_id' })
  client!: UserEntity;

  @ManyToOne(() => PartnerProfileEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'partner_profile_id' })
  partnerProfile!: PartnerProfileEntity;

  @ManyToOne(() => MissionEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'mission_id' })
  mission!: MissionEntity | null;

  @ManyToOne(() => OrderEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity | null;

  @Column({
    name: 'review_type',
    type: 'enum',
    enum: ReviewType,
    default: ReviewType.MISSION,
  })
  reviewType!: ReviewType;

  @Column({
    type: 'smallint',
  })
  rating!: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  comment!: string | null;

  @Column({
    name: 'published_at',
    type: 'timestamp',
    default: () => 'NOW()',
  })
  publishedAt!: Date;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt!: Date;
}
