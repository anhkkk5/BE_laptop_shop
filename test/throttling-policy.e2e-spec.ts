import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
  SkipThrottle,
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';
import request from 'supertest';
import { HealthController } from '../src/modules/health/health.controller';
import { HealthService } from '../src/modules/health/health.service';
import { MetricsController } from '../src/modules/health/metrics.controller';
import { MetricsService } from '../src/modules/health/metrics.service';

@Controller()
class ProbeController {
  @Get('limited')
  limited() {
    return { ok: true };
  }

  @Get('unlimited')
  @SkipThrottle()
  unlimited() {
    return { ok: true };
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 1000, limit: 2 }],
    }),
  ],
  controllers: [ProbeController, HealthController, MetricsController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {
      provide: HealthService,
      useValue: {
        check: jest.fn().mockResolvedValue({
          status: 'ok',
          services: { database: 'up', redis: 'up' },
          timestamp: '2026-01-01T00:00:00.000Z',
        }),
      },
    },
    {
      provide: MetricsService,
      useValue: {
        getPrometheusMetrics: jest.fn().mockResolvedValue('app_up 1\n'),
      },
    },
  ],
})
class ThrottleTestModule {}

describe('Throttling policy (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottleTestModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should throttle regular endpoint after limit', async () => {
    await request(app.getHttpServer()).get('/api/v1/limited').expect(200);
    await request(app.getHttpServer()).get('/api/v1/limited').expect(200);
    await request(app.getHttpServer()).get('/api/v1/limited').expect(429);
  });

  it('should skip throttling for health endpoint', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });

  it('should skip throttling for metrics endpoint', async () => {
    await request(app.getHttpServer()).get('/api/v1/metrics').expect(200);
    await request(app.getHttpServer()).get('/api/v1/metrics').expect(200);
    await request(app.getHttpServer()).get('/api/v1/metrics').expect(200);
    await request(app.getHttpServer()).get('/api/v1/metrics').expect(200);
  });

  it('should skip throttling for explicit SkipThrottle route', async () => {
    await request(app.getHttpServer()).get('/api/v1/unlimited').expect(200);
    await request(app.getHttpServer()).get('/api/v1/unlimited').expect(200);
    await request(app.getHttpServer()).get('/api/v1/unlimited').expect(200);
    await request(app.getHttpServer()).get('/api/v1/unlimited').expect(200);
  });
});
