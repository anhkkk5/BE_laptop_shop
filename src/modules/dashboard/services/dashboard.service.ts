import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../order/entities/order.entity.js';
import { OrderItem } from '../../order/entities/order-item.entity.js';
import { Payment, PaymentStatus } from '../../payment/entities/payment.entity.js';
import { Product } from '../../product/entities/product.entity.js';
import { WarrantyTicket } from '../../warranty/entities/warranty-ticket.entity.js';
import { DashboardQueryDto } from '../dtos/dashboard-query.dto.js';

type DateRange = { fromDate?: string; toDate?: string };

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(WarrantyTicket)
    private readonly warrantyRepo: Repository<WarrantyTicket>,
  ) {}

  async getOverview(query: DashboardQueryDto) {
    const { fromDate, toDate } = query;
    const dateFilter = this.buildDateFilter(fromDate, toDate);

    const [
      totalRevenue,
      orderCount,
      productCount,
      warrantyCount,
      revenueByStatus,
      ordersByStatus,
      topProducts,
      warrantyByStatus,
      recentOrders,
    ] = await Promise.all([
      this.getTotalRevenue(dateFilter),
      this.getOrderCount(dateFilter),
      this.getProductCount(),
      this.getWarrantyCount(dateFilter),
      this.getRevenueByPaymentStatus(dateFilter),
      this.getOrdersByStatus(dateFilter),
      this.getTopProducts(dateFilter, query.topProductsLimit ?? 5),
      this.getWarrantyByStatus(dateFilter),
      this.getRecentOrders(10),
    ]);

    return {
      totalRevenue,
      orderCount,
      productCount,
      warrantyCount,
      revenueByStatus,
      ordersByStatus,
      topProducts,
      warrantyByStatus,
      recentOrders,
    };
  }

  private buildDateFilter(fromDate?: string, toDate?: string): DateRange {
    return { fromDate, toDate };
  }

  private applyDateRange(
    qb: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown },
    alias: string,
    dateRange: DateRange,
  ): void {
    if (dateRange.fromDate) {
      qb.andWhere(`${alias}.created_at >= :fromDate`, {
        fromDate: dateRange.fromDate,
      });
    }
    if (dateRange.toDate) {
      qb.andWhere(`${alias}.created_at <= :toDate`, {
        toDate: dateRange.toDate,
      });
    }
  }

  private async getTotalRevenue(dateRange: DateRange): Promise<number> {
    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'revenue')
      .where('p.status = :status', { status: PaymentStatus.SUCCESS });

    this.applyDateRange(qb, 'p', dateRange);

    const result = await qb.getRawOne();
    return Number(result?.revenue ?? 0);
  }

  private async getOrderCount(dateRange: DateRange): Promise<number> {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(o.id)', 'count');

    this.applyDateRange(qb, 'o', dateRange);

    const result = await qb.getRawOne();
    return Number(result?.count ?? 0);
  }

  private async getProductCount(): Promise<number> {
    const count = await this.productRepo.count({
      where: { status: 'active' as never },
    });
    return count;
  }

  private async getWarrantyCount(dateRange: DateRange): Promise<number> {
    const qb = this.warrantyRepo
      .createQueryBuilder('w')
      .select('COUNT(w.id)', 'count');

    this.applyDateRange(qb, 'w', dateRange);

    const result = await qb.getRawOne();
    return Number(result?.count ?? 0);
  }

  private async getRevenueByPaymentStatus(
    dateRange: DateRange,
  ): Promise<{ status: string; amount: number }[]> {
    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .select('p.status', 'status')
      .addSelect('COALESCE(SUM(p.amount), 0)', 'amount')
      .groupBy('p.status');

    this.applyDateRange(qb, 'p', dateRange);

    const rows = await qb.getRawMany();
    return rows.map((row) => ({
      status: String(row.status),
      amount: Number(row.amount),
    }));
  }

  private async getOrdersByStatus(
    dateRange: DateRange,
  ): Promise<{ status: string; count: number }[]> {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(o.id)', 'count')
      .groupBy('o.status');

    this.applyDateRange(qb, 'o', dateRange);

    const rows = await qb.getRawMany();
    return rows.map((row) => ({
      status: String(row.status),
      count: Number(row.count),
    }));
  }

  private async getTopProducts(
    dateRange: DateRange,
    limit: number,
  ): Promise<{ productId: number; productName: string; totalSold: number; revenue: number }[]> {
    const qb = this.orderItemRepo
      .createQueryBuilder('oi')
      .select('oi.product_id', 'productId')
      .addSelect('oi.product_name', 'productName')
      .addSelect('SUM(oi.quantity)', 'totalSold')
      .addSelect('SUM(oi.line_total)', 'revenue')
      .innerJoin('oi.order', 'o')
      .andWhere('o.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [OrderStatus.CANCELLED],
      })
      .groupBy('oi.product_id')
      .addGroupBy('oi.product_name')
      .orderBy('totalSold', 'DESC')
      .limit(limit);

    this.applyDateRange(qb, 'o', dateRange);

    const rows = await qb.getRawMany();
    return rows.map((row) => ({
      productId: Number(row.productId),
      productName: String(row.productName),
      totalSold: Number(row.totalSold),
      revenue: Number(row.revenue),
    }));
  }

  private async getWarrantyByStatus(
    dateRange: DateRange,
  ): Promise<{ status: string; count: number }[]> {
    const qb = this.warrantyRepo
      .createQueryBuilder('w')
      .select('w.status', 'status')
      .addSelect('COUNT(w.id)', 'count')
      .groupBy('w.status');

    this.applyDateRange(qb, 'w', dateRange);

    const rows = await qb.getRawMany();
    return rows.map((row) => ({
      status: String(row.status),
      count: Number(row.count),
    }));
  }

  private async getRecentOrders(
    limit: number,
  ): Promise<{ id: number; orderCode: string; customerName: string; total: number; status: string; createdAt: string }[]> {
    const orders = await this.orderRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      select: ['id', 'orderCode', 'customerName', 'total', 'status', 'createdAt'],
    });

    return orders.map((o) => ({
      id: o.id,
      orderCode: o.orderCode,
      customerName: o.customerName,
      total: Number(o.total),
      status: String(o.status),
      createdAt: o.createdAt.toISOString(),
    }));
  }
}
