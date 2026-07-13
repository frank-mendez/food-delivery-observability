import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { StructuredLoggerService } from '../logging/structured-logger.service';
import { RequestContextService } from '../request-context/request-context.service';

type ErrorResponseBody = {
  statusCode: number;
  error: string;
  message: string | string[];
  requestId: string;
  timestamp: string;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly logger: StructuredLoggerService,
    private readonly requestContextService: RequestContextService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const httpContext = host.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const status = this.getStatus(exception);
    const exceptionResponse = this.getExceptionResponse(exception);
    const message = this.getMessage(exceptionResponse, exception);
    const error = this.getError(exceptionResponse, status);
    const requestContext = this.requestContextService.getLogContext({
      endpoint: request.path,
      method: request.method,
      status,
      userAgent: this.getUserAgent(request),
      ip: request.ip || request.socket.remoteAddress || null,
    });

    this.requestContextService.update({
      endpoint: request.path,
      method: request.method,
      status,
    });

    this.logException(exception, {
      endpoint: request.path,
      method: request.method,
      status,
      userAgent: this.getUserAgent(request),
      ip: request.ip || request.socket.remoteAddress || null,
      error,
      exceptionName:
        exception instanceof Error ? exception.name : 'UnknownException',
      exceptionMessage:
        exception instanceof Error ? exception.message : String(exception),
      stack: exception instanceof Error ? exception.stack : undefined,
      validationErrors: Array.isArray(message) ? message : undefined,
    });

    if (response.headersSent) {
      return;
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      error,
      message,
      requestId: requestContext.requestId,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private logException(exception: unknown, metadata: Record<string, unknown>) {
    if (metadata.status === HttpStatus.BAD_REQUEST) {
      this.logger.warn('Validation failure', metadata);
      return;
    }

    if (this.isDatabaseError(exception)) {
      this.logger.error('Database error', metadata);
      return;
    }

    if (this.isRedisError(exception)) {
      this.logger.error('Redis failure', metadata);
      return;
    }

    if (typeof metadata.status === 'number' && metadata.status >= 500) {
      this.logger.error('Unexpected exception', metadata);
      return;
    }

    this.logger.warn('HTTP exception', metadata);
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getExceptionResponse(exception: unknown): unknown {
    if (exception instanceof HttpException) {
      return exception.getResponse();
    }

    return undefined;
  }

  private getMessage(
    exceptionResponse: unknown,
    exception: unknown,
  ): string | string[] {
    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const message = (exceptionResponse as { message?: unknown }).message;

      if (Array.isArray(message)) {
        return message.map(String);
      }

      if (typeof message === 'string') {
        return message;
      }
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Unexpected error';
  }

  private getError(exceptionResponse: unknown, status: number): string {
    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'error' in exceptionResponse
    ) {
      const error = (exceptionResponse as { error?: unknown }).error;

      if (typeof error === 'string') {
        return error;
      }
    }

    return status >= 500 ? 'Internal Server Error' : 'Request Error';
  }

  private isDatabaseError(exception: unknown): boolean {
    if (!(exception instanceof Error)) {
      return false;
    }

    return (
      exception.name.startsWith('Prisma') || exception.name === 'DatabaseError'
    );
  }

  private isRedisError(exception: unknown): boolean {
    if (!(exception instanceof Error)) {
      return false;
    }

    return (
      exception.name.includes('Redis') || exception.message.includes('Redis')
    );
  }

  private getUserAgent(request: Request): string | null {
    return request.get('user-agent') ?? null;
  }
}
