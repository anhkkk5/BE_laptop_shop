import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('compatibility_rules')
export class CompatibilityRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'source_type', type: 'varchar', length: 50 })
  sourceType!: string;

  @Column({ name: 'target_type', type: 'varchar', length: 50 })
  targetType!: string;

  @Column({ name: 'source_spec_key', type: 'varchar', length: 100 })
  sourceSpecKey!: string;

  @Column({ name: 'target_spec_key', type: 'varchar', length: 100 })
  targetSpecKey!: string;

  @Column({ type: 'boolean', default: true })
  strict!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  message!: string | null;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
