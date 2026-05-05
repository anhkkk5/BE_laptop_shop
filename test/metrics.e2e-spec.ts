import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { MetricsController } from '../src/modules/health/metrics.controller';
import { MetricsService } from '../src/modules/health/metrics.service';

describe('Metrics endpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: {
            getPrometheusMetrics: jest
              .fn()
              .mockResolvedValue('app_up 1\nnotification_queue_pending 0\n'),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/metrics (GET)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/metrics')
      .expect(200)
      .expect('content-type', /text\/plain/)
      .expect((res) => {
        expect(res.text).toContain('app_up 1');
      });
  });
});
