import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum StockMovementType {
  IMPORT = 'import',
  EXPORT = 'export',
  ADJUST = 'adjust',
  RESERVE = 'reserve',
  RELEASE = 'release',
  CONFIRM = 'confirm',
}

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'product_id', type: 'int' })
  productId!: number;

  @Column({
    type: 'enum',
    enum: StockMovementType,
  })
  type!: StockMovementType;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'int', default: 0 })
  beforeQty!: number;

  @Column({ type: 'int', default: 0 })
  afterQty!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({
    name: 'reference_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  referenceId!: string | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
