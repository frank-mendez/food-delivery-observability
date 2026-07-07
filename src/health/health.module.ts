import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [MetricsModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
