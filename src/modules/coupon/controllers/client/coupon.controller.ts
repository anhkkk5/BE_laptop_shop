import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { ValidateCouponDto } from '../../dtos/validate-coupon.dto.js';
import { CouponService } from '../../services/coupon.service.js';

@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Get('active')
  async findActive(@CurrentUser('id') userId: number) {
    return this.couponService.findActiveForCustomer(userId);
  }

  @Post('collect/:id')
  async collect(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) couponId: number,
  ) {
    await this.couponService.collectCoupon(userId, couponId);
    return { message: 'Coupon collected successfully' };
  }

  @Get('my-collection')
  async myCollection(@CurrentUser('id') userId: number) {
    return this.couponService.getMyCollection(userId);
  }

  @Get('best-for-cart')
  async bestForCart(@CurrentUser('id') userId: number) {
    return this.couponService.getBestForCart(userId);
  }

  @Post('validate')
  async validateMyCart(
    @CurrentUser('id') userId: number,
    @Body() dto: ValidateCouponDto,
  ) {
    return this.couponService.validateForMyCart(userId, dto.code);
  }
}
