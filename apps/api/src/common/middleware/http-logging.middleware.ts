import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { StructuredLoggerService } from '../logging/structured-logger.service';
import { RequestContextService } from '../request-context/request-context.service';

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: StructuredLoggerService,
    private readonly requestContextService: RequestContextService,
  ) {}

  use(request: Request, response: Response, next: NextFunction) {
    const startedAt = process.hrtime.bigint();

    this.requestContextService.update({
      endpoint: this.getEndpoint(request),
      method: request.method,
      userAgent: this.getUserAgent(request),
      ip: request.ip || request.socket.remoteAddress || null,
    });

    this.logger.info('API request started', {
      endpoint: this.getEndpoint(request),
      method: request.method,
      userAgent: this.getUserAgent(request),
      ip: request.ip || request.socket.remoteAddress || null,
    });

    response.on('finish', () => {
      const duration =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      const endpoint = this.getEndpoint(request);

      this.requestContextService.update({
        endpoint,
        method: request.method,
        status: response.statusCode,
        duration,
      });

      this.logger.info('API request completed', {
        endpoint,
        method: request.method,
        status: response.statusCode,
        duration,
        userAgent: this.getUserAgent(request),
        ip: request.ip || request.socket.remoteAddress || null,
      });
    });

    next();
  }

  private getEndpoint(request: Request): string {
    const route = request.route as { path?: string } | undefined;

    if (route?.path) {
      return `${request.baseUrl}${String(route.path)}`;
    }

    return request.path || request.originalUrl || 'unknown';
  }

  private getUserAgent(request: Request): string | null {
    return request.get('user-agent') ?? null;
  }
}
