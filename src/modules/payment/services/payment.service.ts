import { BadRequestException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreatePaymentDto } from '../dtos/create-payment.dto.js';
import { PaymentRepository } from '../repositories/payment.repository.js';
import { OrderService } from '../../order/services/order.service.js';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../entities/payment.entity.js';
import { OrderStatus } from '../../order/entities/order.entity.js';

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly orderService: OrderService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private makeTxCode(orderId: number): string {
    return `TX-${orderId}-${Date.now()}`;
  }

  async create(userId: number, dto: CreatePaymentDto): Promise<Payment> {
    const order = await this.orderService.findMyOrderById(userId, dto.orderId);
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay for a cancelled order');
    }

    const existing = await this.paymentRepository.findByOrderId(dto.orderId);
    if (existing) return existing;

    const isCod = dto.method === PaymentMethod.COD;

    const payment = await this.paymentRepository.create({
      orderId: order.id,
      userId,
      method: dto.method,
      amount: order.total,
      status: isCod ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
      transactionCode: isCod ? this.makeTxCode(order.id) : null,
      note: isCod ? 'Thanh toán khi nhận hàng' : 'Chờ thanh toán online',
    });

    if (isCod) {
      this.eventEmitter.emit('payment.completed', {
        userId: payment.userId,
        orderId: payment.orderId,
        amount: payment.amount,
      });
    }

    return payment;
  }

  async getMyPaymentStatus(userId: number, orderId: number): Promise<Payment> {
    await this.orderService.findMyOrderById(userId, orderId);
    const payment = await this.paymentRepository.findByOrderId(orderId);
    if (!payment) {
      throw new BadRequestException('Payment not found for this order');
    }
    return payment;
  }

  async getByOrderId(orderId: number): Promise<Payment> {
    await this.orderService.findById(orderId);
    const payment = await this.paymentRepository.findByOrderId(orderId);
    if (!payment) {
      throw new BadRequestException('Payment not found for this order');
    }
    return payment;
  }

  async simulateSuccess(orderId: number): Promise<Payment> {
    const order = await this.orderService.findById(orderId);
    const payment = await this.paymentRepository.findByOrderId(orderId);
    if (!payment) {
      throw new BadRequestException('Payment not found for this order');
    }

    payment.status = PaymentStatus.SUCCESS;
    payment.transactionCode =
      payment.transactionCode || this.makeTxCode(orderId);
    payment.note = 'Thanh toán online thành công (simulate)';

    if (order.status === OrderStatus.PENDING) {
      await this.orderService.updateStatus(order.id, {
        status: OrderStatus.CONFIRMED,
      });
    }

    this.eventEmitter.emit('payment.completed', {
      userId: payment.userId,
      orderId: payment.orderId,
      amount: payment.amount,
    });

    return this.paymentRepository.save(payment);
  }

  async simulateFailed(orderId: number): Promise<Payment> {
    const payment = await this.paymentRepository.findByOrderId(orderId);
    if (!payment) {
      throw new BadRequestException('Payment not found for this order');
    }

    payment.status = PaymentStatus.FAILED;
    payment.note = 'Thanh toán online thất bại (simulate)';

    this.eventEmitter.emit('payment.failed', {
      userId: payment.userId,
      orderId: payment.orderId,
      amount: payment.amount,
    });

    return this.paymentRepository.save(payment);
  }
}
