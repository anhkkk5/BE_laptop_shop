import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity.js';
import type { Product } from '../../product/entities/product.entity.js';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id', type: 'int' })
  orderId!: number;

  @Column({ name: 'product_id', type: 'int' })
  productId!: number;

  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName!: string;

  @Column({
    name: 'product_image',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  productImage!: string | null;

  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 0 })
  unitPrice!: number;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 15, scale: 0 })
  lineTotal!: number;

  @Column({ name: 'variant_id', type: 'int', nullable: true })
  variantId!: number | null;

  @Column({ name: 'variant_label', type: 'varchar', length: 255, nullable: true })
  variantLabel!: string | null;

  @Column({ name: 'variant_sku', type: 'varchar', length: 100, nullable: true })
  variantSku!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne('Product', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;
}
