import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderRepository } from '../repositories/order.repository.js';
import { CreateOrderDto } from '../dtos/create-order.dto.js';
import { UpdateOrderStatusDto } from '../dtos/update-order-status.dto.js';
import { Order, OrderStatus } from '../entities/order.entity.js';
import { UserRole } from '../../user/enums/user-role.enum.js';
import { CartService } from '../../cart/services/cart.service.js';
import { StockReservationService } from '../../inventory/services/stock-reservation.service.js';
import { CouponService } from '../../coupon/services/coupon.service.js';
import { ShippingService } from '../../shipping/services/shipping.service.js';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cartService: CartService,
    private readonly reservationService: StockReservationService,
    private readonly couponService: CouponService,
    private readonly shippingService: ShippingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private generateOrderCode(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 900 + 100);
    return `ORD${timestamp}${random}`;
  }

  private isTransitionAllowedByRole(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
    role: UserRole,
  ): boolean {
    if (currentStatus === nextStatus) {
      return true;
    }

    const adminTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [
        OrderStatus.PROCESSING,
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.PROCESSING]: [
        OrderStatus.READY_TO_SHIP,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.READY_TO_SHIP]: [
        OrderStatus.SHIPPING,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.SHIPPING]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.REFUNDED],
      [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
    };

    const staffTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPING]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
    };

    const warehouseTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING],
      [OrderStatus.PROCESSING]: [OrderStatus.READY_TO_SHIP],
      [OrderStatus.READY_TO_SHIP]: [OrderStatus.SHIPPING],
    };

    if (role === UserRole.ADMIN) {
      return adminTransitions[currentStatus]?.includes(nextStatus) ?? false;
    }

    if (role === UserRole.STAFF) {
      return staffTransitions[currentStatus]?.includes(nextStatus) ?? false;
    }

    if (role === UserRole.WAREHOUSE) {
      return warehouseTransitions[currentStatus]?.includes(nextStatus) ?? false;
    }

    return false;
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
      let discountAmount = 0;
      let appliedCouponId: number | null = null;
      let appliedCouponCode: string | null = null;

      if (dto.couponCode) {
        const validated = await this.couponService.validateForCheckout({
          code: dto.couponCode,
          userId,
          subtotal,
        });

        discountAmount = validated.discountAmount;
        appliedCouponId = validated.coupon.id;
        appliedCouponCode = validated.coupon.code;
      }

      const total = subtotal + shippingFee - discountAmount;

      const order = await this.orderRepository.create({
        userId,
        orderCode: this.generateOrderCode(),
        status: OrderStatus.PENDING,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        shippingAddress: dto.shippingAddress,
        paymentMethod: dto.paymentMethod || 'cod',
        couponCode: appliedCouponCode,
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

      if (appliedCouponId !== null && discountAmount > 0) {
        await this.couponService.markCouponUsed(
          appliedCouponId,
          userId,
          order.id,
          discountAmount,
        );
      }

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
    actorRole: UserRole = UserRole.ADMIN,
  ): Promise<void> {
    const order = await this.findById(orderId);

    if (!this.isTransitionAllowedByRole(order.status, dto.status, actorRole)) {
      throw new BadRequestException(
        `Role ${actorRole} cannot change order from ${order.status} to ${dto.status}`,
      );
    }

    if (dto.status === OrderStatus.CANCELLED) {
      await this.reservationService.release(order.id);
      if (order.couponCode) {
        await this.couponService.rollbackCouponUsage(order.id);
      }
    }

    if (dto.status === OrderStatus.READY_TO_SHIP) {
      try {
        const shippingOrder = await this.shippingService.createShippingOrder({
          orderId: order.id,
          codAmount: order.paymentMethod === 'cod' ? order.total : undefined,
          insuranceValue: order.total > 5000000 ? order.total : undefined,
        });
        order.trackingNumber = shippingOrder.trackingNumber;
        order.shippingFee = Number(shippingOrder.shippingFee);
      } catch (err) {
        this.logger.warn(
          `Failed to create shipping order for order ${order.id}: ${(err as Error).message}`,
        );
      }
    }

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
    if (order.couponCode) {
      await this.couponService.rollbackCouponUsage(order.id);
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
