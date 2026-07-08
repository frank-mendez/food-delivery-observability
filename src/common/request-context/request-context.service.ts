import { Injectable } from '@nestjs/common';
import { context as otelContext, trace } from '@opentelemetry/api';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes, randomUUID } from 'node:crypto';

export type TraceContext = {
  traceId: string;
  spanId: string;
};

export type RequestContextData = TraceContext & {
  requestId: string;
  correlationId: string;
  endpoint: string | null;
  method: string | null;
  status: number | null;
  duration: number | null;
  userAgent: string | null;
  ip: string | null;
};

export type RequestContextInput = Partial<
  Pick<
    RequestContextData,
    'requestId' | 'correlationId' | 'endpoint' | 'method' | 'userAgent' | 'ip'
  >
>;

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextData>();

  create(input: RequestContextInput = {}): RequestContextData {
    const traceContext =
      this.getActiveTraceContext() ?? this.createTraceContext();
    const requestId = input.requestId ?? randomUUID();

    return {
      requestId,
      correlationId: input.correlationId ?? requestId,
      traceId: traceContext.traceId,
      spanId: traceContext.spanId,
      endpoint: input.endpoint ?? null,
      method: input.method ?? null,
      status: null,
      duration: null,
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
    };
  }

  run<T>(requestContext: RequestContextData, callback: () => T): T {
    return this.storage.run(requestContext, callback);
  }

  get(): RequestContextData | undefined {
    return this.storage.getStore();
  }

  update(partialContext: Partial<RequestContextData>) {
    const requestContext = this.get();

    if (!requestContext) {
      return;
    }

    Object.assign(requestContext, partialContext);
  }

  captureActiveTraceContext() {
    const traceContext = this.getActiveTraceContext();

    if (traceContext) {
      this.update(traceContext);
    }
  }

  getLogContext(
    overrides: Partial<RequestContextData> = {},
  ): RequestContextData {
    const requestContext = this.get();
    const activeTraceContext = this.getActiveTraceContext();
    const fallbackTraceContext =
      activeTraceContext ?? requestContext ?? this.createTraceContext();

    return {
      requestId: overrides.requestId ?? requestContext?.requestId ?? 'system',
      correlationId:
        overrides.correlationId ?? requestContext?.correlationId ?? 'system',
      traceId:
        overrides.traceId ??
        activeTraceContext?.traceId ??
        requestContext?.traceId ??
        fallbackTraceContext.traceId,
      spanId:
        overrides.spanId ??
        activeTraceContext?.spanId ??
        requestContext?.spanId ??
        fallbackTraceContext.spanId,
      endpoint: overrides.endpoint ?? requestContext?.endpoint ?? null,
      method: overrides.method ?? requestContext?.method ?? null,
      status: overrides.status ?? requestContext?.status ?? null,
      duration: overrides.duration ?? requestContext?.duration ?? null,
      userAgent: overrides.userAgent ?? requestContext?.userAgent ?? null,
      ip: overrides.ip ?? requestContext?.ip ?? null,
    };
  }

  private getActiveTraceContext(): TraceContext | undefined {
    const span = trace.getSpan(otelContext.active());
    const spanContext = span?.spanContext();

    if (!spanContext?.traceId || !spanContext.spanId) {
      return undefined;
    }

    if (/^0+$/.test(spanContext.traceId) || /^0+$/.test(spanContext.spanId)) {
      return undefined;
    }

    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }

  private createTraceContext(): TraceContext {
    return {
      traceId: randomBytes(16).toString('hex'),
      spanId: randomBytes(8).toString('hex'),
    };
  }
}
