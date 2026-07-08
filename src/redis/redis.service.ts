import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';
import { TracingService } from '../common/tracing/tracing.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(
    configService: ConfigService,
    private readonly metricsService: MetricsService,
    private readonly logger: StructuredLoggerService,
    private readonly tracingService: TracingService,
  ) {
    const host = configService.get<string>('REDIS_HOST') ?? 'localhost';
    const port = Number(configService.get<string>('REDIS_PORT') ?? 6379);
    const password = configService.get<string>('REDIS_PASSWORD') || undefined;

    this.client = new Redis({
      host,
      port,
      password,
      connectTimeout: 1000,
      commandTimeout: 1000,
      maxRetriesPerRequest: 1,
      retryStrategy: (attempt) =>
        attempt > 3 ? null : Math.min(attempt * 100, 500),
    });

    this.client.on('ready', () => {
      this.metricsService.setRedisConnectionStatus(true);
      this.logger.info('Redis connected', {
        target: 'redis',
      });
    });
    this.client.on('end', () => {
      this.metricsService.setRedisConnectionStatus(false);
      this.logger.warn('Redis disconnected', {
        target: 'redis',
      });
    });
    this.client.on('error', (error) => {
      this.metricsService.setRedisConnectionStatus(false);
      this.logger.error('Redis failure', {
        error,
        target: 'redis',
      });
    });
  }

  async ping(): Promise<string> {
    return this.tracingService.startActiveSpan(
      'RedisService.ping',
      {
        'food_delivery.layer': 'redis',
        'db.system.name': 'redis',
        'db.operation.name': 'ping',
      },
      async () => {
        const endTimer = this.metricsService.startRedisOperationTimer('ping');

        try {
          const result = await this.client.ping();

          this.metricsService.setRedisConnectionStatus(true);
          endTimer('success');

          return result;
        } catch (error) {
          this.metricsService.setRedisConnectionStatus(false);
          endTimer('error');
          this.logger.error('Redis failure', {
            error,
            target: 'redis',
            operation: 'ping',
          });
          throw error;
        }
      },
    );
  }

  getClient(): Redis {
    return this.client;
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
