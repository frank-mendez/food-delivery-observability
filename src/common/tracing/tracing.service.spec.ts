import { SpanStatusCode } from '@opentelemetry/api';
import { RequestContextService } from '../request-context/request-context.service';
import { TracingService } from './tracing.service';

describe('TracingService', () => {
  it('runs work inside an active span wrapper', async () => {
    const service = new TracingService(new RequestContextService());

    await expect(
      service.startActiveSpan(
        'TestSpan',
        { 'food_delivery.layer': 'test' },
        async () => {
          await Promise.resolve();
          return 'done';
        },
      ),
    ).resolves.toBe('done');
  });

  it('propagates callback errors', async () => {
    const service = new TracingService(new RequestContextService());

    await expect(
      service.startActiveSpan(
        'TestSpan',
        { 'food_delivery.layer': 'test' },
        async () => {
          await Promise.resolve();
          throw new Error('span failed');
        },
      ),
    ).rejects.toThrow('span failed');
  });

  it('marks spans as errored for non-error failures', () => {
    const service = new TracingService(new RequestContextService());
    const span = {
      setStatus: jest.fn(),
      recordException: jest.fn(),
    };

    service.recordError(span as never, 'bad failure');

    expect(span.recordException).not.toHaveBeenCalled();
    expect(span.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: 'Unknown error',
    });
  });
});
