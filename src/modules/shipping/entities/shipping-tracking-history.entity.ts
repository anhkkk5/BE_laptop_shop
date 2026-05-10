import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ShippingOrder } from './shipping-order.entity.js';

@Entity('shipping_tracking_history')
export class ShippingTrackingHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'shipping_order_id', type: 'int' })
  shippingOrderId!: number;

  @Column({ type: 'varchar', length: 50 })
  status!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'event_time', type: 'timestamp' })
  eventTime!: Date;

  @Column({ name: 'provider_raw', type: 'json', nullable: true })
  providerRaw!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => ShippingOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shipping_order_id' })
  shippingOrder!: ShippingOrder;
}
