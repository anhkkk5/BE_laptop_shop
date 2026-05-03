import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from '../../product/entities/product.entity.js';

@Entity('inventories')
export class Inventory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'product_id', type: 'int', unique: true })
  productId!: number;

  @Column({ name: 'available_qty', type: 'int', default: 0 })
  availableQty!: number;

  @Column({ name: 'reserved_qty', type: 'int', default: 0 })
  reservedQty!: number;

  @Column({ name: 'damaged_qty', type: 'int', default: 0 })
  damagedQty!: number;

  @Column({ name: 'incoming_qty', type: 'int', default: 0 })
  incomingQty!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;
}
