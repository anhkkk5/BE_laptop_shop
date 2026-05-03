import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity.js';
import { Brand } from '../../brand/entities/brand.entity.js';
import { ProductImage } from './product-image.entity.js';
import type { User } from '../../user/entities/user.entity.js';

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 280, unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    name: 'short_description',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  shortDescription!: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 0 })
  price!: number;

  @Column({
    name: 'sale_price',
    type: 'decimal',
    precision: 15,
    scale: 0,
    nullable: true,
  })
  salePrice!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sku!: string | null;

  @Column({ name: 'stock_quantity', type: 'int', default: 0 })
  stockQuantity!: number;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId!: number | null;

  @Column({ name: 'brand_id', type: 'int', nullable: true })
  brandId!: number | null;

  @Column({ name: 'seller_id', type: 'int', nullable: true })
  sellerId!: number | null;

  @Column({ name: 'sold_count', type: 'int', default: 0 })
  soldCount!: number;

  @Column({ name: 'rating_avg', type: 'float', default: 0 })
  ratingAvg!: number;

  @Column({ name: 'review_count', type: 'int', default: 0 })
  reviewCount!: number;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  status!: ProductStatus;

  @Column({ type: 'json', nullable: true })
  specs!: Record<string, string> | null;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured!: boolean;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount!: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category!: Category | null;

  @ManyToOne(() => Brand, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'brand_id' })
  brand!: Brand | null;

  @OneToMany(() => ProductImage, (img) => img.product, { cascade: true })
  images!: ProductImage[];

  @ManyToOne('User', 'sellerProducts', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'seller_id' })
  seller!: User | null;
}
