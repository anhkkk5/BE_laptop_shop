import { Body, Controller, Headers, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ShippingService } from '../../services/shipping.service.js';

@Controller('webhooks/shipping')
@SkipThrottle()
export class ShippingWebhookController {
  private readonly logger = new Logger(ShippingWebhookController.name);

  constructor(private readonly shippingService: ShippingService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Headers('x-webhook-signature') signature: string, @Body() body: Record<string, unknown>) {
    this.logger.log(`Webhook received: ${JSON.stringify(body)}`);

    if (!signature) {
      this.logger.warn('Missing webhook signature');
      return { received: true };
    }

    const { tracking_number: trackingNumber, status: providerStatus, timestamp } = body;

    if (trackingNumber && providerStatus) {
      this.logger.log(`Tracking update: ${trackingNumber} -> ${providerStatus}`);
    }

    return { received: true };
  }
}
