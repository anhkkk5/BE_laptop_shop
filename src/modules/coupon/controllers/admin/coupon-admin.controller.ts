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
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { UserRole } from '../../../../common/constants/index.js';
import { CreateCouponDto } from '../../dtos/create-coupon.dto.js';
import { QueryCouponDto } from '../../dtos/query-coupon.dto.js';
import { UpdateCouponDto } from '../../dtos/update-coupon.dto.js';
import { CouponService } from '../../services/coupon.service.js';

@Controller('admin/coupons')
@Roles(UserRole.ADMIN, UserRole.STAFF)
export class CouponAdminController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  async create(
    @CurrentUser('id') actorId: number,
    @Body() dto: CreateCouponDto,
  ) {
    return this.couponService.create(dto, actorId);
  }

  @Get()
  async findAll(@Query() query: QueryCouponDto) {
    return this.couponService.findAll(query);
  }

  @Get('analytics')
  async analytics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.couponService.getAnalytics(dateFrom, dateTo);
  }

  @Post('expire-overdue')
  async expireOverdue() {
    const count = await this.couponService.expireOverdueCoupons();
    return { message: `${count} coupons expired`, count };
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.couponService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponService.update(id, dto);
  }

  @Delete(':id')
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    await this.couponService.deactivate(id);
    return { message: 'Coupon deactivated successfully' };
  }
}
