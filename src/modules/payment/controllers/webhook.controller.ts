import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentGatewayService } from '../services/payment-gateway.service.js';
import { PaymentService } from '../services/payment.service.js';
import { IdempotencyService } from '../services/idempotency.service.js';

@Controller('payments/webhook')
export class WebhookController {
  constructor(
    private readonly gatewayService: PaymentGatewayService,
    private readonly paymentService: PaymentService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Post('momo')
  @HttpCode(204)
  async momoWebhook(
    @Body() body: Record<string, string | number>,
    @Headers('x-momo-signature') signature: string,
  ) {
    const isValid = this.gatewayService.verifyMomoSignature(
      body,
      signature || '',
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    const idempotencyKey = `momo:${body.orderId || body.transId}`;
    const isNew = await this.idempotencyService.checkAndStore(
      idempotencyKey,
      600,
    );
    if (!isNew) {
      return;
    }

    const resultCode = Number(body.resultCode);
    const orderIdMatch = String(body.orderId).match(/ORD(\d+)_/);
    const orderId = orderIdMatch ? Number(orderIdMatch[1]) : 0;

    if (!orderId) return;

    if (resultCode === 0) {
      await this.paymentService.simulateSuccess(orderId);
    } else {
      await this.paymentService.simulateFailed(orderId);
    }
  }
}
