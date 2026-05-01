import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderModule } from '../order/order.module.js';
import { Review } from './entities/review.entity.js';
import { ReviewService } from './services/review.service.js';
import { ReviewController } from './controllers/client/review.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Review]), OrderModule],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
