import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderItem } from './order-item.entity.js';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPING = 'shipping',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'order_code', type: 'varchar', length: 30, unique: true })
  orderCode!: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Column({ name: 'customer_name', type: 'varchar', length: 100 })
  customerName!: string;

  @Column({ name: 'customer_phone', type: 'varchar', length: 20 })
  customerPhone!: string;

  @Column({ name: 'shipping_address', type: 'varchar', length: 255 })
  shippingAddress!: string;

  @Column({ type: 'varchar', length: 50, default: 'cod' })
  paymentMethod!: string;

  @Column({ type: 'decimal', precision: 15, scale: 0 })
  subtotal!: number;

  @Column({ name: 'shipping_fee', type: 'decimal', precision: 15, scale: 0, default: 0 })
  shippingFee!: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 15, scale: 0, default: 0 })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 0 })
  total!: number;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];
}
