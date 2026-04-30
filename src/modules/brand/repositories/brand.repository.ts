import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../entities/brand.entity.js';

@Injectable()
export class BrandRepository {
  constructor(
    @InjectRepository(Brand)
    private readonly repo: Repository<Brand>,
  ) {}

  async findById(id: number): Promise<Brand | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Brand | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async findAll(): Promise<Brand[]> {
    return this.repo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async findActive(): Promise<Brand[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async create(data: Partial<Brand>): Promise<Brand> {
    const brand = this.repo.create(data);
    return this.repo.save(brand);
  }

  async update(id: number, data: Partial<Brand>): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.repo.count({ where: { slug } });
    return count > 0;
  }
}
