import { PaymentService } from './payment.service';
import {
  PaymentMethod,
  PaymentStatus,
  type Payment,
} from '../entities/payment.entity';
import { OrderStatus } from '../../order/entities/order.entity';

function createService() {
  const paymentRepository = {
    findByOrderId: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const orderService = {
    findMyOrderById: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
  };

  const reservationService = {
    confirm: jest.fn(),
    release: jest.fn(),
  };

  const eventEmitter = {
    emit: jest.fn(),
  };

  const gatewayService = {
    generateSepayQR: jest.fn().mockReturnValue({
      qrUrl: 'https://qr.sepay.vn/img?acc=123',
      accountNo: '123',
      bankCode: 'MB',
      accountName: 'TEST',
      amount: 0,
      transferCode: 'SHOP0',
      description: '',
    }),
  };

  const service = new PaymentService(
    paymentRepository as never,
    orderService as never,
    reservationService as never,
    gatewayService as never,
    eventEmitter as never,
  );

  return {
    service,
    paymentRepository,
    orderService,
    reservationService,
    eventEmitter,
  };
}

describe('PaymentService', () => {
  it('should confirm reservation and emit completed event for COD payment create', async () => {
    const {
      service,
      paymentRepository,
      orderService,
      reservationService,
      eventEmitter,
    } = createService();

    orderService.findMyOrderById.mockResolvedValue({
      id: 11,
      status: OrderStatus.PENDING,
      total: 200000,
    });
    paymentRepository.findByOrderId.mockResolvedValue(null);
    paymentRepository.create.mockImplementation((data: Partial<Payment>) => ({
      id: 1,
      orderId: Number(data.orderId),
      userId: Number(data.userId),
      method: data.method as PaymentMethod,
      amount: Number(data.amount),
      status: data.status as PaymentStatus,
      transactionCode: (data.transactionCode as string) || null,
      note: (data.note as string) || null,
    }));

    const result = await service.create(99, {
      orderId: 11,
      method: PaymentMethod.COD,
    });

    expect(result.payment.status).toBe(PaymentStatus.SUCCESS);
    expect(reservationService.confirm).toHaveBeenCalledWith(11);
    expect(eventEmitter.emit).toHaveBeenCalledWith('payment.completed', {
      userId: 99,
      orderId: 11,
      amount: 200000,
    });
  });

  it('should update order status on simulate success when order is pending', async () => {
    const {
      service,
      paymentRepository,
      orderService,
      reservationService,
      eventEmitter,
    } = createService();

    orderService.findById.mockResolvedValue({
      id: 11,
      status: OrderStatus.PENDING,
    });
    paymentRepository.findByOrderId.mockResolvedValue({
      id: 1,
      orderId: 11,
      userId: 99,
      status: PaymentStatus.PENDING,
      transactionCode: null,
      note: null,
      method: PaymentMethod.SEPAY,
      amount: 200000,
    });
    paymentRepository.save.mockImplementation((payment: Payment) => payment);

    await service.simulateSuccess(11);

    expect(orderService.updateStatus).toHaveBeenCalledWith(11, {
      status: OrderStatus.CONFIRMED,
    });
    expect(reservationService.confirm).toHaveBeenCalledWith(11);
    expect(eventEmitter.emit).toHaveBeenCalledWith('payment.completed', {
      userId: 99,
      orderId: 11,
      amount: 200000,
    });
  });

  it('should release reservation and emit failed event on simulate failed', async () => {
    const { service, paymentRepository, reservationService, eventEmitter } =
      createService();

    paymentRepository.findByOrderId.mockResolvedValue({
      id: 1,
      orderId: 11,
      userId: 99,
      status: PaymentStatus.PENDING,
      transactionCode: null,
      note: null,
      method: PaymentMethod.SEPAY,
      amount: 200000,
    });
    paymentRepository.save.mockImplementation((payment: Payment) => payment);

    await service.simulateFailed(11);

    expect(reservationService.release).toHaveBeenCalledWith(11);
    expect(eventEmitter.emit).toHaveBeenCalledWith('payment.failed', {
      userId: 99,
      orderId: 11,
      amount: 200000,
    });
  });
});
