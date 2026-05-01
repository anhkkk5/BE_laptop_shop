import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './controllers/notification.controller.js';
import { Notification } from './entities/notification.entity.js';
import { NotificationEventsListener } from './listeners/notification-events.listener.js';
import { NotificationService } from './services/notification.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationEventsListener],
  exports: [NotificationService],
})
export class NotificationModule {}
