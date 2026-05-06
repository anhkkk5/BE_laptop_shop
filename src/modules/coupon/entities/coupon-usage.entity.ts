import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Coupon } from './coupon.entity.js';

@Entity('coupon_usages')
@Unique('UQ_coupon_usage_coupon_order', ['couponId', 'orderId'])
export class CouponUsage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'coupon_id', type: 'int' })
  couponId!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'order_id', type: 'int' })
  orderId!: number;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 15,
    scale: 0,
  })
  discountAmount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Coupon, (coupon) => coupon.usages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coupon_id' })
  coupon!: Coupon;
}
