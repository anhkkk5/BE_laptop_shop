import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderRepository } from '../repositories/order.repository.js';
import { CreateOrderDto } from '../dtos/create-order.dto.js';
import { UpdateOrderStatusDto } from '../dtos/update-order-status.dto.js';
import { Order, OrderStatus } from '../entities/order.entity.js';
import { CartService } from '../../cart/services/cart.service.js';
import { StockReservationService } from '../../inventory/services/stock-reservation.service.js';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cartService: CartService,
    private readonly reservationService: StockReservationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private generateOrderCode(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 900 + 100);
    return `ORD${timestamp}${random}`;
  }

  async createFromCart(userId: number, dto: CreateOrderDto): Promise<Order> {
    const cart = await this.cartService.getMyCart(userId);
    if (!cart.items.length) {
      throw new BadRequestException('Cart is empty');
    }

    const reserveItems = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    try {
      await this.reservationService.reserve(
        0, // placeholder, will update after order creation
        reserveItems,
      );

      const subtotal = cart.summary.subtotal;
      const shippingFee = 0;
      const discountAmount = 0;
      const total = subtotal + shippingFee - discountAmount;

      const order = await this.orderRepository.create({
        userId,
        orderCode: this.generateOrderCode(),
        status: OrderStatus.PENDING,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        shippingAddress: dto.shippingAddress,
        paymentMethod: dto.paymentMethod || 'cod',
        subtotal,
        shippingFee,
        discountAmount,
        total,
        note: dto.note || null,
        items: cart.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: item.unitPrice * item.quantity,
        })),
      });

      // Re-reserve with correct orderId then clear cart
      await this.reservationService.release(0);
      await this.reservationService.reserve(order.id, reserveItems);

      await this.cartService.clearCart(userId);

      this.eventEmitter.emit('order.created', {
        userId: order.userId,
        orderId: order.id,
        orderCode: order.orderCode,
      });

      return order;
    } catch (error) {
      await this.reservationService.release(0);
      throw error;
    }
  }

  async findMyOrders(userId: number, page: number, limit: number) {
    return this.orderRepository.findByUserId(userId, page, limit);
  }

  async findMyOrderById(userId: number, orderId: number): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) {
      throw new ForbiddenException('This order does not belong to you');
    }
    return order;
  }

  async findAll(page: number, limit: number) {
    return this.orderRepository.findAll(page, limit);
  }

  async findById(orderId: number): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(
    orderId: number,
    dto: UpdateOrderStatusDto,
  ): Promise<void> {
    const order = await this.findById(orderId);
    order.status = dto.status;
    await this.orderRepository.save(order);

    this.eventEmitter.emit('order.status_changed', {
      userId: order.userId,
      orderId: order.id,
      orderCode: order.orderCode,
      status: order.status,
    });
  }

  async cancelMyOrder(userId: number, orderId: number): Promise<void> {
    const order = await this.findMyOrderById(userId, orderId);
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    await this.reservationService.release(order.id);

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    this.eventEmitter.emit('order.cancelled', {
      userId: order.userId,
      orderId: order.id,
      orderCode: order.orderCode,
    });
  }
}
