import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderModule } from '../order/order.module.js';
import { WarrantyTicket } from './entities/warranty-ticket.entity.js';
import { RepairLog } from './entities/repair-log.entity.js';
import { WarrantyService } from './services/warranty.service.js';
import { WarrantyController } from './controllers/client/warranty.controller.js';
import { WarrantyAdminController } from './controllers/admin/warranty-admin.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([WarrantyTicket, RepairLog]), OrderModule],
  controllers: [WarrantyController, WarrantyAdminController],
  providers: [WarrantyService],
  exports: [WarrantyService],
})
export class WarrantyModule {}
