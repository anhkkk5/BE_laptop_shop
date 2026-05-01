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
    const averageRating = data.length > 0 ? Number((ratingSum / data.length).toFixed(2)) : 0;

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
      throw new BadRequestException('You have already reviewed this order item');
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
