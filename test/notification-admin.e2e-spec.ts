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
import { NotificationAdminController } from '../src/modules/notification/controllers/admin/notification-admin.controller';
import { NotificationService } from '../src/modules/notification/services/notification.service';
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

describe('NotificationAdminController (e2e)', () => {
  let app: INestApplication;
  const notificationService = {
    getQueueStats: jest.fn(),
    getDeadLetterJobs: jest.fn(),
    retryDeadLetterJobs: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationAdminController],
      providers: [
        {
          provide: NotificationService,
          useValue: notificationService,
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

  it('should block customer role on admin queue stats endpoint', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/notifications/queue-stats')
      .set('x-role', UserRole.CUSTOMER)
      .expect(403);
  });

  it('should allow staff role to view queue stats', async () => {
    notificationService.getQueueStats.mockResolvedValueOnce({
      pending: 4,
      retrying: 1,
      deadLetter: 2,
    });

    await request(app.getHttpServer())
      .get('/api/v1/admin/notifications/queue-stats')
      .set('x-role', UserRole.STAFF)
      .expect(200)
      .expect({ pending: 4, retrying: 1, deadLetter: 2 });

    expect(notificationService.getQueueStats).toHaveBeenCalledTimes(1);
  });

  it('should allow admin role to retry dead-letter jobs', async () => {
    notificationService.retryDeadLetterJobs.mockResolvedValueOnce({ retried: 3 });

    await request(app.getHttpServer())
      .post('/api/v1/admin/notifications/dlq/retry?limit=3')
      .set('x-role', UserRole.ADMIN)
      .expect(201)
      .expect({ retried: 3 });

    expect(notificationService.retryDeadLetterJobs).toHaveBeenCalledWith(3);
  });
});
