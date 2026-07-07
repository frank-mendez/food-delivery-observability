import { Injectable } from '@nestjs/common';
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
  ) {}

  async check() {
    const [postgresResult, redisResult] = await Promise.allSettled([
      this.prismaService.$queryRaw`SELECT 1`,
      this.redisService.ping(),
    ]);

    const services = {
      api: { status: 'ok' } satisfies DependencyStatus,
      postgres: this.toDependencyStatus(postgresResult),
      redis: this.toDependencyStatus(redisResult),
    };

    const status =
      services.postgres.status === 'ok' && services.redis.status === 'ok'
        ? 'ok'
        : 'degraded';

    return {
      status,
      services,
      timestamp: new Date().toISOString(),
    };
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
}
