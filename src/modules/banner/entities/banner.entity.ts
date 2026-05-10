import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 200, default: '' })
  title!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  subtitle!: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 1000, nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'cta_text', type: 'varchar', length: 200, nullable: true })
  ctaText!: string | null;

  @Column({ name: 'cta_link', type: 'varchar', length: 500, nullable: true })
  ctaLink!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
