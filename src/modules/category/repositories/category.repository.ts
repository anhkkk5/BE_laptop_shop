import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from '../entities/category.entity.js';

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  async findById(id: number): Promise<Category | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['children', 'parent'],
    });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.repo.findOne({ where: { slug }, relations: ['children'] });
  }

  async findAll(): Promise<Category[]> {
    return this.repo.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
      relations: ['children'],
    });
  }

  async findRoots(): Promise<Category[]> {
    return this.repo.find({
      where: { parentId: IsNull() },
      order: { sortOrder: 'ASC', name: 'ASC' },
      relations: ['children'],
    });
  }

  async findActive(): Promise<Category[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
      relations: ['children'],
    });
  }

  async findActiveRoots(): Promise<Category[]> {
    return this.repo.find({
      where: { parentId: IsNull(), isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
      relations: ['children'],
    });
  }

  async create(data: Partial<Category>): Promise<Category> {
    const category = this.repo.create(data);
    return this.repo.save(category);
  }

  async update(id: number, data: Partial<Category>): Promise<void> {
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
