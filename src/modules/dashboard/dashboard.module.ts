import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../order/entities/order.entity.js';
import { OrderItem } from '../order/entities/order-item.entity.js';
import { Payment } from '../payment/entities/payment.entity.js';
import { Product } from '../product/entities/product.entity.js';
import { WarrantyTicket } from '../warranty/entities/warranty-ticket.entity.js';
import { DashboardController } from './controllers/dashboard.controller.js';
import { DashboardService } from './services/dashboard.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Payment, Product, WarrantyTicket]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
