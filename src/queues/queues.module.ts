import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { QueuesService } from './queues.service';

@Module({
  imports: [MetricsModule],
  providers: [QueuesService],
  exports: [QueuesService],
})
export class QueuesModule {}
