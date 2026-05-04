import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async check() {
    let databaseStatus = 'down';
    let redisStatus = 'down';

    try {
      await this.dataSource.query('SELECT 1');
      databaseStatus = 'up';
    } catch {
      databaseStatus = 'down';
    }

    try {
      const pong = await this.redis.ping();
      redisStatus = pong === 'PONG' ? 'up' : 'down';
    } catch {
      redisStatus = 'down';
    }

    const isHealthy = databaseStatus === 'up' && redisStatus === 'up';

    return {
      status: isHealthy ? 'ok' : 'degraded',
      services: {
        database: databaseStatus,
        redis: redisStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
