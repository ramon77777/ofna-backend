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

import { MissionEntity } from '../../missions/entities/mission.entity';
import { PartnerProfileEntity } from '../../partners/entities/partner-profile.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('reviews')
@Check('CHK_reviews_rating_range', '"rating" BETWEEN 1 AND 5')
@Index('idx_reviews_client_id', ['client'])
@Index('idx_reviews_partner_profile_id', ['partnerProfile'])
@Index('idx_reviews_mission_id', ['mission'])
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