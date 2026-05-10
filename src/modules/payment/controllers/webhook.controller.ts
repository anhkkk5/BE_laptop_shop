import { Body, Controller, Headers, HttpCode, Logger, Post } from '@nestjs/common';
import { PaymentGatewayService } from '../services/payment-gateway.service.js';
import { PaymentService } from '../services/payment.service.js';
import { IdempotencyService } from '../services/idempotency.service.js';

interface SepayWebhookBody {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  code: string | null;
  content: string;
  transferType: string;
  transferAmount: number;
  accumulated: number;
  subAccount: string | null;
  referenceCode: string;
  description: string;
}

@Controller('payments/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly gatewayService: PaymentGatewayService,
    private readonly paymentService: PaymentService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Post('sepay')
  @HttpCode(200)
  async sepayWebhook(
    @Body() body: SepayWebhookBody,
    @Headers('authorization') authorization: string,
  ) {
    if (!this.gatewayService.verifySepayWebhook(authorization ?? '')) {
      this.logger.warn('SePay webhook: invalid API key');
      return { success: false, message: 'Unauthorized' };
    }

    // Chỉ xử lý giao dịch tiền vào
    if (body.transferType !== 'in') {
      return { success: true, message: 'Ignored' };
    }

    const idempotencyKey = `sepay:${body.referenceCode ?? body.id}`;
    const isNew = await this.idempotencyService.checkAndStore(
      idempotencyKey,
      600,
    );
    if (!isNew) {
      return { success: true, message: 'Already processed' };
    }

    // Tìm orderId từ nội dung chuyển khoản: "SHOP123" hoặc trong content
    const searchIn = `${body.code ?? ''} ${body.content ?? ''}`;
    const match = searchIn.match(/SHOP(\d+)/i);
    const orderId = match ? Number(match[1]) : 0;

    if (!orderId) {
      this.logger.log(
        `SePay webhook: no matching order in content="${body.content}"`,
      );
      return { success: true, message: 'No matching order' };
    }

    try {
      await this.paymentService.processSepayWebhook(
        orderId,
        Number(body.transferAmount),
        body.referenceCode ?? String(body.id),
      );
    } catch (err) {
      this.logger.error(
        `SePay webhook error for orderId=${orderId}`,
        err,
      );
    }

    return { success: true, message: 'OK' };
  }
}
