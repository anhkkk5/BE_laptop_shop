import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../entities/cart.entity.js';

@Injectable()
export class CartRepository {
  constructor(
    @InjectRepository(Cart)
    private readonly repo: Repository<Cart>,
  ) {}

  async findByUserId(userId: number): Promise<Cart | null> {
    return this.repo.findOne({
      where: { userId },
      relations: ['items'],
      order: { items: { createdAt: 'DESC' } },
    });
  }

  async create(data: Partial<Cart>): Promise<Cart> {
    const cart = this.repo.create(data);
    return this.repo.save(cart);
  }
}
