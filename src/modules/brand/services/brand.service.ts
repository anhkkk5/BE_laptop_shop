import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { BrandRepository } from '../repositories/brand.repository.js';
import { CreateBrandDto } from '../dtos/create-brand.dto.js';
import { UpdateBrandDto } from '../dtos/update-brand.dto.js';
import { Brand } from '../entities/brand.entity.js';

@Injectable()
export class BrandService {
  constructor(private readonly brandRepository: BrandRepository) {}

  async findAll(): Promise<Brand[]> {
    return this.brandRepository.findAll();
  }

  async findActive(): Promise<Brand[]> {
    return this.brandRepository.findActive();
  }

  async findById(id: number): Promise<Brand> {
    const brand = await this.brandRepository.findById(id);
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async findBySlug(slug: string): Promise<Brand> {
    const brand = await this.brandRepository.findBySlug(slug);
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async create(dto: CreateBrandDto): Promise<Brand> {
    const exists = await this.brandRepository.existsBySlug(dto.slug);
    if (exists) throw new ConflictException('Brand slug already exists');
    return this.brandRepository.create(dto);
  }

  async update(id: number, dto: UpdateBrandDto): Promise<void> {
    await this.findById(id);

    if (dto.slug) {
      const existing = await this.brandRepository.findBySlug(dto.slug);
      if (existing && existing.id !== id) {
        throw new ConflictException('Brand slug already exists');
      }
    }

    await this.brandRepository.update(id, dto);
  }

  async delete(id: number): Promise<void> {
    await this.findById(id);
    await this.brandRepository.delete(id);
  }
}
