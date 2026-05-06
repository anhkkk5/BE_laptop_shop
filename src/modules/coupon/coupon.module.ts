import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartModule } from '../cart/cart.module.js';
import { ProductModule } from '../product/product.module.js';
import { CouponAdminController } from './controllers/admin/coupon-admin.controller.js';
import { CouponController } from './controllers/client/coupon.controller.js';
import { CouponCollection } from './entities/coupon-collection.entity.js';
import { CouponUsage } from './entities/coupon-usage.entity.js';
import { Coupon } from './entities/coupon.entity.js';
import { CouponService } from './services/coupon.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Coupon, CouponUsage, CouponCollection]),
    CartModule,
    ProductModule,
  ],
  controllers: [CouponAdminController, CouponController],
  providers: [CouponService],
  exports: [CouponService],
})
export class CouponModule {}
