import { HealthService } from './health.service';

describe('HealthService', () => {
  const metricsService = {
    setDatabaseConnectionStatus: jest.fn(),
    setRedisConnectionStatus: jest.fn(),
  };
  const logger = {
    error: jest.fn(),
  };
  const tracingService = {
    startActiveSpan: jest.fn(
      (
        _name: string,
        _attributes: Record<string, unknown>,
        callback: () => unknown,
      ) => callback(),
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ok when PostgreSQL and Redis are healthy', async () => {
    const service = new HealthService(
      {
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      } as never,
      {
        ping: jest.fn().mockResolvedValue('PONG'),
      } as never,
      metricsService as never,
      logger as never,
      tracingService as never,
    );

    await expect(service.check()).resolves.toMatchObject({
      status: 'ok',
      services: {
        api: { status: 'ok' },
        postgres: { status: 'ok' },
        redis: { status: 'ok' },
      },
    });
    expect(metricsService.setDatabaseConnectionStatus).toHaveBeenCalledWith(
      true,
    );
    expect(metricsService.setRedisConnectionStatus).toHaveBeenCalledWith(true);
  });

  it('returns degraded when a dependency fails', async () => {
    const service = new HealthService(
      {
        $queryRaw: jest
          .fn()
          .mockRejectedValue(new Error('database unavailable')),
      } as never,
      {
        ping: jest.fn().mockResolvedValue('PONG'),
      } as never,
      metricsService as never,
      logger as never,
      tracingService as never,
    );

    await expect(service.check()).resolves.toMatchObject({
      status: 'degraded',
      services: {
        postgres: {
          status: 'error',
          message: 'database unavailable',
        },
        redis: { status: 'ok' },
      },
    });
    expect(metricsService.setDatabaseConnectionStatus).toHaveBeenCalledWith(
      false,
    );
    expect(logger.error).toHaveBeenCalledWith('Database error', {
      target: 'postgres',
      dependencyMessage: 'database unavailable',
    });
  });
});
