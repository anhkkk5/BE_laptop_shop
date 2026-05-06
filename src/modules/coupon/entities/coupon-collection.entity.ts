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

@Entity('coupon_collections')
@Unique('UQ_coupon_collection_user_coupon', ['userId', 'couponId'])
export class CouponCollection {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'coupon_id', type: 'int' })
  couponId!: number;

  @CreateDateColumn({ name: 'collected_at' })
  collectedAt!: Date;

  @ManyToOne(() => Coupon, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coupon_id' })
  coupon!: Coupon;
}
