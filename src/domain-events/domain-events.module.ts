import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { DomainEventsService } from './domain-events.service';

@Module({
  imports: [MetricsModule],
  providers: [DomainEventsService],
  exports: [DomainEventsService],
})
export class DomainEventsModule {}
