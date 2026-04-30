import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ProductRepository } from '../repositories/product.repository.js';
import { ProductImageRepository } from '../repositories/product-image.repository.js';
import { CreateProductDto } from '../dtos/create-product.dto.js';
import { UpdateProductDto } from '../dtos/update-product.dto.js';
import { QueryProductDto } from '../dtos/query-product.dto.js';
import { Product } from '../entities/product.entity.js';

@Injectable()
export class ProductService {
  private static readonly LOW_STOCK_THRESHOLD = 5;

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productImageRepository: ProductImageRepository,
  ) {}

  async findAll(query: QueryProductDto) {
    return this.productRepository.findWithQuery(query);
  }

  async findActive(query: QueryProductDto) {
    return this.productRepository.findActiveWithQuery(query);
  }

  async findFeatured(limit?: number) {
    return this.productRepository.findFeatured(limit);
  }

  async findById(id: number): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productRepository.findBySlug(slug);
    if (!product) throw new NotFoundException('Product not found');
    await this.productRepository.incrementViewCount(product.id);
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const exists = await this.productRepository.existsBySlug(dto.slug);
    if (exists) throw new ConflictException('Product slug already exists');

    const { images, ...productData } = dto;

    const product = await this.productRepository.create(productData);

    if (images && images.length > 0) {
      const imageEntities = images.map((img) => ({
        ...img,
        productId: product.id,
      }));
      product.images =
        await this.productImageRepository.createMany(imageEntities);
    }

    return product;
  }

  async update(id: number, dto: UpdateProductDto): Promise<void> {
    await this.findById(id);

    if (dto.slug) {
      const existing = await this.productRepository.findBySlug(dto.slug);
      if (existing && existing.id !== id) {
        throw new ConflictException('Product slug already exists');
      }
    }

    const { images, ...productData } = dto;

    if (Object.keys(productData).length > 0) {
      await this.productRepository.update(id, productData);
    }

    if (images !== undefined) {
      await this.productImageRepository.deleteByProductId(id);
      if (images.length > 0) {
        const imageEntities = images.map((img) => ({
          ...img,
          productId: id,
        }));
        await this.productImageRepository.createMany(imageEntities);
      }
    }
  }

  async delete(id: number): Promise<void> {
    await this.findById(id);
    await this.productRepository.delete(id);
  }

  async decreaseStockIfEnough(id: number, quantity: number): Promise<boolean> {
    return this.productRepository.decreaseStockIfEnough(id, quantity);
  }

  async increaseStock(id: number, quantity: number): Promise<void> {
    await this.productRepository.increaseStock(id, quantity);
  }

  async getInventorySummary() {
    return this.productRepository.getInventorySummary(
      ProductService.LOW_STOCK_THRESHOLD,
    );
  }
}
