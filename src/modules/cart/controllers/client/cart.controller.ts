import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { CartService } from '../../services/cart.service.js';
import { AddCartItemDto } from '../../dtos/add-cart-item.dto.js';
import { UpdateCartItemDto } from '../../dtos/update-cart-item.dto.js';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getMyCart(@CurrentUser('id') userId: number) {
    return this.cartService.getMyCart(userId);
  }

  @Post('items')
  async addItem(@CurrentUser('id') userId: number, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(userId, dto);
  }

  @Patch('items/:id')
  async updateItem(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(userId, itemId, dto);
  }

  @Delete('items/:id')
  async removeItem(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) itemId: number,
  ) {
    return this.cartService.removeItem(userId, itemId);
  }

  @Delete()
  async clearCart(@CurrentUser('id') userId: number) {
    return this.cartService.clearCart(userId);
  }
}
