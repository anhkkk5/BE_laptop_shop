import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity.js';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'product_id', type: 'int' })
  productId!: number;

  /** Display label e.g. "16GB / 512GB SSD / Xám" */
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku!: string | null;

  /** Overrides product.price when set */
  @Column({ type: 'decimal', precision: 15, scale: 0, nullable: true })
  price!: number | null;

  @Column({
    name: 'sale_price',
    type: 'decimal',
    precision: 15,
    scale: 0,
    nullable: true,
  })
  salePrice!: number | null;

  @Column({ name: 'stock_quantity', type: 'int', default: 0 })
  stockQuantity!: number;

  /** Free-form attribute map e.g. {"ram":"16GB","storage":"512GB SSD","color":"Xám"} */
  @Column({ type: 'json' })
  attributes!: Record<string, string>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Product, (p) => p.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;
}
