import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../entities/wishlist.entity.js';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepo: Repository<Wishlist>,
  ) {}

  async getMyWishlist(userId: number) {
    return this.wishlistRepo.find({
      where: { userId },
      relations: ['product', 'product.images', 'product.brand'],
      order: { createdAt: 'DESC' },
    });
  }

  async addToWishlist(userId: number, productId: number) {
    const exists = await this.wishlistRepo.findOne({
      where: { userId, productId },
    });
    if (exists) {
      throw new ConflictException('Sản phẩm đã có trong danh sách yêu thích');
    }
    const item = this.wishlistRepo.create({ userId, productId });
    return this.wishlistRepo.save(item);
  }

  async removeFromWishlist(userId: number, productId: number) {
    await this.wishlistRepo.delete({ userId, productId });
    return { message: 'Đã xóa khỏi danh sách yêu thích' };
  }

  async isInWishlist(userId: number, productId: number): Promise<boolean> {
    const count = await this.wishlistRepo.count({
      where: { userId, productId },
    });
    return count > 0;
  }

  async countByUser(userId: number): Promise<number> {
    return this.wishlistRepo.count({ where: { userId } });
  }
}
