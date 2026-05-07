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

import { ProductAvailability } from '../../../common/enums/product-availability.enum';
import { ProductCategory } from '../../../common/enums/product-category.enum';
import { OrderEntity } from '../../orders/entities/order.entity';
import { PartnerProfileEntity } from '../../partners/entities/partner-profile.entity';

@Entity('products')
@Index('idx_products_partner_profile_id', ['partnerProfile'])
@Index('idx_products_category', ['category'])
@Index('idx_products_availability', ['availability'])
@Index('idx_products_is_active', ['isActive'])
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PartnerProfileEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'partner_profile_id' })
  partnerProfile!: PartnerProfileEntity;

  @Column({
    type: 'varchar',
    length: 150,
  })
  name!: string;

  @Column({
    type: 'enum',
    enum: ProductCategory,
  })
  category!: ProductCategory;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  price!: string;

  @Column({
    name: 'main_photo_url',
    type: 'text',
    nullable: true,
  })
  mainPhotoUrl!: string | null;

  @Column({
    type: 'enum',
    enum: ProductAvailability,
    default: ProductAvailability.DISPONIBLE,
  })
  availability!: ProductAvailability;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @OneToMany(() => OrderEntity, (order) => order.product)
  orders?: OrderEntity[];

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
