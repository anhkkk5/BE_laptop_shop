import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Patch,
} from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { PaginationDto } from '../../../../common/dto/pagination.dto.js';
import { OrderService } from '../../services/order.service.js';
import { CreateOrderDto } from '../../dtos/create-order.dto.js';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async create(@CurrentUser('id') userId: number, @Body() dto: CreateOrderDto) {
    return this.orderService.createFromCart(userId, dto);
  }

  @Get()
  async findMyOrders(
    @CurrentUser('id') userId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.orderService.findMyOrders(userId, pagination.page, pagination.limit);
  }

  @Get(':id')
  async findMyOrder(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.orderService.findMyOrderById(userId, orderId);
  }

  @Patch(':id/cancel')
  async cancelMyOrder(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    await this.orderService.cancelMyOrder(userId, orderId);
    return { message: 'Order cancelled successfully' };
  }
}
