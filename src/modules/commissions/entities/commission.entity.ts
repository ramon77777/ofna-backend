import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { CommissionOperationType } from '../../../common/enums/commission-operation-type.enum';
import { MissionEntity } from '../../missions/entities/mission.entity';
import { OrderEntity } from '../../orders/entities/order.entity';
import { PartnerProfileEntity } from '../../partners/entities/partner-profile.entity';

@Entity('commissions')
@Index('idx_commissions_partner_profile_id', ['partnerProfile'])
@Index('idx_commissions_mission_id', ['mission'])
@Index('idx_commissions_operation_type', ['operationType'])
export class CommissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PartnerProfileEntity, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'partner_profile_id' })
  partnerProfile!: PartnerProfileEntity;

  @ManyToOne(() => MissionEntity, (mission) => mission.commissions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'mission_id' })
  mission!: MissionEntity | null;

  @ManyToOne(() => OrderEntity, (order) => order.commissions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity | null;

  @Column({
    name: 'operation_type',
    type: 'enum',
    enum: CommissionOperationType,
  })
  operationType!: CommissionOperationType;

  @Column({
    name: 'operation_amount',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  operationAmount!: string;

  @Column({
    name: 'commission_rate',
    type: 'numeric',
    precision: 5,
    scale: 2,
  })
  commissionRate!: string;

  @Column({
    name: 'commission_amount',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  commissionAmount!: string;

  @Column({
    name: 'debited_at',
    type: 'timestamp',
    default: () => 'NOW()',
  })
  debitedAt!: Date;

  @Column({
    name: 'note',
    type: 'text',
    nullable: true,
  })
  note!: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt!: Date;
}