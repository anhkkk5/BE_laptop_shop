import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, Repository } from 'typeorm';
import { Product, ProductStatus } from '../entities/product.entity.js';
import { QueryProductDto } from '../dtos/query-product.dto.js';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  async findById(id: number): Promise<Product | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['category', 'brand', 'images'],
    });
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return this.repo.findOne({
      where: { slug },
      relations: ['category', 'brand', 'images'],
    });
  }

  async findWithQuery(query: QueryProductDto) {
    const qb = this.repo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.images', 'images');

    if (query.search) {
      qb.andWhere(
        '(product.name LIKE :search OR product.shortDescription LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.brandId) {
      qb.andWhere('product.brandId = :brandId', { brandId: query.brandId });
    }

    if (query.status) {
      qb.andWhere('product.status = :status', { status: query.status });
    }

    if (query.minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice: query.minPrice });
    }

    if (query.maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    const allowedSort = [
      'price',
      'name',
      'createdAt',
      'viewCount',
      'sortOrder',
    ];
    const sortBy = allowedSort.includes(query.sortBy || '')
      ? query.sortBy!
      : 'createdAt';
    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(`product.${sortBy}`, sortOrder);

    const page = query.page || 1;
    const limit = query.limit || 12;
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findActiveWithQuery(query: QueryProductDto) {
    query.status = ProductStatus.ACTIVE;
    return this.findWithQuery(query);
  }

  async findFeatured(limit: number = 8): Promise<Product[]> {
    return this.repo.find({
      where: { isFeatured: true, status: ProductStatus.ACTIVE },
      relations: ['category', 'brand', 'images'],
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      take: limit,
    });
  }

  async create(data: Partial<Product>): Promise<Product> {
    const product = this.repo.create(data);
    return this.repo.save(product);
  }

  async save(product: Product): Promise<Product> {
    return this.repo.save(product);
  }

  async update(id: number, data: Partial<Product>): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.repo.count({ where: { slug } });
    return count > 0;
  }

  async incrementViewCount(id: number): Promise<void> {
    await this.repo.increment({ id }, 'viewCount', 1);
  }

  async decreaseStockIfEnough(id: number, quantity: number): Promise<boolean> {
    const result = await this.repo
      .createQueryBuilder()
      .update(Product)
      .set({
        stockQuantity: () => `stock_quantity - ${quantity}`,
      })
      .where('id = :id', { id })
      .andWhere('stock_quantity >= :quantity', { quantity })
      .execute();

    return (result.affected || 0) > 0;
  }

  async increaseStock(id: number, quantity: number): Promise<void> {
    await this.repo.increment({ id }, 'stockQuantity', quantity);
  }

  async updateRatingStats(productId: number): Promise<void> {
    const result = await this.repo
      .createQueryBuilder()
      .select('COUNT(*)', 'reviewCount')
      .addSelect('COALESCE(AVG(review.rating), 0)', 'ratingAvg')
      .from('reviews', 'review')
      .where('review.product_id = :productId', { productId })
      .getRawOne<{ reviewCount: string; ratingAvg: string }>();

    await this.repo.update(productId, {
      reviewCount: Number(result?.reviewCount || 0),
      ratingAvg: Number(Number(result?.ratingAvg || 0).toFixed(2)),
    });
  }

  async incrementSoldCount(id: number, quantity: number): Promise<void> {
    await this.repo.increment({ id }, 'soldCount', quantity);
  }

  async getInventorySummary(lowStockThreshold: number) {
    const [totalProducts, outOfStock, lowStock] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { stockQuantity: LessThanOrEqual(0) } }),
      this.repo.count({
        where: {
          stockQuantity: Between(1, lowStockThreshold),
        },
      }),
    ]);

    const totalAlerts = outOfStock + lowStock;
    const outOfStockRate =
      totalProducts > 0 ? Math.round((outOfStock / totalProducts) * 100) : 0;
    const lowStockRate =
      totalProducts > 0 ? Math.round((lowStock / totalProducts) * 100) : 0;
    const alertRate =
      totalProducts > 0 ? Math.round((totalAlerts / totalProducts) * 100) : 0;

    return {
      totalProducts,
      outOfStock,
      lowStock,
      totalAlerts,
      outOfStockRate,
      lowStockRate,
      alertRate,
      lowStockThreshold,
      generatedAt: new Date().toISOString(),
    };
  }
}
