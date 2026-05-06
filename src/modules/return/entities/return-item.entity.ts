import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReturnRequest } from './return-request.entity.js';

@Entity('return_items')
export class ReturnItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'return_request_id', type: 'int' })
  returnRequestId!: number;

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

  @ManyToOne(() => ReturnRequest, (rr) => rr.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'return_request_id' })
  returnRequest!: ReturnRequest;
}
