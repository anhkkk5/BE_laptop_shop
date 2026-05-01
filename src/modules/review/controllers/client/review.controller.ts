import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { PaginationDto } from '../../../../common/dto/pagination.dto.js';
import { UserRole } from '../../../user/enums/user-role.enum.js';
import { CreateReviewDto } from '../../dtos/create-review.dto.js';
import { UpdateReviewDto } from '../../dtos/update-review.dto.js';
import { ReviewService } from '../../services/review.service.js';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('product/:productId')
  async findByProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.reviewService.getByProductId(
      productId,
      pagination.page,
      pagination.limit,
    );
  }

  @Post()
  async create(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.create(userId, dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) reviewId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewService.update(reviewId, userId, dto);
  }

  @Delete(':id')
  async deleteReview(
    @Param('id', ParseIntPipe) reviewId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.reviewService.remove(reviewId, userId, role);
  }
}
