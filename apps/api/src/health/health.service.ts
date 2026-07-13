import { Injectable } from '@nestjs/common';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';
import { TracingService } from '../common/tracing/tracing.service';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

type DependencyStatus = {
  status: 'ok' | 'error';
  message?: string;
};

@Injectable()
export class HealthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly metricsService: MetricsService,
    private readonly logger: StructuredLoggerService,
    private readonly tracingService: TracingService,
  ) {}

  async check() {
    return this.tracingService.startActiveSpan(
      'HealthService.check',
      {
        'food_delivery.layer': 'service',
      },
      async () => {
        const [postgresResult, redisResult] = await Promise.allSettled([
          this.tracingService.startActiveSpan(
            'Prisma.healthCheck',
            {
              'food_delivery.layer': 'prisma',
              'db.system.name': 'postgresql',
              'db.operation.name': 'select',
            },
            async () => this.prismaService.$queryRaw`SELECT 1`,
          ),
          this.redisService.ping(),
        ]);

        const services = {
          api: { status: 'ok' } satisfies DependencyStatus,
          postgres: this.toDependencyStatus(postgresResult),
          redis: this.toDependencyStatus(redisResult),
        };

        this.metricsService.setDatabaseConnectionStatus(
          services.postgres.status === 'ok',
        );
        this.metricsService.setRedisConnectionStatus(
          services.redis.status === 'ok',
        );
        this.logDependencyFailures(services);

        const status =
          services.postgres.status === 'ok' && services.redis.status === 'ok'
            ? 'ok'
            : 'degraded';

        return {
          status,
          services,
          timestamp: new Date().toISOString(),
        };
      },
    );
  }

  private toDependencyStatus(
    result: PromiseSettledResult<unknown>,
  ): DependencyStatus {
    if (result.status === 'fulfilled') {
      return { status: 'ok' };
    }

    return {
      status: 'error',
      message:
        result.reason instanceof Error
          ? result.reason.message
          : 'Unknown error',
    };
  }

  private logDependencyFailures(services: {
    postgres: DependencyStatus;
    redis: DependencyStatus;
  }) {
    if (services.postgres.status === 'error') {
      this.logger.error('Database error', {
        target: 'postgres',
        dependencyMessage: services.postgres.message,
      });
    }

    if (services.redis.status === 'error') {
      this.logger.error('Redis failure', {
        target: 'redis',
        dependencyMessage: services.redis.message,
      });
    }
  }
}
