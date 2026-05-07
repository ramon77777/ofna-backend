import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { MissionSelectionMode } from '../../../common/enums/mission-selection-mode.enum';
import { MissionStatus } from '../../../common/enums/mission-status.enum';
import { MissionType } from '../../../common/enums/mission-type.enum';
import { PanneType } from '../../../common/enums/panne-type.enum';
import { PaymentMode } from '../../../common/enums/payment-mode.enum';
import { VehicleType } from '../../../common/enums/vehicle-type.enum';
import { CommissionEntity } from '../../commissions/entities/commission.entity';
import { MissionStatusHistoryEntity } from '../../mission-status-history/entities/mission-status-history.entity';
import { PartnerProfileEntity } from '../../partners/entities/partner-profile.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('missions')
@Index('idx_missions_client_id', ['client'])
@Index('idx_missions_partner_profile_id', ['partnerProfile'])
@Index('idx_missions_mission_type', ['missionType'])
@Index('idx_missions_mission_status', ['missionStatus'])
@Index('idx_missions_selection_mode', ['selectionMode'])
@Index('idx_missions_status_type', ['missionStatus', 'missionType'])
export class MissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'client_id' })
  client!: UserEntity;

  @ManyToOne(() => PartnerProfileEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'partner_profile_id' })
  partnerProfile!: PartnerProfileEntity | null;

  @Column({
    name: 'mission_type',
    type: 'enum',
    enum: MissionType,
  })
  missionType!: MissionType;

  @Column({
    name: 'panne_type',
    type: 'enum',
    enum: PanneType,
    nullable: true,
  })
  panneType!: PanneType | null;

  @Column({
    name: 'vehicle_type',
    type: 'enum',
    enum: VehicleType,
    nullable: true,
  })
  vehicleType!: VehicleType | null;

  @Column({
    name: 'departure_address',
    type: 'text',
  })
  departureAddress!: string;

  @Column({
    name: 'departure_latitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
  })
  departureLatitude!: string;

  @Column({
    name: 'departure_longitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
  })
  departureLongitude!: string;

  @Column({
    name: 'destination_address',
    type: 'text',
    nullable: true,
  })
  destinationAddress!: string | null;

  @Column({
    name: 'destination_latitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  destinationLatitude!: string | null;

  @Column({
    name: 'destination_longitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  destinationLongitude!: string | null;

  @Column({
    name: 'selection_mode',
    type: 'enum',
    enum: MissionSelectionMode,
  })
  selectionMode!: MissionSelectionMode;

  @Column({
    name: 'proposed_amount',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  proposedAmount!: string | null;

  @Column({
    name: 'validated_amount',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  validatedAmount!: string | null;

  @Column({
    name: 'payment_mode',
    type: 'enum',
    enum: PaymentMode,
    nullable: true,
  })
  paymentMode!: PaymentMode | null;

  @Column({
    name: 'mission_status',
    type: 'enum',
    enum: MissionStatus,
    default: MissionStatus.EN_ATTENTE,
  })
  missionStatus!: MissionStatus;

  @Column({
    name: 'accepted_at',
    type: 'timestamp',
    nullable: true,
  })
  acceptedAt!: Date | null;

  @Column({
    name: 'completed_at',
    type: 'timestamp',
    nullable: true,
  })
  completedAt!: Date | null;

  @Column({
    name: 'cancelled_at',
    type: 'timestamp',
    nullable: true,
  })
  cancelledAt!: Date | null;

  @Column({
    name: 'commission_processed',
    type: 'boolean',
    default: false,
  })
  commissionProcessed!: boolean;

  @OneToMany(
    () => MissionStatusHistoryEntity,
    (statusHistory) => statusHistory.mission,
  )
  statusHistory?: MissionStatusHistoryEntity[];

  @OneToMany(() => CommissionEntity, (commission) => commission.mission)
  commissions?: CommissionEntity[];

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
