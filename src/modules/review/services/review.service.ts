import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderService } from '../../order/services/order.service.js';
import { UserRole } from '../../user/enums/user-role.enum.js';
import { CreateReviewDto } from '../dtos/create-review.dto.js';
import { QueryAdminReviewDto } from '../dtos/query-admin-review.dto.js';
import { UpdateReviewDto } from '../dtos/update-review.dto.js';
import { Review } from '../entities/review.entity.js';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    private readonly orderService: OrderService,
  ) {}

  private async ensureExists(reviewId: number): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  async getByProductId(productId: number, page: number, limit: number) {
    const [data, total] = await this.reviewRepo.findAndCount({
      where: { productId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const ratingSum = data.reduce((sum, item) => sum + Number(item.rating), 0);
    const averageRating =
      data.length > 0 ? Number((ratingSum / data.length).toFixed(2)) : 0;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        averageRating,
      },
    };
  }

  async findAll(query: QueryAdminReviewDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const keyword = query.search?.trim();

    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.rating) {
      qb.andWhere('review.rating = :rating', { rating: query.rating });
    }

    if (query.isVerified !== undefined) {
      qb.andWhere('review.isVerified = :isVerified', {
        isVerified: query.isVerified,
      });
    }

    if (keyword) {
      qb.andWhere(
        '(CAST(review.productId AS CHAR) LIKE :keyword OR CAST(review.userId AS CHAR) LIKE :keyword OR review.comment LIKE :keyword)',
        {
          keyword: `%${keyword}%`,
        },
      );
    }

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

  async getSummary() {
    const total = await this.reviewRepo.count();
    const verified = await this.reviewRepo.count({
      where: { isVerified: true },
    });

    const avgRaw = await this.reviewRepo
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avgRating')
      .getRawOne<{ avgRating: string | null }>();

    const ratingBucketsRaw = await this.reviewRepo
      .createQueryBuilder('review')
      .select('review.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .groupBy('review.rating')
      .getRawMany<{ rating: string; count: string }>();

    const byRating = ratingBucketsRaw.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.rating] = Number(item.count);
        return acc;
      },
      {},
    );

    return {
      total,
      verified,
      averageRating: Number(Number(avgRaw?.avgRating || 0).toFixed(2)),
      byRating: {
        1: byRating['1'] || 0,
        2: byRating['2'] || 0,
        3: byRating['3'] || 0,
        4: byRating['4'] || 0,
        5: byRating['5'] || 0,
      },
    };
  }

  async create(userId: number, dto: CreateReviewDto) {
    const order = await this.orderService.findMyOrderById(userId, dto.orderId);
    const orderItem = order.items.find((item) => item.id === dto.orderItemId);

    if (!orderItem) {
      throw new BadRequestException('Order item not found in this order');
    }

    const existing = await this.reviewRepo.findOne({
      where: { userId, orderItemId: dto.orderItemId },
    });

    if (existing) {
      throw new BadRequestException(
        'You have already reviewed this order item',
      );
    }

    const review = this.reviewRepo.create({
      productId: orderItem.productId,
      userId,
      orderItemId: dto.orderItemId,
      rating: dto.rating,
      comment: dto.comment || null,
      images: dto.images || null,
      isVerified: true,
    });

    return this.reviewRepo.save(review);
  }

  async update(reviewId: number, userId: number, dto: UpdateReviewDto) {
    const review = await this.ensureExists(reviewId);
    if (review.userId !== userId) {
      throw new ForbiddenException('You are not owner of this review');
    }

    if (dto.rating !== undefined) {
      review.rating = dto.rating;
    }

    if (dto.comment !== undefined) {
      review.comment = dto.comment;
    }

    if (dto.images !== undefined) {
      review.images = dto.images;
    }

    return this.reviewRepo.save(review);
  }

  async remove(reviewId: number, userId: number, role: UserRole) {
    const review = await this.ensureExists(reviewId);

    if (role !== UserRole.ADMIN && review.userId !== userId) {
      throw new ForbiddenException('You cannot delete this review');
    }

    await this.reviewRepo.delete(reviewId);
    return { deleted: true };
  }
}
