import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class InventoryQueueInitializer implements OnModuleInit {
  private readonly logger = new Logger(InventoryQueueInitializer.name);

  constructor(
    @InjectQueue('inventory-queue')
    private readonly inventoryQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    // upsertJobScheduler is idempotent — safe to call on every restart
    await this.inventoryQueue.upsertJobScheduler(
      'release-expired-scheduler',
      { every: 5 * 60 * 1000 },
      { name: 'release-expired', data: {} },
    );
    this.logger.log('Scheduled release-expired job every 5 minutes');
  }
}
