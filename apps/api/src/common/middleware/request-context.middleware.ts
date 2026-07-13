import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { RequestContextService } from '../request-context/request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContextService: RequestContextService) {}

  use(request: Request, response: Response, next: NextFunction) {
    const requestId = this.getHeader(request, 'x-request-id');
    const correlationId = this.getHeader(request, 'x-correlation-id');
    const context = this.requestContextService.create({
      requestId,
      correlationId: correlationId ?? requestId,
      endpoint: request.path,
      method: request.method,
      userAgent: this.getHeader(request, 'user-agent'),
      ip: request.ip || request.socket.remoteAddress || null,
    });

    response.setHeader('x-request-id', context.requestId);
    response.setHeader('x-correlation-id', context.correlationId);

    this.requestContextService.run(context, next);
  }

  private getHeader(request: Request, name: string): string | undefined {
    const value = request.headers[name];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
