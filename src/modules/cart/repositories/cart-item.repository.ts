import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from '../entities/cart-item.entity.js';

@Injectable()
export class CartItemRepository {
  constructor(
    @InjectRepository(CartItem)
    private readonly repo: Repository<CartItem>,
  ) {}

  async findById(id: number): Promise<CartItem | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByCartAndProduct(
    cartId: number,
    productId: number,
  ): Promise<CartItem | null> {
    return this.repo.findOne({ where: { cartId, productId } });
  }

  async create(data: Partial<CartItem>): Promise<CartItem> {
    const item = this.repo.create(data);
    return this.repo.save(item);
  }

  async update(id: number, data: Partial<CartItem>): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteByCartId(cartId: number): Promise<void> {
    await this.repo.delete({ cartId });
  }
}
