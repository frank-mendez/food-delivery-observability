import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { MetricsService } from '../../metrics/metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const startedAt = process.hrtime.bigint();
    const route = this.getRoute(request);
    let recorded = false;

    this.metricsService.incrementActiveHttpRequests(request.method, route);

    return next.handle().pipe(
      tap({
        complete: () => {
          this.record(request.method, route, response.statusCode, startedAt);
          recorded = true;
        },
        error: (error) => {
          this.record(
            request.method,
            route,
            this.getErrorStatusCode(error, response.statusCode),
            startedAt,
          );
          recorded = true;
        },
      }),
      finalize(() => {
        if (!recorded) {
          this.record(request.method, route, response.statusCode, startedAt);
        }

        this.metricsService.decrementActiveHttpRequests(request.method, route);
      }),
    );
  }

  private record(
    method: string,
    route: string,
    statusCode: number,
    startedAt: bigint,
  ) {
    const durationSeconds =
      Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;

    this.metricsService.recordHttpRequest(
      method,
      route,
      statusCode,
      durationSeconds,
    );
  }

  private getRoute(request: Request): string {
    const route = request.route as { path?: string } | undefined;

    if (route?.path) {
      return `${request.baseUrl}${String(route.path)}`;
    }

    return request.path || 'unknown';
  }

  private getErrorStatusCode(
    error: unknown,
    fallbackStatusCode: number,
  ): number {
    if (this.hasHttpStatus(error)) {
      return Number(error.getStatus());
    }

    return fallbackStatusCode >= 400 ? fallbackStatusCode : 500;
  }

  private hasHttpStatus(error: unknown): error is { getStatus: () => unknown } {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as Record<string, unknown>;

    return typeof candidate.getStatus === 'function';
  }
}
