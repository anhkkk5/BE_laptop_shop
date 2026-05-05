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
import { PaymentAdminController } from '../src/modules/payment/controllers/admin/payment-admin.controller';
import { PaymentService } from '../src/modules/payment/services/payment.service';
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

    req.user = { id: 1000, role };
    return true;
  }
}

describe('PaymentAdminController (e2e)', () => {
  let app: INestApplication;
  const paymentService = {
    getByOrderId: jest.fn(),
    simulateSuccess: jest.fn(),
    simulateFailed: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentAdminController],
      providers: [
        {
          provide: PaymentService,
          useValue: paymentService,
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

  it('should block customer role on simulate payment endpoint', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/payments/simulate/11/success')
      .set('x-role', UserRole.CUSTOMER)
      .expect(403);
  });

  it('should allow staff role and call simulateSuccess', async () => {
    paymentService.simulateSuccess.mockResolvedValueOnce({
      orderId: 11,
      status: 'success',
    });

    await request(app.getHttpServer())
      .post('/api/v1/admin/payments/simulate/11/success')
      .set('x-role', UserRole.STAFF)
      .expect(201);

    expect(paymentService.simulateSuccess).toHaveBeenCalledWith(11);
  });
});
