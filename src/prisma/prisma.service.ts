import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';
import { MetricsService } from '../metrics/metrics.service';

const PRISMA_LOG_CONFIG: [
  { emit: 'event'; level: 'query' },
  { emit: 'event'; level: 'warn' },
  { emit: 'event'; level: 'error' },
] = [
  { emit: 'event', level: 'query' },
  { emit: 'event', level: 'warn' },
  { emit: 'event', level: 'error' },
];

type PrismaServiceClientOptions = Prisma.PrismaClientOptions & {
  log: typeof PRISMA_LOG_CONFIG;
};

@Injectable()
export class PrismaService
  extends PrismaClient<PrismaServiceClientOptions>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;
  private readonly poolMetricsInterval: NodeJS.Timeout;

  constructor(
    configService: ConfigService,
    private readonly metricsService: MetricsService,
    private readonly logger: StructuredLoggerService,
  ) {
    const databaseUrl = configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required');
    }

    const pool = new Pool({
      connectionString: databaseUrl,
      max: Number(configService.get<string>('POSTGRES_POOL_MAX') ?? 10),
    });
    const adapter = new PrismaPg(pool, {
      disposeExternalPool: true,
      onPoolError: (error) => {
        metricsService.setDatabaseConnectionStatus(false);
        logger.error('Database error', {
          error,
          target: 'postgres_pool',
        });
      },
    });

    super({
      adapter,
      log: PRISMA_LOG_CONFIG,
    });

    this.pool = pool;
    this.poolMetricsInterval = setInterval(() => {
      this.recordPoolUsage();
    }, 5_000);
    this.poolMetricsInterval.unref();

    this.$on('query', (event: Prisma.QueryEvent) => {
      this.metricsService.recordDatabaseQuery(
        this.getDatabaseOperation(event.query),
        'success',
        event.duration / 1_000,
      );
      this.recordPoolUsage();
    });

    this.$on('warn', (event: Prisma.LogEvent) => {
      this.logger.warn('Database warning', {
        target: event.target,
        prismaMessage: event.message,
      });
    });

    this.$on('error', (event: Prisma.LogEvent) => {
      this.metricsService.setDatabaseConnectionStatus(false);
      this.logger.error('Database error', {
        target: event.target,
        prismaMessage: event.message,
      });
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.metricsService.setDatabaseConnectionStatus(true);
      this.recordPoolUsage();
    } catch (error) {
      this.metricsService.setDatabaseConnectionStatus(false);
      this.logger.error('Database error', { error });
      throw error;
    }
  }

  async onModuleDestroy() {
    clearInterval(this.poolMetricsInterval);
    await this.$disconnect();
  }

  private recordPoolUsage() {
    this.metricsService.setDatabaseConnectionPoolUsage({
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    });
  }

  private getDatabaseOperation(query: string): string {
    const operation = query
      .trim()
      .match(/^([a-z]+)/i)?.[1]
      ?.toLowerCase();

    if (!operation) {
      return 'unknown';
    }

    if (
      [
        'select',
        'insert',
        'update',
        'delete',
        'begin',
        'commit',
        'rollback',
      ].includes(operation)
    ) {
      return operation;
    }

    return 'other';
  }
}
