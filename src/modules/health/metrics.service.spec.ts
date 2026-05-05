import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('should render prometheus metrics with health and queue stats', async () => {
    const healthService = {
      check: jest.fn().mockResolvedValue({
        status: 'ok',
        services: { database: 'up', redis: 'up' },
      }),
    };

    const notificationService = {
      getQueueStats: jest.fn().mockResolvedValue({
        pending: 5,
        retrying: 2,
        deadLetter: 1,
      }),
    };

    const service = new MetricsService(
      healthService as never,
      notificationService as never,
    );

    const text = await service.getPrometheusMetrics();

    expect(text).toContain('app_up 1');
    expect(text).toContain('app_health_database_up 1');
    expect(text).toContain('app_health_redis_up 1');
    expect(text).toContain('notification_queue_pending 5');
    expect(text).toContain('notification_queue_retrying 2');
    expect(text).toContain('notification_queue_dead_letter 1');
    expect(text).toContain('process_uptime_seconds');
  });
});
