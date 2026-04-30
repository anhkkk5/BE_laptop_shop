import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity.js';
import { CartItem } from './entities/cart-item.entity.js';
import { CartRepository } from './repositories/cart.repository.js';
import { CartItemRepository } from './repositories/cart-item.repository.js';
import { CartService } from './services/cart.service.js';
import { CartController } from './controllers/client/cart.controller.js';
import { ProductModule } from '../product/product.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem]), ProductModule],
  controllers: [CartController],
  providers: [CartRepository, CartItemRepository, CartService],
  exports: [CartService],
})
export class CartModule {}
