import { Injectable } from '@nestjs/common';
import { NotificationService } from '../notification/services/notification.service.js';
import { HealthService } from './health.service.js';

@Injectable()
export class MetricsService {
  constructor(
    private readonly healthService: HealthService,
    private readonly notificationService: NotificationService,
  ) {}

  async getPrometheusMetrics(): Promise<string> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const env = process.env.NODE_ENV || 'development';

    const health = await this.healthService.check().catch(() => ({
      status: 'degraded',
      services: { database: 'down', redis: 'down' },
    }));

    const queueStats = await this.notificationService.getQueueStats().catch(() => ({
      pending: 0,
      retrying: 0,
      deadLetter: 0,
    }));

    const memory = process.memoryUsage();

    const appUp = health.status === 'ok' ? 1 : 0;
    const databaseUp = health.services.database === 'up' ? 1 : 0;
    const redisUp = health.services.redis === 'up' ? 1 : 0;

    return [
      '# HELP app_up Application health state (1=ok,0=degraded)',
      '# TYPE app_up gauge',
      `app_up ${appUp}`,
      '# HELP app_health_database_up Database dependency status (1=up,0=down)',
      '# TYPE app_health_database_up gauge',
      `app_health_database_up ${databaseUp}`,
      '# HELP app_health_redis_up Redis dependency status (1=up,0=down)',
      '# TYPE app_health_redis_up gauge',
      `app_health_redis_up ${redisUp}`,
      '# HELP notification_queue_pending Number of pending notification jobs',
      '# TYPE notification_queue_pending gauge',
      `notification_queue_pending ${queueStats.pending}`,
      '# HELP notification_queue_retrying Number of retrying notification jobs',
      '# TYPE notification_queue_retrying gauge',
      `notification_queue_retrying ${queueStats.retrying}`,
      '# HELP notification_queue_dead_letter Number of dead-letter notification jobs',
      '# TYPE notification_queue_dead_letter gauge',
      `notification_queue_dead_letter ${queueStats.deadLetter}`,
      '# HELP process_uptime_seconds Process uptime in seconds',
      '# TYPE process_uptime_seconds gauge',
      `process_uptime_seconds ${Math.floor(process.uptime())}`,
      '# HELP process_resident_memory_bytes Resident memory in bytes',
      '# TYPE process_resident_memory_bytes gauge',
      `process_resident_memory_bytes ${memory.rss}`,
      '# HELP process_heap_used_bytes Heap used in bytes',
      '# TYPE process_heap_used_bytes gauge',
      `process_heap_used_bytes ${memory.heapUsed}`,
      '# HELP process_heap_total_bytes Heap total in bytes',
      '# TYPE process_heap_total_bytes gauge',
      `process_heap_total_bytes ${memory.heapTotal}`,
      '# HELP app_build_info Static app info labels',
      '# TYPE app_build_info gauge',
      `app_build_info{env="${env}"} 1`,
      '# HELP app_metrics_generated_at_seconds Unix timestamp when metrics snapshot was generated',
      '# TYPE app_metrics_generated_at_seconds gauge',
      `app_metrics_generated_at_seconds ${nowSeconds}`,
      '',
    ].join('\n');
  }
}
