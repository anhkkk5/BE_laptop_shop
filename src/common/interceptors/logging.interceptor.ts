import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl, ip } = request;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startedAt;
          this.logger.log(
            `${method} ${originalUrl} ${response.statusCode} - ${durationMs}ms - ${ip}`,
          );
        },
        error: (error: unknown) => {
          const durationMs = Date.now() - startedAt;
          const message =
            error instanceof Error ? error.message : 'Unknown request error';
          this.logger.error(
            `${method} ${originalUrl} ${response.statusCode} - ${durationMs}ms - ${ip} - ${message}`,
          );
        },
      }),
    );
  }
}
