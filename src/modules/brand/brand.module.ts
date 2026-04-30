import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Brand } from './entities/brand.entity.js';
import { BrandRepository } from './repositories/brand.repository.js';
import { BrandService } from './services/brand.service.js';
import { BrandAdminController } from './controllers/admin/brand-admin.controller.js';
import { BrandController } from './controllers/client/brand.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Brand])],
  controllers: [BrandAdminController, BrandController],
  providers: [BrandRepository, BrandService],
  exports: [BrandService],
})
export class BrandModule {}
