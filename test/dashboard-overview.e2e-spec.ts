import {
  CanActivate,
  ExecutionContext,
  Injectable,
  INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { UserRole } from '../src/common/constants';
import { DashboardController } from '../src/modules/dashboard/controllers/dashboard.controller';
import { DashboardService } from '../src/modules/dashboard/services/dashboard.service';

@Injectable()
class HeaderAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user?: unknown }>();
    const role = req.headers['x-role'];

    if (!role) {
      return false;
    }

    req.user = { id: 999, role };
    return true;
  }
}

describe('DashboardController (e2e)', () => {
  let app: INestApplication;
  const dashboardService = {
    getOverview: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: dashboardService,
        },
        {
          provide: Reflector,
          useClass: Reflector,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();

    const reflector = app.get(Reflector);
    app.useGlobalGuards(new HeaderAuthGuard(), new RolesGuard(reflector));

    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should block customer role on dashboard overview endpoint', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/overview')
      .set('x-role', UserRole.CUSTOMER)
      .expect(403);
  });

  it('should allow staff role and forward query params', async () => {
    dashboardService.getOverview.mockResolvedValueOnce({
      totalRevenue: 0,
      orderCount: 0,
      productCount: 0,
      warrantyCount: 0,
      revenueByStatus: [],
      ordersByStatus: [],
      topProducts: [],
      warrantyByStatus: [],
      recentOrders: [],
    });

    await request(app.getHttpServer())
      .get(
        '/api/v1/dashboard/overview?fromDate=2026-01-01&toDate=2026-01-31&topProductsLimit=8',
      )
      .set('x-role', UserRole.STAFF)
      .expect(200)
      .expect((res) => {
        expect(res.body.totalRevenue).toBe(0);
      });

    expect(dashboardService.getOverview).toHaveBeenCalledWith({
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      topProductsLimit: '8',
    });
  });
});
