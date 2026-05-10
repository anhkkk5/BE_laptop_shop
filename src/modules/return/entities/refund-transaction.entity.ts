import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReturnRequest } from './return-request.entity.js';
import { RefundStatus } from '../enums/return.enum.js';

@Entity('refund_transactions')
export class RefundTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'return_request_id', type: 'int' })
  returnRequestId!: number;

  @Column({
    name: 'transaction_ref',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  transactionRef!: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 0 })
  amount!: number;

  @Column({ type: 'varchar', length: 50 })
  method!: string;

  @Column({ type: 'enum', enum: RefundStatus, default: RefundStatus.PENDING })
  status!: RefundStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => ReturnRequest, (rr) => rr.refundTransactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'return_request_id' })
  returnRequest!: ReturnRequest;
}
