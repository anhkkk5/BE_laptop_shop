import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';
import { redactValue } from '../utils/redact.util.js';

type RequestWithMeta = Request & { requestId?: string };

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithMeta>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl, ip } = request;
    const startedAt = Date.now();
    const requestId = request.requestId || 'n/a';
    const userAgent = request.get('user-agent') || 'unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startedAt;
          this.logger.log(
            JSON.stringify({
              requestId,
              level: 'info',
              method,
              path: originalUrl,
              statusCode: response.statusCode,
              durationMs,
              ip,
              userAgent,
              headers: redactValue(request.headers),
            }),
          );
        },
        error: (error: unknown) => {
          const durationMs = Date.now() - startedAt;
          const message =
            error instanceof Error ? error.message : 'Unknown request error';
          this.logger.error(
            JSON.stringify({
              requestId,
              level: 'error',
              method,
              path: originalUrl,
              statusCode: response.statusCode,
              durationMs,
              ip,
              userAgent,
              message,
              headers: redactValue(request.headers),
            }),
          );
        },
      }),
    );
  }
}
