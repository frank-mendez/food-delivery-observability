import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';
import { TracingService } from '../common/tracing/tracing.service';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DomainEventsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly metricsService: MetricsService,
    private readonly logger: StructuredLoggerService,
    private readonly tracingService: TracingService,
  ) {}

  async recordEvent(
    aggregateType: string,
    aggregateId: string,
    type: string,
    payload: Prisma.InputJsonValue,
  ) {
    return this.tracingService.startActiveSpan(
      'DomainEventsService.recordEvent',
      {
        'food_delivery.layer': 'service',
        'food_delivery.domain_event.type': type,
        'food_delivery.domain_event.aggregate_type': aggregateType,
      },
      async () => {
        const event = await this.prismaService.domainEvent.create({
          data: {
            aggregateType,
            aggregateId,
            type,
            payload,
          },
        });

        this.metricsService.recordDomainEvent(aggregateType, type);
        this.logger.info('Domain event recorded', {
          eventType: type,
          aggregateType,
        });

        return event;
      },
    );
  }
}
