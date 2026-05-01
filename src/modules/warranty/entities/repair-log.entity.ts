import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('repair_logs')
export class RepairLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'ticket_id', type: 'int' })
  ticketId!: number;

  @Column({ type: 'varchar', length: 50 })
  status!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'performed_by', type: 'int' })
  performedBy!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
