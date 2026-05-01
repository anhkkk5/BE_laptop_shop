import {
  Controller,
  Get,
  MessageEvent,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { CurrentUser, Public } from '../../../common/decorators/index.js';
import { QueryNotificationDto } from '../dtos/query-notification.dto.js';
import { NotificationService } from '../services/notification.service.js';
import { NotificationStreamService } from '../services/notification-stream.service.js';

type AccessTokenPayload = {
  sub: number;
};

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationStreamService: NotificationStreamService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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

  @Public()
  @Sse('stream')
  stream(@Query('token') token?: string): Observable<MessageEvent> {
    const userId = this.resolveUserIdFromToken(token);
    return this.notificationStreamService.subscribe(userId);
  }

  private resolveUserIdFromToken(token?: string): number {
    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      if (!payload?.sub) {
        throw new UnauthorizedException('Invalid access token');
      }

      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
