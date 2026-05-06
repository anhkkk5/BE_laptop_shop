import { Injectable, Logger } from '@nestjs/common';
import type { ProviderAdapter } from '../services/shipping.service.js';
import type { ShippingProviderConfig } from '../entities/shipping-provider-config.entity.js';
import type { CalculateShippingFeeDto } from '../dtos/shipping.dto.js';
import type { ShippingOrder } from '../entities/shipping-order.entity.js';

@Injectable()
export class MockShippingAdapter implements ProviderAdapter {
  private readonly logger = new Logger(MockShippingAdapter.name);

  async calculateFee(
    _config: ShippingProviderConfig,
    input: CalculateShippingFeeDto,
  ): Promise<{ fee: number; estimatedDays: number }> {
    await Promise.resolve();
    const baseFee = 30000;
    const weightFee = Math.ceil((input.weightGrams || 500) / 1000) * 5000;
    const serviceMultiplier = input.serviceType === 'express' ? 1.5 : 1;
    const fee = Math.ceil((baseFee + weightFee) * serviceMultiplier);
    const estimatedDays = input.serviceType === 'express' ? 2 : 4;
    this.logger.log(`Mock fee calc: ${fee} VND, ${estimatedDays} days`);
    return { fee, estimatedDays };
  }

  async createOrder(
    config: ShippingProviderConfig,
    _order: ShippingOrder,
    _address: string,
  ): Promise<{
    trackingNumber: string;
    labelUrl: string;
    estimatedDelivery: Date;
  }> {
    await Promise.resolve();
    const trackingNumber = `${config.provider.toUpperCase()}${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const estimatedDelivery = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    this.logger.log(`Mock create order: ${trackingNumber}`);
    return {
      trackingNumber,
      labelUrl: `https://mock-labels.example.com/${trackingNumber}.pdf`,
      estimatedDelivery,
    };
  }

  async getTracking(
    _config: ShippingProviderConfig,
    trackingNumber: string,
  ): Promise<{
    status: string;
    history: Array<{
      status: string;
      location: string;
      description: string;
      time: Date;
    }>;
    estimatedDelivery: Date | null;
  }> {
    await Promise.resolve();
    const now = new Date();
    this.logger.log(`Mock tracking for: ${trackingNumber}`);
    return {
      status: 'in_transit',
      history: [
        {
          status: 'created',
          location: 'Kho Hà Nội',
          description: 'Đơn hàng đã được tạo',
          time: new Date(now.getTime() - 3600000),
        },
        {
          status: 'picked_up',
          location: 'Kho Hà Nội',
          description: 'Đã lấy hàng',
          time: new Date(now.getTime() - 1800000),
        },
        {
          status: 'in_transit',
          location: 'Trung tâm phân loại',
          description: 'Đang vận chuyển',
          time: now,
        },
      ],
      estimatedDelivery: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    };
  }

  async cancelOrder(
    _config: ShippingProviderConfig,
    trackingNumber: string,
    reason: string,
  ): Promise<void> {
    await Promise.resolve();
    this.logger.log(`Mock cancel: ${trackingNumber}, reason: ${reason}`);
  }
}
