import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ShippingProvider } from '../enums/shipping-provider.enum.js';

@Entity('shipping_provider_configs')
export class ShippingProviderConfig {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: ShippingProvider, unique: true })
  provider!: ShippingProvider;

  @Column({ name: 'api_key', type: 'varchar', length: 255 })
  apiKey!: string;

  @Column({ name: 'api_secret', type: 'varchar', length: 255, nullable: true })
  apiSecret!: string | null;

  @Column({ name: 'base_url', type: 'varchar', length: 255 })
  baseUrl!: string;

  @Column({
    name: 'webhook_secret',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  webhookSecret!: string | null;

  @Column({ name: 'warehouse_address', type: 'varchar', length: 255 })
  warehouseAddress!: string;

  @Column({ name: 'warehouse_ward', type: 'varchar', length: 100 })
  warehouseWard!: string;

  @Column({ name: 'warehouse_district', type: 'varchar', length: 100 })
  warehouseDistrict!: string;

  @Column({ name: 'warehouse_province', type: 'varchar', length: 100 })
  warehouseProvince!: string;

  @Column({ name: 'warehouse_phone', type: 'varchar', length: 20 })
  warehousePhone!: string;

  @Column({ name: 'rate_limit_per_minute', type: 'int', default: 60 })
  rateLimitPerMinute!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 1 })
  priority!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
