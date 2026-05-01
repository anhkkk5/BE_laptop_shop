import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductModule } from '../product/product.module.js';
import { CompatibilityRule } from './entities/compatibility-rule.entity.js';
import { PcBuildService } from './services/pc-build.service.js';
import { PcBuildController } from './controllers/client/pc-build.controller.js';
import { PcBuildAdminController } from './controllers/admin/pc-build-admin.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([CompatibilityRule]), ProductModule],
  controllers: [PcBuildController, PcBuildAdminController],
  providers: [PcBuildService],
  exports: [PcBuildService],
})
export class PcBuildModule {}
