import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { ShippingService } from '../../services/shipping.service.js';
import { CalculateShippingFeeDto, ValidateAddressDto } from '../../dtos/shipping.dto.js';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post('calculate-fee')
  async calculateFee(@Body() dto: CalculateShippingFeeDto) {
    return this.shippingService.calculateFee(dto);
  }

  @Post('validate-address')
  async validateAddress(@Body() dto: ValidateAddressDto) {
    return this.shippingService.validateAddress(dto);
  }

  @Get('track/:shippingOrderId')
  async track(@Param('shippingOrderId', ParseIntPipe) shippingOrderId: number) {
    return this.shippingService.getTracking(shippingOrderId);
  }

  @Get('order/:orderId')
  async getByOrderId(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.shippingService.findByOrderId(orderId);
  }
}
