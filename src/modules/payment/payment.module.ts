import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Payment } from './entities/payment.entity.js';
import { PaymentRepository } from './repositories/payment.repository.js';
import { PaymentService } from './services/payment.service.js';
import { PaymentGatewayService } from './services/payment-gateway.service.js';
import { IdempotencyService } from './services/idempotency.service.js';
import { PaymentController } from './controllers/client/payment.controller.js';
import { PaymentAdminController } from './controllers/admin/payment-admin.controller.js';
import { WebhookController } from './controllers/webhook.controller.js';
import { OrderModule } from '../order/order.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    HttpModule,
    OrderModule,
    InventoryModule,
  ],
  controllers: [PaymentController, PaymentAdminController, WebhookController],
  providers: [
    PaymentRepository,
    PaymentService,
    PaymentGatewayService,
    IdempotencyService,
  ],
  exports: [PaymentService, PaymentGatewayService, IdempotencyService],
})
export class PaymentModule {}
