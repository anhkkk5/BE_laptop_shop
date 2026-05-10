import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant } from '../entities/product-variant.entity.js';

@Injectable()
export class ProductVariantRepository {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly repo: Repository<ProductVariant>,
  ) {}

  async findByProductId(productId: number): Promise<ProductVariant[]> {
    return this.repo.find({
      where: { productId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findById(id: number): Promise<ProductVariant | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findActiveByProductId(productId: number): Promise<ProductVariant[]> {
    return this.repo.find({
      where: { productId, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async create(data: Partial<ProductVariant>): Promise<ProductVariant> {
    const variant = this.repo.create(data);
    return this.repo.save(variant);
  }

  async update(id: number, data: Partial<ProductVariant>): Promise<ProductVariant | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async decreaseStockIfEnough(id: number, quantity: number): Promise<boolean> {
    const result = await this.repo
      .createQueryBuilder()
      .update(ProductVariant)
      .set({ stockQuantity: () => `stock_quantity - ${quantity}` })
      .where('id = :id', { id })
      .andWhere('stock_quantity >= :quantity', { quantity })
      .execute();
    return (result.affected || 0) > 0;
  }

  async increaseStock(id: number, quantity: number): Promise<void> {
    await this.repo.increment({ id }, 'stockQuantity', quantity);
  }
}
