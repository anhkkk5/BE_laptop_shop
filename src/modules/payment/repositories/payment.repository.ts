import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity.js';

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
  ) {}

  async findByOrderId(orderId: number): Promise<Payment | null> {
    return this.repo.findOne({ where: { orderId } });
  }

  async create(data: Partial<Payment>): Promise<Payment> {
    const payment = this.repo.create(data);
    return this.repo.save(payment);
  }

  async save(payment: Payment): Promise<Payment> {
    return this.repo.save(payment);
  }
}
