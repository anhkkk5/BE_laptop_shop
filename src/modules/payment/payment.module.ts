import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity.js';
import { PaymentRepository } from './repositories/payment.repository.js';
import { PaymentService } from './services/payment.service.js';
import { PaymentController } from './controllers/client/payment.controller.js';
import { PaymentAdminController } from './controllers/admin/payment-admin.controller.js';
import { OrderModule } from '../order/order.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), OrderModule],
  controllers: [PaymentController, PaymentAdminController],
  providers: [PaymentRepository, PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
