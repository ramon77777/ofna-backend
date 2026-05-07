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

import { RechargeMode } from '../../../common/enums/recharge-mode.enum';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import { WalletEntity } from '../../wallets/entities/wallet.entity';

@Entity('wallet_recharges')
@Index('idx_wallet_recharges_wallet_id', ['wallet'])
@Index('idx_wallet_recharges_transaction_status', ['transactionStatus'])
@Index('idx_wallet_recharges_recharge_mode', ['rechargeMode'])
export class WalletRechargeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => WalletEntity, (wallet) => wallet.recharges, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: WalletEntity;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  amount!: string;

  @Column({
    name: 'recharge_mode',
    type: 'enum',
    enum: RechargeMode,
  })
  rechargeMode!: RechargeMode;

  @Column({
    name: 'transaction_reference',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  transactionReference!: string | null;

  @Column({
    name: 'transaction_status',
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.EN_ATTENTE,
  })
  transactionStatus!: TransactionStatus;

  @Column({
    name: 'recharged_at',
    type: 'timestamp',
    nullable: true,
  })
  rechargedAt!: Date | null;

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
