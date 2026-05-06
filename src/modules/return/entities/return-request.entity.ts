import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import {
  ReturnStatus,
  ReturnReason,
  RefundMethod,
} from '../enums/return.enum.js';
import { ReturnItem } from './return-item.entity.js';
import { RefundTransaction } from './refund-transaction.entity.js';

@Entity('return_requests')
export class ReturnRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'return_code', type: 'varchar', length: 30, unique: true })
  returnCode!: string;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'order_id', type: 'int' })
  orderId!: number;

  @Column({ name: 'order_code', type: 'varchar', length: 30 })
  orderCode!: string;

  @Column({
    type: 'enum',
    enum: ReturnStatus,
    default: ReturnStatus.PENDING_REVIEW,
  })
  status!: ReturnStatus;

  @Column({ name: 'return_reason', type: 'enum', enum: ReturnReason })
  returnReason!: ReturnReason;

  @Column({ name: 'return_description', type: 'text', nullable: true })
  returnDescription!: string | null;

  @Column({ name: 'evidence_photos', type: 'simple-array', nullable: true })
  evidencePhotos!: string[] | null;

  @Column({
    name: 'refund_method',
    type: 'enum',
    enum: RefundMethod,
    nullable: true,
  })
  refundMethod!: RefundMethod | null;

  @Column({
    name: 'refund_amount',
    type: 'decimal',
    precision: 15,
    scale: 0,
    nullable: true,
  })
  refundAmount!: number | null;

  @Column({ name: 'refund_breakdown', type: 'jsonb', nullable: true })
  refundBreakdown!: Record<string, unknown> | null;

  @Column({ name: 'bank_account', type: 'varchar', length: 50, nullable: true })
  bankAccount!: string | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true })
  bankName!: string | null;

  @Column({ name: 'bank_holder', type: 'varchar', length: 100, nullable: true })
  bankHolder!: string | null;

  @Column({
    name: 'tracking_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  trackingNumber!: string | null;

  @Column({ name: 'label_url', type: 'varchar', length: 500, nullable: true })
  labelUrl!: string | null;

  @Column({ name: 'reviewed_by', type: 'int', nullable: true })
  reviewedBy!: number | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'is_flagged_fraud', type: 'boolean', default: false })
  isFlaggedFraud!: boolean;

  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => ReturnItem, (item) => item.returnRequest, { cascade: true })
  items!: ReturnItem[];

  @OneToMany(() => RefundTransaction, (tx) => tx.returnRequest, {
    cascade: true,
  })
  refundTransactions!: RefundTransaction[];
}
