import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnRequest } from './entities/return-request.entity.js';
import { ReturnItem } from './entities/return-item.entity.js';
import { RefundTransaction } from './entities/refund-transaction.entity.js';
import { ReturnInspectionReport } from './entities/return-inspection-report.entity.js';
import { ReturnService } from './services/return.service.js';
import { ReturnController } from './controllers/client/return.controller.js';
import { ReturnAdminController } from './controllers/admin/return-admin.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReturnRequest,
      ReturnItem,
      RefundTransaction,
      ReturnInspectionReport,
    ]),
  ],
  controllers: [ReturnController, ReturnAdminController],
  providers: [ReturnService],
  exports: [ReturnService],
})
export class ReturnModule {}
