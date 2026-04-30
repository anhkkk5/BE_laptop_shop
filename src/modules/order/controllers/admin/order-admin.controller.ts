import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { PaginationDto } from '../../../../common/dto/pagination.dto.js';
import { UserRole } from '../../../user/enums/user-role.enum.js';
import { OrderService } from '../../services/order.service.js';
import { UpdateOrderStatusDto } from '../../dtos/update-order-status.dto.js';

@Controller('admin/orders')
@Roles(UserRole.ADMIN)
export class OrderAdminController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  async findAll(@Query() pagination: PaginationDto) {
    return this.orderService.findAll(pagination.page, pagination.limit);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) orderId: number) {
    return this.orderService.findById(orderId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    await this.orderService.updateStatus(orderId, dto);
    return { message: 'Order status updated successfully' };
  }
}
