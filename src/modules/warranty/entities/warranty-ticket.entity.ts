import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WarrantyTicketStatus {
  PENDING = 'pending',
  RECEIVED = 'received',
  DIAGNOSING = 'diagnosing',
  REPAIRING = 'repairing',
  WAITING_PARTS = 'waiting_parts',
  COMPLETED = 'completed',
  RETURNED = 'returned',
  REJECTED = 'rejected',
}

export enum WarrantyPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('warranty_tickets')
export class WarrantyTicket {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'ticket_code', type: 'varchar', length: 24, unique: true })
  ticketCode!: string;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'order_id', type: 'int' })
  orderId!: number;

  @Column({ name: 'order_item_id', type: 'int' })
  orderItemId!: number;

  @Column({ name: 'product_id', type: 'int' })
  productId!: number;

  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName!: string;

  @Column({
    type: 'enum',
    enum: WarrantyTicketStatus,
    default: WarrantyTicketStatus.PENDING,
  })
  status!: WarrantyTicketStatus;

  @Column({
    type: 'enum',
    enum: WarrantyPriority,
    default: WarrantyPriority.MEDIUM,
  })
  priority!: WarrantyPriority;

  @Column({ name: 'issue_description', type: 'text' })
  issueDescription!: string;

  @Column({ type: 'text', nullable: true })
  diagnosis!: string | null;

  @Column({ type: 'text', nullable: true })
  resolution!: string | null;

  @Column({ name: 'assigned_to', type: 'int', nullable: true })
  assignedTo!: number | null;

  @Column({ name: 'estimated_days', type: 'int', nullable: true })
  estimatedDays!: number | null;

  @Column({ name: 'received_at', type: 'datetime', nullable: true })
  receivedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'returned_at', type: 'datetime', nullable: true })
  returnedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
