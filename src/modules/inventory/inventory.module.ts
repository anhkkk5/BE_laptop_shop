import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Inventory } from './entities/inventory.entity.js';
import { StockMovement } from './entities/stock-movement.entity.js';
import { StockReservation } from './entities/stock-reservation.entity.js';
import { InventoryRepository } from './repositories/inventory.repository.js';
import { StockMovementRepository } from './repositories/stock-movement.repository.js';
import { StockReservationRepository } from './repositories/stock-reservation.repository.js';
import { InventoryService } from './services/inventory.service.js';
import { StockReservationService } from './services/stock-reservation.service.js';
import { InventoryQueueInitializer } from './services/inventory-queue-initializer.service.js';
import { InventoryController } from './controllers/inventory.controller.js';
import { ReleaseExpiredProcessor } from './processors/release-expired.processor.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, StockMovement, StockReservation]),
    BullModule.registerQueue({
      name: 'inventory-queue',
    }),
  ],
  controllers: [InventoryController],
  providers: [
    InventoryRepository,
    StockMovementRepository,
    StockReservationRepository,
    InventoryService,
    StockReservationService,
    InventoryQueueInitializer,
    ReleaseExpiredProcessor,
  ],
  exports: [InventoryService, StockReservationService],
})
export class InventoryModule {}
