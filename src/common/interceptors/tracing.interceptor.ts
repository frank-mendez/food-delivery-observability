import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import {
  context as otelContext,
  Span,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { RequestContextService } from '../request-context/request-context.service';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly tracer = trace.getTracer('food-delivery-api');

  constructor(private readonly requestContextService: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;
    const spanName = `${className}.${handlerName}`;

    return new Observable((observer) => {
      const span = this.tracer.startSpan(spanName, {
        attributes: {
          'food_delivery.layer': 'controller',
          'code.namespace': className,
          'code.function': handlerName,
          'http.request.method': request.method,
          'http.route': this.getEndpoint(request),
          'url.path': request.path,
        },
      });
      const activeContext = trace.setSpan(otelContext.active(), span);

      return otelContext.with(activeContext, () => {
        this.requestContextService.captureActiveTraceContext();

        const subscription = next
          .handle()
          .pipe(
            tap({
              error: (error) => this.recordError(span, error),
              complete: () => span.setStatus({ code: SpanStatusCode.OK }),
            }),
            finalize(() => {
              this.requestContextService.captureActiveTraceContext();
              span.end();
            }),
          )
          .subscribe({
            next: (value) => observer.next(value),
            error: (error) => observer.error(error),
            complete: () => observer.complete(),
          });

        return () => subscription.unsubscribe();
      });
    });
  }

  private recordError(span: Span, error: unknown) {
    if (error instanceof Error) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      return;
    }

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: 'Unknown error',
    });
  }

  private getEndpoint(request: Request): string {
    const route = request.route as { path?: string } | undefined;

    if (route?.path) {
      return `${request.baseUrl}${String(route.path)}`;
    }

    return request.path || 'unknown';
  }
}
