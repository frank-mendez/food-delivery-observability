import { Global, Module } from '@nestjs/common';
import { StructuredLoggerService } from './logging/structured-logger.service';
import { RequestContextService } from './request-context/request-context.service';
import { TracingService } from './tracing/tracing.service';

@Global()
@Module({
  providers: [RequestContextService, StructuredLoggerService, TracingService],
  exports: [RequestContextService, StructuredLoggerService, TracingService],
})
export class ObservabilityModule {}
