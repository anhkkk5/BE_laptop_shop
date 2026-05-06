import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShippingOrder } from '../entities/shipping-order.entity.js';
import { ShippingProviderConfig } from '../entities/shipping-provider-config.entity.js';
import { ShippingTrackingHistory } from '../entities/shipping-tracking-history.entity.js';
import { ShippingProvider } from '../enums/shipping-provider.enum.js';
import { ShippingStatus, CodStatus } from '../enums/shipping-status.enum.js';
import type {
  CalculateShippingFeeDto,
  ValidateAddressDto,
  CreateShippingOrderDto,
  BulkCreateShippingDto,
} from '../dtos/shipping.dto.js';

export interface ProviderAdapter {
  calculateFee(
    config: ShippingProviderConfig,
    input: CalculateShippingFeeDto,
  ): Promise<{ fee: number; estimatedDays: number }>;
  createOrder(
    config: ShippingProviderConfig,
    order: ShippingOrder,
    address: string,
  ): Promise<{
    trackingNumber: string;
    labelUrl: string;
    estimatedDelivery: Date;
  }>;
  getTracking(
    config: ShippingProviderConfig,
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
  }>;
  cancelOrder(
    config: ShippingProviderConfig,
    trackingNumber: string,
    reason: string,
  ): Promise<void>;
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly feeCache = new Map<
    string,
    { fee: number; expiresAt: number }
  >();
  private readonly trackingCache = new Map<
    string,
    { data: unknown; expiresAt: number }
  >();
  private readonly adapters = new Map<ShippingProvider, ProviderAdapter>();

  constructor(
    @InjectRepository(ShippingOrder)
    private readonly shippingRepo: Repository<ShippingOrder>,
    @InjectRepository(ShippingProviderConfig)
    private readonly configRepo: Repository<ShippingProviderConfig>,
    @InjectRepository(ShippingTrackingHistory)
    private readonly trackingRepo: Repository<ShippingTrackingHistory>,
  ) {}

  registerAdapter(provider: ShippingProvider, adapter: ProviderAdapter): void {
    this.adapters.set(provider, adapter);
  }

  private async getConfigs(): Promise<ShippingProviderConfig[]> {
    return this.configRepo.find({
      where: { isActive: true },
      order: { priority: 'ASC' },
    });
  }

  private getAdapter(provider: ShippingProvider): ProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter)
      throw new BadRequestException(
        `No adapter registered for provider: ${provider}`,
      );
    return adapter;
  }

  private cacheKey(input: CalculateShippingFeeDto): string {
    return `${input.ward || ''}|${input.district || ''}|${input.province || ''}|${input.weightGrams || 0}|${input.serviceType || 'standard'}`;
  }

  async calculateFee(
    input: CalculateShippingFeeDto,
  ): Promise<{
    provider: ShippingProvider;
    fee: number;
    estimatedDays: number;
  }> {
    const key = this.cacheKey(input);
    const cached = this.feeCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        provider: ShippingProvider.GHN,
        fee: cached.fee,
        estimatedDays: 3,
      };
    }

    const configs = await this.getConfigs();
    if (!configs.length)
      throw new BadRequestException('No shipping provider configured');

    let lastError: string | null = null;
    for (const config of configs) {
      try {
        const adapter = this.getAdapter(config.provider);
        const result = await adapter.calculateFee(config, input);
        this.feeCache.set(key, {
          fee: result.fee,
          expiresAt: Date.now() + 15 * 60 * 1000,
        });
        return {
          provider: config.provider,
          fee: result.fee,
          estimatedDays: result.estimatedDays,
        };
      } catch (err) {
        lastError = (err as Error).message;
        this.logger.warn(
          `Provider ${config.provider} fee calc failed: ${lastError}, trying next`,
        );
      }
    }

    throw new BadRequestException(
      `All providers failed to calculate fee: ${lastError}`,
    );
  }

  validateAddress(input: ValidateAddressDto): {
    valid: boolean;
    serviceable: boolean;
    suggestions: string[];
  } {
    const errors: string[] = [];
    if (input.ward && input.ward.length < 2)
      errors.push('Phường/Xã không hợp lệ');
    if (input.district && input.district.length < 2)
      errors.push('Quận/Huyện không hợp lệ');
    if (input.province && input.province.length < 2)
      errors.push('Tỉnh/Thành phố không hợp lệ');
    if (!input.address || input.address.length < 5)
      errors.push('Địa chỉ quá ngắn');

    return {
      valid: errors.length === 0,
      serviceable: errors.length === 0,
      suggestions: errors,
    };
  }

  async createShippingOrder(
    dto: CreateShippingOrderDto,
  ): Promise<ShippingOrder> {
    const configs = await this.getConfigs();
    if (!configs.length)
      throw new BadRequestException('No shipping provider configured');

    const order = this.shippingRepo.create({
      orderId: dto.orderId,
      provider: configs[0].provider,
      serviceType: (dto.serviceType as any) || 'standard',
      codAmount: dto.codAmount || null,
      codStatus: dto.codAmount ? CodStatus.PENDING : null,
      insuranceValue: dto.insuranceValue || null,
      insuranceFee: dto.insuranceValue
        ? Math.ceil(dto.insuranceValue * 0.005)
        : 0,
      shippingFee: 0,
      status: ShippingStatus.PENDING,
      weightGrams: 500,
    });

    let lastError: string | null = null;
    for (const config of configs) {
      try {
        const adapter = this.getAdapter(config.provider);
        const result = await adapter.createOrder(config, order, '');
        order.provider = config.provider;
        order.trackingNumber = result.trackingNumber;
        order.labelUrl = result.labelUrl;
        order.estimatedDelivery = result.estimatedDelivery;
        order.status = ShippingStatus.CREATED;
        await this.shippingRepo.save(order);

        await this.trackingRepo.save(
          this.trackingRepo.create({
            shippingOrderId: order.id,
            status: 'created',
            description: `Shipping order created with ${config.provider}`,
            eventTime: new Date(),
          }),
        );

        return order;
      } catch (err) {
        lastError = (err as Error).message;
        order.lastError = lastError;
        order.retryCount += 1;
        this.logger.warn(
          `Provider ${config.provider} create failed: ${lastError}`,
        );
      }
    }

    order.status = ShippingStatus.PENDING;
    order.lastError = lastError;
    await this.shippingRepo.save(order);
    throw new BadRequestException(`All providers failed: ${lastError}`);
  }

  async getTracking(
    shippingOrderId: number,
  ): Promise<{
    trackingNumber: string;
    status: string;
    history: ShippingTrackingHistory[];
    estimatedDelivery: Date | null;
  }> {
    const order = await this.shippingRepo.findOne({
      where: { id: shippingOrderId },
    });
    if (!order) throw new NotFoundException('Shipping order not found');
    if (!order.trackingNumber)
      throw new BadRequestException('No tracking number yet');

    const cacheKey = `tracking:${order.trackingNumber}`;
    const cached = this.trackingCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      const history = await this.trackingRepo.find({
        where: { shippingOrderId },
        order: { eventTime: 'DESC' },
      });
      return {
        trackingNumber: order.trackingNumber,
        status: order.status,
        history,
        estimatedDelivery: order.estimatedDelivery,
      };
    }

    try {
      const config = await this.configRepo.findOne({
        where: { provider: order.provider },
      });
      if (config) {
        const adapter = this.getAdapter(order.provider);
        const providerData = await adapter.getTracking(
          config,
          order.trackingNumber,
        );
        order.status = this.mapProviderStatus(providerData.status);
        order.estimatedDelivery = providerData.estimatedDelivery;
        await this.shippingRepo.save(order);

        for (const event of providerData.history) {
          const exists = await this.trackingRepo.findOne({
            where: {
              shippingOrderId: order.id,
              status: event.status,
              eventTime: event.time,
            },
          });
          if (!exists) {
            await this.trackingRepo.save(
              this.trackingRepo.create({
                shippingOrderId: order.id,
                status: event.status,
                location: event.location,
                description: event.description,
                eventTime: event.time,
              }),
            );
          }
        }
      }

      this.trackingCache.set(cacheKey, {
        data: null,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to refresh tracking from provider: ${(err as Error).message}`,
      );
    }

    const history = await this.trackingRepo.find({
      where: { shippingOrderId },
      order: { eventTime: 'DESC' },
    });
    return {
      trackingNumber: order.trackingNumber,
      status: order.status,
      history,
      estimatedDelivery: order.estimatedDelivery,
    };
  }

  private mapProviderStatus(providerStatus: string): ShippingStatus {
    const mapping: Record<string, ShippingStatus> = {
      picked_up: ShippingStatus.PICKED_UP,
      in_transit: ShippingStatus.IN_TRANSIT,
      out_for_delivery: ShippingStatus.OUT_FOR_DELIVERY,
      delivered: ShippingStatus.DELIVERED,
      delivery_failed: ShippingStatus.DELIVERY_FAILED,
      returning: ShippingStatus.RETURNING,
      returned: ShippingStatus.RETURNED,
    };
    return mapping[providerStatus] || ShippingStatus.IN_TRANSIT;
  }

  async cancelShippingOrder(
    shippingOrderId: number,
    reason: string,
  ): Promise<void> {
    const order = await this.shippingRepo.findOne({
      where: { id: shippingOrderId },
    });
    if (!order) throw new NotFoundException('Shipping order not found');
    if (
      order.status === ShippingStatus.DELIVERED ||
      order.status === ShippingStatus.PICKED_UP
    ) {
      throw new BadRequestException('Cannot cancel after pickup');
    }

    try {
      const config = await this.configRepo.findOne({
        where: { provider: order.provider },
      });
      if (config && order.trackingNumber) {
        const adapter = this.getAdapter(order.provider);
        await adapter.cancelOrder(config, order.trackingNumber, reason);
      }
    } catch (err) {
      this.logger.warn(`Provider cancel failed: ${(err as Error).message}`);
    }

    order.status = ShippingStatus.CANCELLED;
    order.cancellationReason = reason;
    if (order.codStatus === CodStatus.PENDING)
      order.codStatus = CodStatus.CANCELLED;
    await this.shippingRepo.save(order);
  }

  async bulkCreate(
    dto: BulkCreateShippingDto,
  ): Promise<{
    success: number;
    failed: number;
    failures: Array<{ orderId: number; error: string }>;
  }> {
    const failures: Array<{ orderId: number; error: string }> = [];
    let success = 0;

    for (const orderId of dto.orderIds) {
      try {
        await this.createShippingOrder({
          orderId,
          serviceType: dto.serviceType,
        });
        success++;
      } catch (err) {
        failures.push({ orderId, error: (err as Error).message });
      }
    }

    return { success, failed: failures.length, failures };
  }

  async getAnalytics(
    startDate: string,
    endDate: string,
  ): Promise<{
    totalOrders: number;
    totalFee: number;
    byProvider: Record<
      string,
      {
        count: number;
        totalFee: number;
        avgDeliveryDays: number;
        successRate: number;
      }
    >;
    totalCodPending: number;
    totalCodCollected: number;
  }> {
    const orders = await this.shippingRepo
      .createQueryBuilder('so')
      .where('so.created_at BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .getMany();

    const byProvider: Record<
      string,
      { count: number; totalFee: number; totalDays: number; delivered: number }
    > = {};
    let totalFee = 0;
    let totalCodPending = 0;
    let totalCodCollected = 0;

    for (const o of orders) {
      totalFee += Number(o.shippingFee);
      if (o.codStatus === CodStatus.PENDING)
        totalCodPending += Number(o.codAmount || 0);
      if (o.codStatus === CodStatus.COLLECTED)
        totalCodCollected += Number(o.codAmount || 0);

      const key = o.provider;
      if (!byProvider[key])
        byProvider[key] = { count: 0, totalFee: 0, totalDays: 0, delivered: 0 };
      byProvider[key].count++;
      byProvider[key].totalFee += Number(o.shippingFee);
      if (o.deliveredAt && o.createdAt) {
        byProvider[key].totalDays +=
          (o.deliveredAt.getTime() - o.createdAt.getTime()) /
          (1000 * 60 * 60 * 24);
      }
      if (o.status === ShippingStatus.DELIVERED) byProvider[key].delivered++;
    }

    const providerResult: Record<
      string,
      {
        count: number;
        totalFee: number;
        avgDeliveryDays: number;
        successRate: number;
      }
    > = {};
    for (const [key, data] of Object.entries(byProvider)) {
      providerResult[key] = {
        count: data.count,
        totalFee: data.totalFee,
        avgDeliveryDays:
          data.count > 0
            ? Math.round((data.totalDays / data.count) * 10) / 10
            : 0,
        successRate:
          data.count > 0 ? Math.round((data.delivered / data.count) * 100) : 0,
      };
    }

    return {
      totalOrders: orders.length,
      totalFee,
      byProvider: providerResult,
      totalCodPending,
      totalCodCollected,
    };
  }

  async createReturn(
    orderId: number,
    originalShippingOrderId: number,
  ): Promise<ShippingOrder> {
    const original = await this.shippingRepo.findOne({
      where: { id: originalShippingOrderId },
    });
    if (!original)
      throw new NotFoundException('Original shipping order not found');

    const returnOrder = this.shippingRepo.create({
      orderId,
      provider: original.provider,
      serviceType: original.serviceType,
      isReturn: true,
      returnReferenceId: original.id,
      status: ShippingStatus.PENDING,
      weightGrams: original.weightGrams,
      shippingFee: 0,
    });

    return this.shippingRepo.save(returnOrder);
  }

  async findByOrderId(orderId: number): Promise<ShippingOrder[]> {
    return this.shippingRepo.find({
      where: { orderId },
      order: { packageNumber: 'ASC' },
    });
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{ data: ShippingOrder[]; total: number }> {
    const [data, total] = await this.shippingRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }
}
