import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('webhooks/shipping')
@SkipThrottle()
export class ShippingWebhookController {
  private readonly logger = new Logger(ShippingWebhookController.name);

  @Post()
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Headers('x-webhook-signature') signature: string,
    @Body() body: Record<string, unknown>,
  ) {
    this.logger.log(`Webhook received: ${JSON.stringify(body)}`);

    if (!signature) {
      this.logger.warn('Missing webhook signature');
      return { received: true };
    }

    const trackingNumber =
      typeof body.tracking_number === 'string' ? body.tracking_number : null;
    const providerStatus = typeof body.status === 'string' ? body.status : null;

    if (trackingNumber && providerStatus) {
      this.logger.log(
        `Tracking update: ${trackingNumber} -> ${providerStatus}`,
      );
    }

    return { received: true };
  }
}
