import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductImage } from '../entities/product-image.entity.js';

@Injectable()
export class ProductImageRepository {
  constructor(
    @InjectRepository(ProductImage)
    private readonly repo: Repository<ProductImage>,
  ) {}

  async findByProductId(productId: number): Promise<ProductImage[]> {
    return this.repo.find({
      where: { productId },
      order: { isPrimary: 'DESC', sortOrder: 'ASC' },
    });
  }

  async create(data: Partial<ProductImage>): Promise<ProductImage> {
    const image = this.repo.create(data);
    return this.repo.save(image);
  }

  async createMany(images: Partial<ProductImage>[]): Promise<ProductImage[]> {
    const entities = this.repo.create(images);
    return this.repo.save(entities);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteByProductId(productId: number): Promise<void> {
    await this.repo.delete({ productId });
  }

  async resetPrimary(productId: number): Promise<void> {
    await this.repo.update({ productId }, { isPrimary: false });
  }
}
