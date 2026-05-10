import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ProductRepository } from '../repositories/product.repository.js';
import { ProductImageRepository } from '../repositories/product-image.repository.js';
import { ProductVariantRepository } from '../repositories/product-variant.repository.js';
import { CreateProductDto } from '../dtos/create-product.dto.js';
import { UpdateProductDto } from '../dtos/update-product.dto.js';
import { QueryProductDto } from '../dtos/query-product.dto.js';
import { CreateProductVariantDto } from '../dtos/create-product-variant.dto.js';
import { Product } from '../entities/product.entity.js';
import { ProductVariant } from '../entities/product-variant.entity.js';

@Injectable()
export class ProductService {
  private static readonly LOW_STOCK_THRESHOLD = 5;

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productImageRepository: ProductImageRepository,
    private readonly productVariantRepository: ProductVariantRepository,
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

  async updateRatingStats(productId: number): Promise<void> {
    await this.productRepository.updateRatingStats(productId);
  }

  async incrementSoldCount(id: number, quantity: number): Promise<void> {
    await this.productRepository.incrementSoldCount(id, quantity);
  }

  async getInventorySummary(lowStockThreshold?: number) {
    const threshold =
      typeof lowStockThreshold === 'number' &&
      Number.isInteger(lowStockThreshold) &&
      lowStockThreshold > 0
        ? lowStockThreshold
        : ProductService.LOW_STOCK_THRESHOLD;

    return this.productRepository.getInventorySummary(threshold);
  }

  // ─── Variant methods ────────────────────────────────────────────────────────

  async getVariants(productId: number): Promise<ProductVariant[]> {
    await this.findById(productId);
    return this.productVariantRepository.findByProductId(productId);
  }

  async getVariantById(variantId: number): Promise<ProductVariant | null> {
    return this.productVariantRepository.findById(variantId);
  }

  async createVariant(
    productId: number,
    dto: CreateProductVariantDto,
  ): Promise<ProductVariant> {
    await this.findById(productId);
    return this.productVariantRepository.create({ ...dto, productId });
  }

  async updateVariant(
    productId: number,
    variantId: number,
    dto: Partial<CreateProductVariantDto>,
  ): Promise<ProductVariant> {
    await this.findById(productId);
    const variant = await this.productVariantRepository.findById(variantId);
    if (!variant || variant.productId !== productId) {
      throw new NotFoundException('Variant not found');
    }
    const updated = await this.productVariantRepository.update(variantId, dto);
    return updated!;
  }

  async deleteVariant(productId: number, variantId: number): Promise<void> {
    await this.findById(productId);
    const variant = await this.productVariantRepository.findById(variantId);
    if (!variant || variant.productId !== productId) {
      throw new NotFoundException('Variant not found');
    }
    await this.productVariantRepository.delete(variantId);
  }

  async decreaseVariantStockIfEnough(
    variantId: number,
    quantity: number,
  ): Promise<boolean> {
    return this.productVariantRepository.decreaseStockIfEnough(
      variantId,
      quantity,
    );
  }

  async increaseVariantStock(
    variantId: number,
    quantity: number,
  ): Promise<void> {
    await this.productVariantRepository.increaseStock(variantId, quantity);
  }
}
