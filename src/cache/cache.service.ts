import { Injectable } from '@nestjs/common';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';
import { TracingService } from '../common/tracing/tracing.service';
import { MetricsService } from '../metrics/metrics.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CacheService {
  constructor(
    private readonly redisService: RedisService,
    private readonly metricsService: MetricsService,
    private readonly logger: StructuredLoggerService,
    private readonly tracingService: TracingService,
  ) {}

  async getJson<T>(cacheName: string, key: string): Promise<T | null> {
    return this.tracingService.startActiveSpan(
      'CacheService.getJson',
      {
        'food_delivery.layer': 'redis',
        'db.system.name': 'redis',
        'db.operation.name': 'get',
        'food_delivery.cache.name': cacheName,
      },
      async () => {
        const endTimer = this.metricsService.startCacheOperationTimer(
          cacheName,
          'get',
        );

        try {
          const value = await this.redisService.getClient().get(key);

          if (!value) {
            this.metricsService.recordCacheEvent(cacheName, 'miss');
            endTimer('miss');
            return null;
          }

          this.metricsService.recordCacheEvent(cacheName, 'hit');
          endTimer('hit');

          return JSON.parse(value) as T;
        } catch (error) {
          this.metricsService.recordCacheEvent(cacheName, 'error');
          endTimer('error');
          this.logger.warn('Cache read failed', {
            error,
            cacheName,
            operation: 'get',
          });

          return null;
        }
      },
    );
  }

  async setJson(
    cacheName: string,
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    await this.tracingService.startActiveSpan(
      'CacheService.setJson',
      {
        'food_delivery.layer': 'redis',
        'db.system.name': 'redis',
        'db.operation.name': 'set',
        'food_delivery.cache.name': cacheName,
      },
      async () => {
        const endTimer = this.metricsService.startCacheOperationTimer(
          cacheName,
          'set',
        );

        try {
          await this.redisService
            .getClient()
            .set(key, JSON.stringify(value), 'EX', ttlSeconds);
          this.metricsService.recordCacheEvent(cacheName, 'set');
          endTimer('success');
        } catch (error) {
          this.metricsService.recordCacheEvent(cacheName, 'error');
          endTimer('error');
          this.logger.warn('Cache write failed', {
            error,
            cacheName,
            operation: 'set',
          });
        }
      },
    );
  }

  async delete(cacheName: string, key: string): Promise<void> {
    const endTimer = this.metricsService.startCacheOperationTimer(
      cacheName,
      'delete',
    );

    try {
      await this.redisService.getClient().del(key);
      this.metricsService.incrementCacheInvalidation(cacheName);
      endTimer('success');
    } catch (error) {
      endTimer('error');
      this.logger.warn('Cache delete failed', {
        error,
        cacheName,
        operation: 'delete',
      });
    }
  }

  async deleteByPattern(cacheName: string, pattern: string): Promise<void> {
    const endTimer = this.metricsService.startCacheOperationTimer(
      cacheName,
      'delete_pattern',
    );

    try {
      let cursor = '0';
      let deletedKeys = 0;

      do {
        const [nextCursor, keys] = await this.redisService
          .getClient()
          .scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          deletedKeys += keys.length;
          await this.redisService.getClient().del(...keys);
        }
      } while (cursor !== '0');

      if (deletedKeys > 0) {
        this.metricsService.incrementCacheInvalidation(cacheName);
      }

      endTimer('success');
    } catch (error) {
      endTimer('error');
      this.logger.warn('Cache pattern delete failed', {
        error,
        cacheName,
        operation: 'delete_pattern',
      });
    }
  }
}
