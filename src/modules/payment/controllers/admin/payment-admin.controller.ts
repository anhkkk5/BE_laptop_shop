import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { UserRole } from '../../../user/enums/user-role.enum.js';
import { PaymentService } from '../../services/payment.service.js';

@Controller('admin/payments')
@Roles(UserRole.ADMIN)
export class PaymentAdminController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get(':orderId')
  async getByOrderId(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentService.getByOrderId(orderId);
  }

  @Post('simulate/:orderId/success')
  async simulateSuccess(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentService.simulateSuccess(orderId);
  }

  @Post('simulate/:orderId/failed')
  async simulateFailed(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentService.simulateFailed(orderId);
  }
}
