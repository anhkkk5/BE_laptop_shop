import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreatePaymentDto } from '../dtos/create-payment.dto.js';
import { PaymentRepository } from '../repositories/payment.repository.js';
import { OrderService } from '../../order/services/order.service.js';
import { StockReservationService } from '../../inventory/services/stock-reservation.service.js';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../entities/payment.entity.js';
import { OrderStatus } from '../../order/entities/order.entity.js';
import {
  PaymentGatewayService,
  type SepayQrData,
} from './payment-gateway.service.js';

export interface CreatePaymentResult {
  payment: Payment;
  sepayQr?: SepayQrData;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly orderService: OrderService,
    private readonly reservationService: StockReservationService,
    private readonly gatewayService: PaymentGatewayService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private makeTxCode(orderId: number): string {
    return `TX-${orderId}-${Date.now()}`;
  }

  async create(
    userId: number,
    dto: CreatePaymentDto,
  ): Promise<CreatePaymentResult> {
    const order = await this.orderService.findMyOrderById(userId, dto.orderId);
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay for a cancelled order');
    }

    const existing = await this.paymentRepository.findByOrderId(dto.orderId);
    if (existing) {
      if (dto.method === PaymentMethod.SEPAY) {
        return {
          payment: existing,
          sepayQr: this.gatewayService.generateSepayQR(
            order.id,
            Number(order.total),
          ),
        };
      }
      return { payment: existing };
    }

    const isCod = dto.method === PaymentMethod.COD;

    const payment = await this.paymentRepository.create({
      orderId: order.id,
      userId,
      method: dto.method,
      amount: order.total,
      status: isCod ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
      transactionCode: isCod ? this.makeTxCode(order.id) : null,
      note: isCod ? 'Thanh toán khi nhận hàng' : 'Chờ chuyển khoản SePay',
    });

    if (isCod) {
      await this.reservationService.confirm(payment.orderId);
      this.eventEmitter.emit('payment.completed', {
        userId: payment.userId,
        orderId: payment.orderId,
        amount: payment.amount,
      });
      return { payment };
    }

    const sepayQr = this.gatewayService.generateSepayQR(
      order.id,
      Number(order.total),
    );
    return { payment, sepayQr };
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

  async processSepayWebhook(
    orderId: number,
    receivedAmount: number,
    refCode: string,
  ): Promise<void> {
    const payment = await this.paymentRepository.findByOrderId(orderId);
    if (!payment) {
      this.logger.warn(`SePay: no payment record for orderId=${orderId}`);
      return;
    }
    if (payment.status === PaymentStatus.SUCCESS) {
      this.logger.log(`SePay: orderId=${orderId} already paid, skip`);
      return;
    }

    const expected = Number(payment.amount);
    if (Math.abs(expected - receivedAmount) > 1000) {
      this.logger.warn(
        `SePay amount mismatch: orderId=${orderId}, expected=${expected}, got=${receivedAmount}`,
      );
      // Log but still process — a real transfer came in, customer already paid
    }

    payment.status = PaymentStatus.SUCCESS;
    payment.transactionCode = refCode;
    payment.note = `SePay chuyển khoản thành công (${receivedAmount.toLocaleString('vi-VN')}đ)`;

    const order = await this.orderService.findById(orderId);
    if (order.status === OrderStatus.PENDING) {
      await this.orderService.updateStatus(orderId, {
        status: OrderStatus.CONFIRMED,
      });
    }

    await this.reservationService.confirm(orderId);
    await this.paymentRepository.save(payment);

    this.eventEmitter.emit('payment.completed', {
      userId: payment.userId,
      orderId,
      amount: payment.amount,
    });

    this.logger.log(
      `SePay payment confirmed: orderId=${orderId}, ref=${refCode}`,
    );
  }

  // Kept for admin/testing use
  async simulateSuccess(orderId: number): Promise<Payment> {
    const order = await this.orderService.findById(orderId);
    const payment = await this.paymentRepository.findByOrderId(orderId);
    if (!payment) {
      throw new BadRequestException('Payment not found for this order');
    }

    payment.status = PaymentStatus.SUCCESS;
    payment.transactionCode =
      payment.transactionCode || this.makeTxCode(orderId);
    payment.note = 'Thanh toán thành công (simulate)';

    if (order.status === OrderStatus.PENDING) {
      await this.orderService.updateStatus(order.id, {
        status: OrderStatus.CONFIRMED,
      });
    }

    await this.reservationService.confirm(payment.orderId);

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
    payment.note = 'Thanh toán thất bại (simulate)';

    await this.reservationService.release(payment.orderId);

    this.eventEmitter.emit('payment.failed', {
      userId: payment.userId,
      orderId: payment.orderId,
      amount: payment.amount,
    });

    return this.paymentRepository.save(payment);
  }
}
