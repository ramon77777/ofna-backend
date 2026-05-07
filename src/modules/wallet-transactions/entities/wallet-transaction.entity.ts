import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { WalletTransactionSource } from '../../../common/enums/wallet-transaction-source.enum';
import { WalletTransactionType } from '../../../common/enums/wallet-transaction-type.enum';
import { MissionEntity } from '../../missions/entities/mission.entity';
import { WalletEntity } from '../../wallets/entities/wallet.entity';

@Entity('wallet_transactions')
@Index('idx_wallet_transactions_created_at', ['createdAt'])
export class WalletTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => WalletEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: WalletEntity;

  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: WalletTransactionType,
  })
  transactionType!: WalletTransactionType;

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: WalletTransactionSource,
  })
  sourceType!: WalletTransactionSource;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  amount!: string;

  @Column({
    name: 'balance_before',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  balanceBefore!: string;

  @Column({
    name: 'balance_after',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  balanceAfter!: string;

  @ManyToOne(() => MissionEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mission_id' })
  mission!: MissionEntity | null;

  @Column({
    type: 'varchar',
    length: 255,
  })
  label!: string;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  reference!: string | null;

  @Column({
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
