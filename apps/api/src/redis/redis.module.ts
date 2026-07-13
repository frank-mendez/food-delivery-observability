import { Global, Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [MetricsModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
