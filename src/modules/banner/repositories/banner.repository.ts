import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from '../entities/banner.entity.js';

@Injectable()
export class BannerRepository {
  constructor(
    @InjectRepository(Banner)
    private readonly repo: Repository<Banner>,
  ) {}

  async findAll(): Promise<Banner[]> {
    return this.repo.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  async findActive(): Promise<Banner[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async findById(id: number): Promise<Banner | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: Partial<Banner>): Promise<Banner> {
    const banner = this.repo.create(data);
    return this.repo.save(banner);
  }

  async update(id: number, data: Partial<Banner>): Promise<Banner | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
