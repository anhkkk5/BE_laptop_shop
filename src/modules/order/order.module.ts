import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { OrderRepository } from './repositories/order.repository.js';
import { OrderService } from './services/order.service.js';
import { OrderController } from './controllers/client/order.controller.js';
import { OrderAdminController } from './controllers/admin/order-admin.controller.js';
import { CartModule } from '../cart/cart.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem]), CartModule],
  controllers: [OrderController, OrderAdminController],
  providers: [OrderRepository, OrderService],
  exports: [OrderService],
})
export class OrderModule {}
