import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service.js';
import { NotificationType } from '../entities/notification.entity.js';

@Injectable()
export class NotificationEventsListener {
  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('order.created')
  async onOrderCreated(payload: {
    userId: number;
    orderId: number;
    orderCode: string;
  }) {
    await this.notificationService.enqueueDelivery({
      userId: payload.userId,
      type: NotificationType.ORDER,
      title: 'Đơn hàng mới đã được tạo',
      content: `Đơn ${payload.orderCode} đã được tạo thành công`,
      data: {
        orderId: payload.orderId,
        orderCode: payload.orderCode,
      },
    });
  }

  @OnEvent('order.status_changed')
  async onOrderStatusChanged(payload: {
    userId: number;
    orderId: number;
    orderCode: string;
    status: string;
  }) {
    await this.notificationService.enqueueDelivery({
      userId: payload.userId,
      type: NotificationType.ORDER,
      title: 'Đơn hàng cập nhật trạng thái',
      content: `Đơn ${payload.orderCode} đã chuyển sang trạng thái ${payload.status}`,
      data: {
        orderId: payload.orderId,
        orderCode: payload.orderCode,
        status: payload.status,
      },
    });
  }

  @OnEvent('payment.completed')
  async onPaymentCompleted(payload: {
    userId: number;
    orderId: number;
    amount: number;
  }) {
    await this.notificationService.enqueueDelivery({
      userId: payload.userId,
      type: NotificationType.PAYMENT,
      title: 'Thanh toán thành công',
      content: `Thanh toán cho đơn #${payload.orderId} đã hoàn tất`,
      data: {
        orderId: payload.orderId,
        amount: payload.amount,
      },
    });
  }

  @OnEvent('payment.failed')
  async onPaymentFailed(payload: {
    userId: number;
    orderId: number;
    amount: number;
  }) {
    await this.notificationService.enqueueDelivery({
      userId: payload.userId,
      type: NotificationType.PAYMENT,
      title: 'Thanh toán thất bại',
      content: `Thanh toán cho đơn #${payload.orderId} thất bại, vui lòng thử lại`,
      data: {
        orderId: payload.orderId,
        amount: payload.amount,
      },
    });
  }

  @OnEvent('warranty.created')
  async onWarrantyCreated(payload: {
    userId: number;
    ticketId: number;
    ticketCode: string;
  }) {
    await this.notificationService.enqueueDelivery({
      userId: payload.userId,
      type: NotificationType.WARRANTY,
      title: 'Ticket bảo hành đã được tạo',
      content: `Ticket ${payload.ticketCode} đã được ghi nhận`,
      data: {
        ticketId: payload.ticketId,
        ticketCode: payload.ticketCode,
      },
    });
  }

  @OnEvent('warranty.status_changed')
  async onWarrantyStatusChanged(payload: {
    userId: number;
    ticketId: number;
    ticketCode: string;
    status: string;
  }) {
    await this.notificationService.enqueueDelivery({
      userId: payload.userId,
      type: NotificationType.WARRANTY,
      title: 'Ticket bảo hành cập nhật trạng thái',
      content: `Ticket ${payload.ticketCode} đã chuyển sang trạng thái ${payload.status}`,
      data: {
        ticketId: payload.ticketId,
        ticketCode: payload.ticketCode,
        status: payload.status,
      },
    });
  }
}
