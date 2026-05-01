import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationAdminController } from './controllers/admin/notification-admin.controller.js';
import { NotificationController } from './controllers/notification.controller.js';
import { Notification } from './entities/notification.entity.js';
import { NotificationEventsListener } from './listeners/notification-events.listener.js';
import { NotificationService } from './services/notification.service.js';
import { NotificationStreamService } from './services/notification-stream.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), AuthModule],
  controllers: [NotificationController, NotificationAdminController],
  providers: [
    NotificationService,
    NotificationEventsListener,
    NotificationStreamService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
