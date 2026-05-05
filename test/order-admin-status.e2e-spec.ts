import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { OrderAdminController } from '../src/modules/order/controllers/admin/order-admin.controller';
import { OrderService } from '../src/modules/order/services/order.service';
import { UserRole } from '../src/modules/user/enums/user-role.enum';

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

describe('OrderAdminController (e2e)', () => {
  let app: INestApplication;
  const orderService = {
    findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
    findById: jest.fn().mockResolvedValue({ id: 1 }),
    updateStatus: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrderAdminController],
      providers: [
        {
          provide: OrderService,
          useValue: orderService,
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

  it('should block customer role on admin order status endpoint', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/admin/orders/1/status')
      .set('x-role', UserRole.CUSTOMER)
      .send({ status: 'confirmed' })
      .expect(403);
  });

  it('should return 400 when service rejects invalid transition', async () => {
    orderService.updateStatus.mockRejectedValueOnce(
      new BadRequestException('invalid transition'),
    );

    await request(app.getHttpServer())
      .patch('/api/v1/admin/orders/1/status')
      .set('x-role', UserRole.STAFF)
      .send({ status: 'processing' })
      .expect(400);
  });

  it('should allow warehouse role and call service with actor role', async () => {
    orderService.updateStatus.mockResolvedValueOnce(undefined);

    await request(app.getHttpServer())
      .patch('/api/v1/admin/orders/1/status')
      .set('x-role', UserRole.WAREHOUSE)
      .send({ status: 'processing' })
      .expect(200);

    expect(orderService.updateStatus).toHaveBeenCalledWith(
      1,
      { status: 'processing' },
      UserRole.WAREHOUSE,
    );
  });
});
