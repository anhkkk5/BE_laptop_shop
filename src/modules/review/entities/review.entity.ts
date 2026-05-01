import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'product_id', type: 'int' })
  productId!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'order_item_id', type: 'int' })
  orderItemId!: number;

  @Column({ type: 'tinyint' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({ type: 'json', nullable: true })
  images!: string[] | null;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
