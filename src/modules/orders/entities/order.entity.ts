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

import { OrderStatus } from '../../../common/enums/order-status.enum';
import { PaymentMode } from '../../../common/enums/payment-mode.enum';
import { CommissionEntity } from '../../commissions/entities/commission.entity';
import { PartnerProfileEntity } from '../../partners/entities/partner-profile.entity';
import { ProductEntity } from '../../products/entities/product.entity';
import { UserEntity } from '../../users/entities/user.entity';

import { ReviewEntity } from '../../reviews/entities/review.entity';

@Entity('orders')
@Index('idx_orders_client_id', ['client'])
@Index('idx_orders_partner_profile_id', ['partnerProfile'])
@Index('idx_orders_product_id', ['product'])
@Index('idx_orders_order_status', ['orderStatus'])
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'client_id' })
  client!: UserEntity;

  @ManyToOne(() => PartnerProfileEntity, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'partner_profile_id' })
  partnerProfile!: PartnerProfileEntity;

  @ManyToOne(() => ProductEntity, (product) => product.orders, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @Column({
    type: 'int',
    default: 1,
  })
  quantity!: number;

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
    name: 'delivery_fee',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  deliveryFee!: string | null;

  @Column({
    name: 'delivery_fee_confirmed_at',
    type: 'timestamp',
    nullable: true,
  })
  deliveryFeeConfirmedAt!: Date | null;

  @Column({
    name: 'payment_mode',
    type: 'enum',
    enum: PaymentMode,
    nullable: true,
  })
  paymentMode!: PaymentMode | null;

  @Column({
    name: 'order_status',
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.EN_ATTENTE,
  })
  orderStatus!: OrderStatus;

  @Column({
    name: 'validated_at',
    type: 'timestamp',
    nullable: true,
  })
  validatedAt!: Date | null;

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

  @OneToMany(() => CommissionEntity, (commission) => commission.order)
  commissions?: CommissionEntity[];

  @OneToMany(() => ReviewEntity, (review) => review.order)
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
