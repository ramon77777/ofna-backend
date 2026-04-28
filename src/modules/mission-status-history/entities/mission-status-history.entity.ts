import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { MissionStatus } from '../../../common/enums/mission-status.enum';
import { MissionEntity } from '../../missions/entities/mission.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('mission_status_history')
@Index('idx_mission_status_history_mission_id', ['mission'])
@Index('idx_mission_status_history_changed_by_user_id', ['changedByUser'])
export class MissionStatusHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => MissionEntity, (mission) => mission.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'mission_id' })
  mission!: MissionEntity;

  @Column({
    name: 'old_status',
    type: 'enum',
    enum: MissionStatus,
    nullable: true,
  })
  oldStatus!: MissionStatus | null;

  @Column({
    name: 'new_status',
    type: 'enum',
    enum: MissionStatus,
  })
  newStatus!: MissionStatus;

  @Column({
    type: 'text',
    nullable: true,
  })
  comment!: string | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'changed_by_user_id' })
  changedByUser!: UserEntity | null;

  @Column({
    name: 'changed_at',
    type: 'timestamp',
    default: () => 'NOW()',
  })
  changedAt!: Date;
}