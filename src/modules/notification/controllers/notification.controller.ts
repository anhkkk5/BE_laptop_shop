import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { QueryNotificationDto } from '../dtos/query-notification.dto.js';
import { NotificationService } from '../services/notification.service.js';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getMyNotifications(
    @CurrentUser('id') userId: number,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationService.findMyNotifications(userId, query);
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) notificationId: number,
  ) {
    return this.notificationService.markAsRead(userId, notificationId);
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser('id') userId: number) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser('id') userId: number) {
    return this.notificationService.getUnreadCount(userId);
  }
}
