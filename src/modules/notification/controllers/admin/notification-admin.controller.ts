import { Controller, Get, Post, Query } from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { UserRole } from '../../../user/enums/user-role.enum.js';
import { NotificationService } from '../../services/notification.service.js';

@Controller('admin/notifications')
@Roles(UserRole.ADMIN, UserRole.STAFF)
export class NotificationAdminController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('queue-stats')
  async getQueueStats() {
    return this.notificationService.getQueueStats();
  }

  @Get('dlq')
  async getDeadLetterJobs(@Query('limit') limit?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.notificationService.getDeadLetterJobs(parsedLimit);
  }

  @Post('dlq/retry')
  async retryDeadLetterJobs(@Query('limit') limit?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.notificationService.retryDeadLetterJobs(parsedLimit);
  }
}
