import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { ReturnService } from '../../services/return.service.js';
import {
  SubmitReturnDto,
  SelectRefundMethodDto,
} from '../../dtos/return.dto.js';

@Controller('returns')
export class ReturnController {
  constructor(private readonly returnService: ReturnService) {}

  @Post('submit')
  async submit(
    @CurrentUser('id') userId: number,
    @Body() dto: SubmitReturnDto,
  ) {
    return this.returnService.submit(userId, dto, {
      orderCode: `ORD${dto.orderId}`,
      status: 'delivered',
      items: [],
    });
  }

  @Get()
  async myReturns(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.returnService.findByUser(
      userId,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Get(':id')
  async findById(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const rr = await this.returnService.findById(id);
    if (rr.userId !== userId)
      throw new (await import('@nestjs/common')).ForbiddenException(
        'Not your return request',
      );
    return rr;
  }

  @Patch(':id/refund-method')
  async selectRefundMethod(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SelectRefundMethodDto,
  ) {
    return this.returnService.selectRefundMethod(id, userId, dto);
  }

  @Patch(':id/cancel')
  async cancel(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.returnService.cancel(id, userId);
    return { message: 'Return request cancelled' };
  }
}
