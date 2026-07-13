import { Injectable } from '@nestjs/common';
import { Attributes, Span, SpanStatusCode, trace } from '@opentelemetry/api';
import { RequestContextService } from '../request-context/request-context.service';

@Injectable()
export class TracingService {
  private readonly tracer = trace.getTracer('food-delivery-api');

  constructor(private readonly requestContextService: RequestContextService) {}

  async startActiveSpan<T>(
    name: string,
    attributes: Attributes,
    callback: (span: Span) => Promise<T>,
  ): Promise<T> {
    return this.tracer.startActiveSpan(name, { attributes }, async (span) => {
      this.requestContextService.captureActiveTraceContext();

      try {
        const result = await callback(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        this.recordError(span, error);
        throw error;
      } finally {
        this.requestContextService.captureActiveTraceContext();
        span.end();
      }
    });
  }

  recordError(span: Span, error: unknown) {
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
}
