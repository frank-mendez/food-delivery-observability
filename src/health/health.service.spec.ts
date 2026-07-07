import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns ok when PostgreSQL and Redis are healthy', async () => {
    const service = new HealthService(
      {
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      } as never,
      {
        ping: jest.fn().mockResolvedValue('PONG'),
      } as never,
    );

    await expect(service.check()).resolves.toMatchObject({
      status: 'ok',
      services: {
        api: { status: 'ok' },
        postgres: { status: 'ok' },
        redis: { status: 'ok' },
      },
    });
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
  });
});
