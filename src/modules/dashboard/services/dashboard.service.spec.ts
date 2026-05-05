import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const createService = () => {
    const orderRepo = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    };
    const orderItemRepo = {
      createQueryBuilder: jest.fn(),
    };
    const paymentRepo = {
      createQueryBuilder: jest.fn(),
    };
    const productRepo = {
      count: jest.fn(),
    };
    const warrantyRepo = {
      createQueryBuilder: jest.fn(),
    };
    const redis = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const service = new DashboardService(
      orderRepo as never,
      orderItemRepo as never,
      paymentRepo as never,
      productRepo as never,
      warrantyRepo as never,
      redis as never,
    );

    return {
      service,
      redis,
      orderRepo,
      orderItemRepo,
      paymentRepo,
      productRepo,
      warrantyRepo,
    };
  };

  const mockComputedOverview = (service: DashboardService) => {
    const dashboard = service as any;

    jest.spyOn(dashboard, 'getTotalRevenue').mockResolvedValue(1000);
    jest.spyOn(dashboard, 'getOrderCount').mockResolvedValue(25);
    jest.spyOn(dashboard, 'getProductCount').mockResolvedValue(50);
    jest.spyOn(dashboard, 'getWarrantyCount').mockResolvedValue(4);
    jest
      .spyOn(dashboard, 'getRevenueByPaymentStatus')
      .mockResolvedValue([{ status: 'success', amount: 1000 }]);
    jest
      .spyOn(dashboard, 'getOrdersByStatus')
      .mockResolvedValue([{ status: 'pending', count: 10 }]);
    jest.spyOn(dashboard, 'getTopProducts').mockResolvedValue([
      {
        productId: 1,
        productName: 'Laptop A',
        totalSold: 5,
        revenue: 500,
      },
    ]);
    jest
      .spyOn(dashboard, 'getWarrantyByStatus')
      .mockResolvedValue([{ status: 'new', count: 2 }]);
    jest.spyOn(dashboard, 'getRecentOrders').mockResolvedValue([
      {
        id: 1,
        orderCode: 'ORD-1',
        customerName: 'A',
        total: 500,
        status: 'pending',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  };

  it('should return cached overview when cache exists', async () => {
    const { service, redis, orderRepo, paymentRepo } = createService();
    const cached = { totalRevenue: 999 };
    redis.get.mockResolvedValue(JSON.stringify(cached));

    const result = await service.getOverview({ topProductsLimit: 5 });

    expect(result).toEqual(cached);
    expect(redis.set).not.toHaveBeenCalled();
    expect(orderRepo.createQueryBuilder).not.toHaveBeenCalled();
    expect(paymentRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('should compute overview and write cache on cache miss', async () => {
    const { service, redis } = createService();
    redis.get.mockResolvedValue(null);
    mockComputedOverview(service);

    const result = await service.getOverview({
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      topProductsLimit: 7,
    });

    expect(result).toEqual({
      totalRevenue: 1000,
      orderCount: 25,
      productCount: 50,
      warrantyCount: 4,
      revenueByStatus: [{ status: 'success', amount: 1000 }],
      ordersByStatus: [{ status: 'pending', count: 10 }],
      topProducts: [
        {
          productId: 1,
          productName: 'Laptop A',
          totalSold: 5,
          revenue: 500,
        },
      ],
      warrantyByStatus: [{ status: 'new', count: 2 }],
      recentOrders: [
        {
          id: 1,
          orderCode: 'ORD-1',
          customerName: 'A',
          total: 500,
          status: 'pending',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    expect(redis.set).toHaveBeenCalledWith(
      'dashboard:overview:{"fromDate":"2026-01-01","toDate":"2026-01-31","topProductsLimit":7}',
      JSON.stringify(result),
      'EX',
      30,
    );
  });

  it('should fallback to compute overview when cache read fails', async () => {
    const { service, redis } = createService();
    redis.get.mockRejectedValue(new Error('redis down'));
    mockComputedOverview(service);

    const result = await service.getOverview({});

    expect(result.totalRevenue).toBe(1000);
    expect(redis.set).toHaveBeenCalled();
  });
});
