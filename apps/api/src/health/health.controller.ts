import { Controller, Get } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  async check() {
    this.metricsService.incrementHealthChecks();
    return this.healthService.check();
  }
}
