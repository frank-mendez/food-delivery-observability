import { RequestContextService } from '../request-context/request-context.service';
import { StructuredLoggerService } from './structured-logger.service';

describe('StructuredLoggerService', () => {
  let stdoutWrite: jest.SpiedFunction<typeof process.stdout.write>;
  const originalLogLevel = process.env.LOG_LEVEL;

  beforeEach(() => {
    process.env.LOG_LEVEL = 'debug';
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWrite.mockRestore();
    process.env.LOG_LEVEL = originalLogLevel;
  });

  it('writes structured JSON with request and trace fields', () => {
    const requestContextService = new RequestContextService();
    const logger = new StructuredLoggerService(requestContextService);
    const requestContext = requestContextService.create({
      requestId: 'request-1',
      endpoint: '/orders',
      method: 'POST',
      userAgent: 'jest',
      ip: '127.0.0.1',
    });

    requestContextService.run(requestContext, () => {
      logger.info('API request completed', {
        status: 201,
        duration: 0.05,
      });
    });

    const record = JSON.parse(String(stdoutWrite.mock.calls[0][0])) as Record<
      string,
      unknown
    >;

    expect(record).toMatchObject({
      traceId: requestContext.traceId,
      spanId: requestContext.spanId,
      requestId: 'request-1',
      level: 'info',
      endpoint: '/orders',
      method: 'POST',
      status: 201,
      duration: 0.05,
      userAgent: 'jest',
      ip: '127.0.0.1',
      message: 'API request completed',
    });
  });

  it('supports Nest logger methods and normalizes errors', () => {
    const logger = new StructuredLoggerService(new RequestContextService());

    logger.log({ event: 'boot' }, 'Bootstrap');
    logger.warn('warn message', 'WarningContext');
    logger.debug('debug message', { endpoint: '/debug' });
    logger.verbose('verbose message', { nestedError: new Error('nested') });
    logger.error(new Error('boom'), 'stack trace', 'ErrorContext');

    const records = stdoutWrite.mock.calls.map(
      ([chunk]) => JSON.parse(String(chunk)) as Record<string, unknown>,
    );

    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'info',
          context: 'Bootstrap',
          message: '{"event":"boot"}',
        }),
        expect.objectContaining({
          level: 'warn',
          context: 'WarningContext',
          message: 'warn message',
        }),
        expect.objectContaining({
          level: 'debug',
          endpoint: '/debug',
          message: 'debug message',
        }),
        expect.objectContaining({
          level: 'verbose',
          nestedErrorName: 'Error',
          nestedErrorMessage: 'nested',
          message: 'verbose message',
        }),
        expect.objectContaining({
          level: 'error',
          context: 'ErrorContext',
          stack: 'stack trace',
          message: 'boom',
        }),
      ]),
    );
  });

  it('honors silent log level', () => {
    process.env.LOG_LEVEL = 'silent';

    const logger = new StructuredLoggerService(new RequestContextService());

    logger.info('hidden');

    expect(stdoutWrite).not.toHaveBeenCalled();
  });

  it('falls back to info for unknown log levels', () => {
    process.env.LOG_LEVEL = 'unknown';

    const logger = new StructuredLoggerService(new RequestContextService());

    logger.info('visible');

    expect(stdoutWrite).toHaveBeenCalledTimes(1);
  });
});
