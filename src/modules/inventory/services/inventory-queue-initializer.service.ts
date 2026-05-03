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
    await this.inventoryQueue.add(
      'release-expired',
      {},
      {
        repeat: { every: 5 * 60 * 1000 },
        removeOnComplete: true,
      },
    );
    this.logger.log('Scheduled inventory release-expired job every 5 minutes');
  }
}
