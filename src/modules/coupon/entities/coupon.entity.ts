import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CouponDiscountType } from '../enums/coupon-discount-type.enum.js';
import { CouponUsage } from './coupon-usage.entity.js';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    name: 'discount_type',
    type: 'enum',
    enum: CouponDiscountType,
  })
  discountType!: CouponDiscountType;

  @Column({ name: 'discount_value', type: 'decimal', precision: 15, scale: 0 })
  discountValue!: number;

  @Column({
    name: 'min_order_value',
    type: 'decimal',
    precision: 15,
    scale: 0,
    default: 0,
  })
  minOrderValue!: number;

  @Column({
    name: 'max_discount_amount',
    type: 'decimal',
    precision: 15,
    scale: 0,
    nullable: true,
  })
  maxDiscountAmount!: number | null;

  @Column({ name: 'usage_limit', type: 'int', nullable: true })
  usageLimit!: number | null;

  @Column({ name: 'usage_count', type: 'int', default: 0 })
  usageCount!: number;

  @Column({ name: 'usage_limit_per_user', type: 'int', nullable: true })
  usageLimitPerUser!: number | null;

  @Column({ name: 'start_at', type: 'datetime', nullable: true })
  startAt!: Date | null;

  @Column({ name: 'end_at', type: 'datetime', nullable: true })
  endAt!: Date | null;

  @Column({ name: 'applicable_product_ids', type: 'json', nullable: true })
  applicableProductIds!: number[] | null;

  @Column({ name: 'applicable_category_ids', type: 'json', nullable: true })
  applicableCategoryIds!: number[] | null;

  @Column({ name: 'applicable_brand_ids', type: 'json', nullable: true })
  applicableBrandIds!: number[] | null;

  @Column({ name: 'first_time_customer_only', type: 'boolean', default: false })
  firstTimeCustomerOnly!: boolean;

  @Column({ name: 'is_stackable', type: 'boolean', default: false })
  isStackable!: boolean;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ name: 'buy_quantity', type: 'int', nullable: true })
  buyQuantity!: number | null;

  @Column({ name: 'get_quantity', type: 'int', nullable: true })
  getQuantity!: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => CouponUsage, (usage) => usage.coupon)
  usages!: CouponUsage[];
}
