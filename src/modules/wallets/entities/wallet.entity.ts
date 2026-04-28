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

import { WalletStatus } from '../../../common/enums/wallet-status.enum';
import { PartnerProfileEntity } from '../../partners/entities/partner-profile.entity';
import { WalletRechargeEntity } from '../../wallet-recharges/entities/wallet-recharge.entity';

@Entity('wallets')
@Index('idx_wallets_wallet_status', ['walletStatus'])
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(
    () => PartnerProfileEntity,
    (partnerProfile) => partnerProfile.wallet,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'partner_profile_id' })
  partnerProfile!: PartnerProfileEntity;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
  })
  balance!: string;

  @Column({
    name: 'wallet_status',
    type: 'enum',
    enum: WalletStatus,
    default: WalletStatus.VIDE,
  })
  walletStatus!: WalletStatus;

  @OneToMany(
    () => WalletRechargeEntity,
    (walletRecharge) => walletRecharge.wallet,
  )
  recharges?: WalletRechargeEntity[];

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