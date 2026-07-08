import { Injectable, LoggerService } from '@nestjs/common';
import { RequestContextData } from '../request-context/request-context.service';
import { RequestContextService } from '../request-context/request-context.service';

type StructuredLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'verbose';
type LogMetadata = Record<string, unknown>;

const LEVEL_PRIORITY: Record<StructuredLogLevel | 'silent', number> = {
  debug: 10,
  verbose: 15,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const CORE_FIELDS = new Set([
  'timestamp',
  'traceId',
  'spanId',
  'requestId',
  'correlationId',
  'level',
  'endpoint',
  'method',
  'status',
  'duration',
  'userAgent',
  'ip',
  'message',
]);

@Injectable()
export class StructuredLoggerService implements LoggerService {
  constructor(private readonly requestContextService: RequestContextService) {}

  log(message: unknown, context?: string) {
    this.write('info', message, context ? { context } : undefined);
  }

  info(message: unknown, metadata?: LogMetadata) {
    this.write('info', message, metadata);
  }

  error(
    message: unknown,
    traceOrMetadata?: string | LogMetadata,
    context?: string,
  ) {
    const metadata =
      typeof traceOrMetadata === 'string'
        ? { stack: traceOrMetadata, context }
        : traceOrMetadata;

    this.write('error', message, metadata);
  }

  warn(message: unknown, metadataOrContext?: string | LogMetadata) {
    const metadata =
      typeof metadataOrContext === 'string'
        ? { context: metadataOrContext }
        : metadataOrContext;

    this.write('warn', message, metadata);
  }

  debug(message: unknown, metadataOrContext?: string | LogMetadata) {
    const metadata =
      typeof metadataOrContext === 'string'
        ? { context: metadataOrContext }
        : metadataOrContext;

    this.write('debug', message, metadata);
  }

  verbose(message: unknown, metadataOrContext?: string | LogMetadata) {
    const metadata =
      typeof metadataOrContext === 'string'
        ? { context: metadataOrContext }
        : metadataOrContext;

    this.write('verbose', message, metadata);
  }

  private write(
    level: StructuredLogLevel,
    message: unknown,
    metadata: LogMetadata = {},
  ) {
    if (!this.shouldLog(level)) {
      return;
    }

    this.requestContextService.captureActiveTraceContext();

    const contextOverrides = this.pickContextOverrides(metadata);
    const logContext =
      this.requestContextService.getLogContext(contextOverrides);
    const normalizedMetadata = this.normalizeMetadata(metadata);
    const record: LogMetadata = {
      timestamp: new Date().toISOString(),
      traceId: logContext.traceId,
      spanId: logContext.spanId,
      requestId: logContext.requestId,
      correlationId: logContext.correlationId,
      level,
      endpoint: logContext.endpoint,
      method: logContext.method,
      status: logContext.status,
      duration: logContext.duration,
      userAgent: logContext.userAgent,
      ip: logContext.ip,
      message: this.stringifyMessage(message),
    };

    for (const [key, value] of Object.entries(normalizedMetadata)) {
      if (!CORE_FIELDS.has(key)) {
        record[key] = value;
      }
    }

    process.stdout.write(`${JSON.stringify(record)}\n`);
  }

  private shouldLog(level: StructuredLogLevel): boolean {
    const configuredLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
    const minimumLevel =
      configuredLevel in LEVEL_PRIORITY
        ? (configuredLevel as StructuredLogLevel | 'silent')
        : 'info';

    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minimumLevel];
  }

  private pickContextOverrides(
    metadata: LogMetadata,
  ): Partial<RequestContextData> {
    return {
      endpoint: this.asStringOrNull(metadata.endpoint),
      method: this.asStringOrNull(metadata.method),
      status: this.asNumberOrNull(metadata.status),
      duration: this.asNumberOrNull(metadata.duration),
      userAgent: this.asStringOrNull(metadata.userAgent),
      ip: this.asStringOrNull(metadata.ip),
    };
  }

  private normalizeMetadata(metadata: LogMetadata): LogMetadata {
    const normalized: LogMetadata = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (value instanceof Error) {
        normalized[`${key}Name`] = value.name;
        normalized[`${key}Message`] = value.message;
        normalized[`${key}Stack`] = value.stack;
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  private stringifyMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }

    if (message instanceof Error) {
      return message.message;
    }

    return JSON.stringify(message);
  }

  private asStringOrNull(value: unknown): string | null | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private asNumberOrNull(value: unknown): number | null | undefined {
    return typeof value === 'number' ? value : undefined;
  }
}
