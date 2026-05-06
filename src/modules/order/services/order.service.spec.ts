import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderService } from './order.service';
import { OrderStatus } from '../entities/order.entity';
import { UserRole } from '../../user/enums/user-role.enum';

function createService() {
  const orderRepository = {
    findById: jest.fn(),
    save: jest.fn(),
  };

  const cartService = {
    getMyCart: jest.fn(),
    clearCart: jest.fn(),
  };

  const reservationService = {
    reserve: jest.fn(),
    release: jest.fn(),
    confirm: jest.fn(),
  };

  const couponService = {
    validateForCheckout: jest.fn(),
    markCouponUsed: jest.fn(),
  };

  const eventEmitter = {
    emit: jest.fn(),
  };

  const service = new OrderService(
    orderRepository as never,
    cartService as never,
    reservationService as never,
    couponService as never,
    eventEmitter as never,
  );

  return {
    service,
    orderRepository,
    reservationService,
    eventEmitter,
  };
}

describe('OrderService', () => {
  it('should reject invalid transition by role', async () => {
    const { service, orderRepository } = createService();

    orderRepository.findById.mockResolvedValue({
      id: 1,
      userId: 10,
      orderCode: 'ORD001',
      status: OrderStatus.PENDING,
    });

    await expect(
      service.updateStatus(
        1,
        { status: OrderStatus.PROCESSING },
        UserRole.STAFF,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should release reservation and emit event when cancelling order', async () => {
    const { service, orderRepository, reservationService, eventEmitter } =
      createService();

    const order = {
      id: 1,
      userId: 10,
      orderCode: 'ORD001',
      status: OrderStatus.PENDING,
    };

    orderRepository.findById.mockResolvedValue(order);

    await service.updateStatus(
      1,
      { status: OrderStatus.CANCELLED },
      UserRole.ADMIN,
    );

    expect(reservationService.release).toHaveBeenCalledWith(1);
    expect(orderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: OrderStatus.CANCELLED }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith('order.status_changed', {
      userId: 10,
      orderId: 1,
      orderCode: 'ORD001',
      status: OrderStatus.CANCELLED,
    });
  });

  it('should only allow customer cancel when status is pending', async () => {
    const { service, orderRepository } = createService();

    orderRepository.findById.mockResolvedValue({
      id: 1,
      userId: 10,
      orderCode: 'ORD001',
      status: OrderStatus.SHIPPING,
    });

    await expect(service.cancelMyOrder(10, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
