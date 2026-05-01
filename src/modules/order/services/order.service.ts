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
import { ProductService } from '../../product/services/product.service.js';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cartService: CartService,
    private readonly productService: ProductService,
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

    const deductedItems: Array<{ productId: number; quantity: number }> = [];

    try {
      for (const item of cart.items) {
        const deducted = await this.productService.decreaseStockIfEnough(
          item.productId,
          item.quantity,
        );

        if (!deducted) {
          throw new BadRequestException(
            `Not enough stock for product: ${item.productName}`,
          );
        }

        deductedItems.push({
          productId: item.productId,
          quantity: item.quantity,
        });
      }

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

      await this.cartService.clearCart(userId);

      this.eventEmitter.emit('order.created', {
        userId: order.userId,
        orderId: order.id,
        orderCode: order.orderCode,
      });

      return order;
    } catch (error) {
      for (const item of deductedItems) {
        await this.productService.increaseStock(item.productId, item.quantity);
      }
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

    for (const item of order.items) {
      await this.productService.increaseStock(item.productId, item.quantity);
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    this.eventEmitter.emit('order.cancelled', {
      userId: order.userId,
      orderId: order.id,
      orderCode: order.orderCode,
    });
  }
}
