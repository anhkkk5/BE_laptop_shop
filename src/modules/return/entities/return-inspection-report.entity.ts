import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReturnRequest } from './return-request.entity.js';
import { InspectionCondition, RefundType } from '../enums/return.enum.js';

@Entity('return_inspection_reports')
export class ReturnInspectionReport {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'return_request_id', type: 'int' })
  returnRequestId!: number;

  @Column({ name: 'inspected_by', type: 'int' })
  inspectedBy!: number;

  @Column({ type: 'enum', enum: InspectionCondition })
  condition!: InspectionCondition;

  @Column({ type: 'enum', enum: RefundType })
  refundType!: RefundType;

  @Column({
    name: 'deduction_amount',
    type: 'decimal',
    precision: 15,
    scale: 0,
    default: 0,
  })
  deductionAmount!: number;

  @Column({ name: 'deduction_reason', type: 'text', nullable: true })
  deductionReason!: string | null;

  @Column({ name: 'inspection_notes', type: 'text' })
  inspectionNotes!: string;

  @Column({ name: 'inspection_photos', type: 'simple-array', nullable: true })
  inspectionPhotos!: string[] | null;

  @Column({ name: 'is_fraud', type: 'boolean', default: false })
  isFraud!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => ReturnRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'return_request_id' })
  returnRequest!: ReturnRequest;
}
