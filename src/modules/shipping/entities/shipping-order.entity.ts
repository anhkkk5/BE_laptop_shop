import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ShippingProvider } from '../enums/shipping-provider.enum.js';
import {
  ShippingStatus,
  CodStatus,
  ServiceType,
} from '../enums/shipping-status.enum.js';

@Entity('shipping_orders')
export class ShippingOrder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id', type: 'int' })
  orderId!: number;

  @Column({ type: 'enum', enum: ShippingProvider })
  provider!: ShippingProvider;

  @Column({
    name: 'tracking_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  trackingNumber!: string | null;

  @Column({
    type: 'enum',
    enum: ShippingStatus,
    default: ShippingStatus.PENDING,
  })
  status!: ShippingStatus;

  @Column({
    name: 'service_type',
    type: 'enum',
    enum: ServiceType,
    default: ServiceType.STANDARD,
  })
  serviceType!: ServiceType;

  @Column({
    name: 'shipping_fee',
    type: 'decimal',
    precision: 15,
    scale: 0,
    default: 0,
  })
  shippingFee!: number;

  @Column({
    name: 'cod_amount',
    type: 'decimal',
    precision: 15,
    scale: 0,
    nullable: true,
  })
  codAmount!: number | null;

  @Column({ name: 'cod_status', type: 'enum', enum: CodStatus, nullable: true })
  codStatus!: CodStatus | null;

  @Column({ name: 'estimated_delivery', type: 'timestamp', nullable: true })
  estimatedDelivery!: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt!: Date | null;

  @Column({ name: 'label_url', type: 'varchar', length: 500, nullable: true })
  labelUrl!: string | null;

  @Column({ name: 'package_number', type: 'int', default: 1 })
  packageNumber!: number;

  @Column({ name: 'total_packages', type: 'int', default: 1 })
  totalPackages!: number;

  @Column({ name: 'weight_grams', type: 'int', default: 0 })
  weightGrams!: number;

  @Column({
    name: 'insurance_value',
    type: 'decimal',
    precision: 15,
    scale: 0,
    nullable: true,
  })
  insuranceValue!: number | null;

  @Column({
    name: 'insurance_fee',
    type: 'decimal',
    precision: 15,
    scale: 0,
    default: 0,
  })
  insuranceFee!: number;

  @Column({ name: 'is_return', type: 'boolean', default: false })
  isReturn!: boolean;

  @Column({ name: 'return_reference_id', type: 'int', nullable: true })
  returnReferenceId!: number | null;

  @Column({ name: 'provider_data', type: 'json', nullable: true })
  providerData!: Record<string, unknown> | null;

  @Column({
    name: 'cancellation_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  cancellationReason!: string | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
