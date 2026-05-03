import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  async checkAndStore(key: string, ttlSeconds = 300): Promise<boolean> {
    const exists = await this.redis.get(`idempotency:${key}`);
    if (exists) return false;
    await this.redis.setex(`idempotency:${key}`, ttlSeconds, '1');
    return true;
  }
}
