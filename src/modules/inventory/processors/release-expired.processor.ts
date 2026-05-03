import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { StockReservationService } from '../services/stock-reservation.service.js';

@Processor('inventory-queue', {
  concurrency: 1,
})
export class ReleaseExpiredProcessor extends WorkerHost {
  constructor(private readonly reservationService: StockReservationService) {
    super();
  }

  async process(_job: Job<unknown>): Promise<{ released: number }> {
    const count = await this.reservationService.releaseExpired();
    return { released: count };
  }
}
