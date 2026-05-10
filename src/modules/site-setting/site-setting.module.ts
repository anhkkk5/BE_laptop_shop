import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteSettingController } from './controllers/site-setting.controller.js';
import { SiteSettingService } from './services/site-setting.service.js';
import { SiteSettingRepository } from './repositories/site-setting.repository.js';
import { SiteSetting } from './entities/site-setting.entity.js';
import { CloudinaryService } from '../../common/services/cloudinary.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([SiteSetting])],
  controllers: [SiteSettingController],
  providers: [SiteSettingService, SiteSettingRepository, CloudinaryService],
  exports: [SiteSettingService],
})
export class SiteSettingModule {}
