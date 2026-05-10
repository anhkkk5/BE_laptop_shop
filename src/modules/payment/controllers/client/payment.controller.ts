import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  BadRequestException,
} from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { PaymentService } from '../../services/payment.service.js';
import { PaymentGatewayService } from '../../services/payment-gateway.service.js';
import { CreatePaymentDto } from '../../dtos/create-payment.dto.js';
import { PaymentMethod } from '../../entities/payment.entity.js';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly gatewayService: PaymentGatewayService,
  ) {}

  /**
   * Tạo payment.
   * - COD: trả về { payment }
   * - SePay: trả về { payment, sepayQr: { qrUrl, accountNo, bankCode, accountName, amount, transferCode, description } }
   */
  @Post('create')
  async createPayment(
    @CurrentUser('id') userId: number,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentService.create(userId, dto);
  }

  /** Lấy trạng thái payment */
  @Get(':orderId/status')
  async getStatus(
    @CurrentUser('id') userId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.paymentService.getMyPaymentStatus(userId, orderId);
  }

  /** Lấy thông tin QR SePay (dùng khi vào lại trang thanh toán) */
  @Get(':orderId/sepay-qr')
  async getSepayQR(
    @CurrentUser('id') userId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    const payment = await this.paymentService.getMyPaymentStatus(
      userId,
      orderId,
    );
    if (payment.method !== PaymentMethod.SEPAY) {
      throw new BadRequestException('Đơn hàng này không sử dụng SePay');
    }
    return this.gatewayService.generateSepayQR(orderId, Number(payment.amount));
  }
}
