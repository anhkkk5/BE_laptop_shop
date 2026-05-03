import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  Body,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/index.js';
import { WishlistService } from '../services/wishlist.service.js';
import { AddWishlistDto } from '../dto/wishlist-item.dto.js';

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  async getMyWishlist(@CurrentUser('id') userId: number) {
    return this.wishlistService.getMyWishlist(userId);
  }

  @Post()
  async addToWishlist(
    @CurrentUser('id') userId: number,
    @Body() dto: AddWishlistDto,
  ) {
    return this.wishlistService.addToWishlist(userId, dto.productId);
  }

  @Delete(':productId')
  async removeFromWishlist(
    @CurrentUser('id') userId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.wishlistService.removeFromWishlist(userId, productId);
  }

  @Get('check/:productId')
  async checkWishlist(
    @CurrentUser('id') userId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    const inWishlist = await this.wishlistService.isInWishlist(userId, productId);
    return { inWishlist };
  }

  @Get('count')
  async countWishlist(@CurrentUser('id') userId: number) {
    const count = await this.wishlistService.countByUser(userId);
    return { count };
  }
}
