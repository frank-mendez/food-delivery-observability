import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { CacheService } from './cache.service';

@Module({
  imports: [MetricsModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
