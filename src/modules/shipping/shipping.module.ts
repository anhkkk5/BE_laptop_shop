import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShippingOrder } from './entities/shipping-order.entity.js';
import { ShippingProviderConfig } from './entities/shipping-provider-config.entity.js';
import { ShippingTrackingHistory } from './entities/shipping-tracking-history.entity.js';
import { ShippingService } from './services/shipping.service.js';
import { ShippingController } from './controllers/client/shipping.controller.js';
import { ShippingAdminController } from './controllers/admin/shipping-admin.controller.js';
import { ShippingWebhookController } from './controllers/webhook/shipping-webhook.controller.js';
import { MockShippingAdapter } from './adapters/mock-shipping.adapter.js';
import { ShippingProvider } from './enums/shipping-provider.enum.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShippingOrder, ShippingProviderConfig, ShippingTrackingHistory]),
  ],
  controllers: [ShippingController, ShippingAdminController, ShippingWebhookController],
  providers: [ShippingService, MockShippingAdapter],
  exports: [ShippingService],
})
export class ShippingModule implements OnModuleInit {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly mockAdapter: MockShippingAdapter,
  ) {}

  onModuleInit() {
    this.shippingService.registerAdapter(ShippingProvider.GHN, this.mockAdapter);
    this.shippingService.registerAdapter(ShippingProvider.GHTK, this.mockAdapter);
    this.shippingService.registerAdapter(ShippingProvider.VIETTEL_POST, this.mockAdapter);
  }
}
