import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { UserRole } from '../../../user/enums/user-role.enum.js';
import { ShippingService } from '../../services/shipping.service.js';
import { CreateShippingOrderDto, BulkCreateShippingDto, CancelShippingDto } from '../../dtos/shipping.dto.js';

@Controller('admin/shipping')
@Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.WAREHOUSE)
export class ShippingAdminController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.shippingService.findAll(Number(page) || 1, Number(limit) || 20);
  }

  @Post('create')
  async create(@Body() dto: CreateShippingOrderDto) {
    return this.shippingService.createShippingOrder(dto);
  }

  @Post('bulk-create')
  async bulkCreate(@Body() dto: BulkCreateShippingDto) {
    return this.shippingService.bulkCreate(dto);
  }

  @Post(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelShippingDto) {
    await this.shippingService.cancelShippingOrder(id, dto.reason);
    return { message: 'Shipping order cancelled' };
  }

  @Get('analytics')
  async analytics(@Query('start') start: string, @Query('end') end: string) {
    return this.shippingService.getAnalytics(start, end);
  }

  @Post(':id/return')
  async createReturn(
    @Param('id', ParseIntPipe) id: number,
    @Body('orderId') orderId: number,
  ) {
    return this.shippingService.createReturn(orderId, id);
  }
}
