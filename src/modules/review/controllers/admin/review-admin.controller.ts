import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { UserRole } from '../../../user/enums/user-role.enum.js';
import { ReviewService } from '../../services/review.service.js';
import { QueryAdminReviewDto } from '../../dtos/query-admin-review.dto.js';

@Controller('admin/reviews')
@Roles(UserRole.ADMIN)
export class ReviewAdminController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('summary')
  async getSummary() {
    return this.reviewService.getSummary();
  }

  @Get()
  async findAll(@Query() query: QueryAdminReviewDto) {
    return this.reviewService.findAll(query);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) reviewId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.reviewService.remove(reviewId, userId, role);
  }
}
