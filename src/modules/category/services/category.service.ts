import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CategoryRepository } from '../repositories/category.repository.js';
import { CreateCategoryDto } from '../dtos/create-category.dto.js';
import { UpdateCategoryDto } from '../dtos/update-category.dto.js';
import { Category } from '../entities/category.entity.js';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.findAll();
  }

  async findRoots(): Promise<Category[]> {
    return this.categoryRepository.findRoots();
  }

  async findActiveRoots(): Promise<Category[]> {
    return this.categoryRepository.findActiveRoots();
  }

  async findActive(): Promise<Category[]> {
    return this.categoryRepository.findActive();
  }

  async findById(id: number): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findBySlug(slug);
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const exists = await this.categoryRepository.existsBySlug(dto.slug);
    if (exists) throw new ConflictException('Category slug already exists');

    if (dto.parentId) {
      const parent = await this.categoryRepository.findById(dto.parentId);
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    return this.categoryRepository.create(dto);
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<void> {
    await this.findById(id);

    if (dto.slug) {
      const existing = await this.categoryRepository.findBySlug(dto.slug);
      if (existing && existing.id !== id) {
        throw new ConflictException('Category slug already exists');
      }
    }

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new ConflictException('Category cannot be its own parent');
      }
      const parent = await this.categoryRepository.findById(dto.parentId);
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    await this.categoryRepository.update(id, dto);
  }

  async delete(id: number): Promise<void> {
    const category = await this.findById(id);
    if (category.children && category.children.length > 0) {
      throw new ConflictException(
        'Cannot delete category with children. Remove children first.',
      );
    }
    await this.categoryRepository.delete(id);
  }
}
