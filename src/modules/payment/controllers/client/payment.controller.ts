import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { PaymentService } from '../../services/payment.service.js';
import { CreatePaymentDto } from '../../dtos/create-payment.dto.js';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

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
}
