import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { Redis } from 'ioredis';
import { Repository } from 'typeorm';
import { QueryNotificationDto } from '../dtos/query-notification.dto.js';
import {
  Notification,
  NotificationType,
} from '../entities/notification.entity.js';

type NotificationJob = {
  userId: number;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  attempts: number;
};

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationService.name);
  private readonly queueKey = 'notifications:queue';
  private readonly retryKey = 'notifications:retry';
  private readonly deadLetterKey = 'notifications:dlq';
  private readonly maxAttempts = 3;
  private readonly pollIntervalMs = 2000;
  private readonly retryDelayMs = 3000;

  private intervalRef: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  onModuleInit() {
    this.intervalRef = setInterval(() => {
      void this.flushRetryJobs();
      void this.processQueueBatch();
    }, this.pollIntervalMs);
  }

  onModuleDestroy() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  async enqueueDelivery(payload: {
    userId: number;
    type: NotificationType;
    title: string;
    content: string;
    data?: Record<string, unknown>;
  }) {
    const job: NotificationJob = {
      ...payload,
      attempts: 0,
    };

    await this.redis.rpush(this.queueKey, JSON.stringify(job));
  }

  async findMyNotifications(userId: number, query: QueryNotificationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [data, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async markAsRead(userId: number, notificationId: number) {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      await this.notificationRepo.save(notification);
    }

    return { updated: true };
  }

  async markAllAsRead(userId: number) {
    await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('user_id = :userId', { userId })
      .andWhere('is_read = :isRead', { isRead: false })
      .execute();

    return { updated: true };
  }

  async getUnreadCount(userId: number) {
    const unread = await this.notificationRepo.count({
      where: { userId, isRead: false },
    });

    return { unread };
  }

  async getQueueStats() {
    const [pending, retrying, deadLetter] = await Promise.all([
      this.redis.llen(this.queueKey),
      this.redis.zcard(this.retryKey),
      this.redis.llen(this.deadLetterKey),
    ]);

    return { pending, retrying, deadLetter };
  }

  async getDeadLetterJobs(limit = 20) {
    const safeLimit = Number.isInteger(limit)
      ? Math.min(Math.max(limit, 1), 100)
      : 20;
    const jobs = await this.redis.lrange(this.deadLetterKey, 0, safeLimit - 1);

    return jobs.map((job, index) => {
      try {
        return {
          index,
          payload: JSON.parse(job) as Record<string, unknown>,
          raw: job,
        };
      } catch {
        return {
          index,
          payload: null,
          raw: job,
        };
      }
    });
  }

  async retryDeadLetterJobs(limit = 20) {
    const safeLimit = Number.isInteger(limit)
      ? Math.min(Math.max(limit, 1), 100)
      : 20;

    let retried = 0;

    for (let i = 0; i < safeLimit; i += 1) {
      const rawJob = await this.redis.lpop(this.deadLetterKey);
      if (!rawJob) {
        break;
      }

      await this.redis.rpush(this.queueKey, rawJob);
      retried += 1;
    }

    return { retried };
  }

  private async flushRetryJobs() {
    const now = Date.now();
    const rawJobs = await this.redis.zrangebyscore(
      this.retryKey,
      0,
      now,
      'LIMIT',
      0,
      20,
    );

    if (!rawJobs.length) {
      return;
    }

    for (const rawJob of rawJobs) {
      await this.redis.rpush(this.queueKey, rawJob);
      await this.redis.zrem(this.retryKey, rawJob);
    }
  }

  private async processQueueBatch() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      for (let i = 0; i < 20; i += 1) {
        const rawJob = await this.redis.lpop(this.queueKey);

        if (!rawJob) {
          break;
        }

        await this.processJob(rawJob);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJob(rawJob: string) {
    let job: NotificationJob;

    try {
      job = JSON.parse(rawJob) as NotificationJob;
    } catch {
      this.logger.error('Invalid notification job payload', rawJob);
      await this.redis.rpush(this.deadLetterKey, rawJob);
      return;
    }

    try {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId: job.userId,
          type: job.type,
          title: job.title,
          content: job.content,
          data: job.data || null,
          isRead: false,
        }),
      );
    } catch (error) {
      const nextAttempt = job.attempts + 1;
      const retryJob = JSON.stringify({ ...job, attempts: nextAttempt });

      if (nextAttempt <= this.maxAttempts) {
        await this.redis.zadd(
          this.retryKey,
          String(Date.now() + this.retryDelayMs * nextAttempt),
          retryJob,
        );
        this.logger.warn(
          `Notification job retry ${nextAttempt}/${this.maxAttempts}`,
        );
        return;
      }

      await this.redis.rpush(this.deadLetterKey, retryJob);
      this.logger.error('Notification job moved to DLQ', error as Error);
    }
  }
}
