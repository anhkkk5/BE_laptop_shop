import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Banner } from './entities/banner.entity.js';
import { BannerRepository } from './repositories/banner.repository.js';
import { BannerService } from './services/banner.service.js';
import { BannerController } from './controllers/banner.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Banner])],
  controllers: [BannerController],
  providers: [BannerRepository, BannerService],
  exports: [BannerService],
})
export class BannerModule {}
