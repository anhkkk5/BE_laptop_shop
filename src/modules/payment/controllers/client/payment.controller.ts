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

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly gatewayService: PaymentGatewayService,
  ) {}

  @Post('create')
  async createPayment(
    @CurrentUser('id') userId: number,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentService.create(userId, dto);
  }

  @Get(':orderId/status')
  async getStatus(
    @CurrentUser('id') userId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.paymentService.getMyPaymentStatus(userId, orderId);
  }

  @Get(':orderId/vietqr')
  async getVietQR(
    @CurrentUser('id') userId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    const payment = await this.paymentService.getMyPaymentStatus(
      userId,
      orderId,
    );
    const qrData = this.gatewayService.generateVietQR(
      Number(payment.amount),
      `Thanh toan don hang ${orderId}`,
    );
    return qrData;
  }

  @Post(':orderId/momo')
  async createMomo(
    @CurrentUser('id') userId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    const payment = await this.paymentService.getMyPaymentStatus(
      userId,
      orderId,
    );
    const momoResponse = await this.gatewayService.createMomoPayment(
      orderId,
      Number(payment.amount),
      `Thanh toán đơn hàng ${orderId}`,
    );
    if (momoResponse.resultCode !== 0) {
      throw new BadRequestException(momoResponse.message);
    }
    return momoResponse;
  }
}
