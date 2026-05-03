import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BannerPosition } from '../enums/banner-position.enum';
import { BannerStatus } from '../enums/banner-status.enum';
import { BannerType } from '../enums/banner-type.enum';

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 500 })
  imageUrl!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  mobileImageUrl!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  linkUrl!: string | null;

  @Column({ type: 'enum', enum: BannerPosition, default: BannerPosition.HERO })
  position!: BannerPosition;

  @Column({ type: 'enum', enum: BannerType, default: BannerType.IMAGE })
  type!: BannerType;

  @Column({ type: 'enum', enum: BannerStatus, default: BannerStatus.INACTIVE })
  status!: BannerStatus;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'click_count', type: 'int', default: 0 })
  clickCount!: number;

  @Column({ name: 'impression_count', type: 'int', default: 0 })
  impressionCount!: number;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate!: Date | null;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
