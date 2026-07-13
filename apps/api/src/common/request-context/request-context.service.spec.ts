import { RequestContextService } from './request-context.service';

describe('RequestContextService', () => {
  it('stores request metadata and generated trace context', () => {
    const service = new RequestContextService();
    const context = service.create({
      requestId: 'request-1',
      endpoint: '/health',
      method: 'GET',
    });

    service.run(context, () => {
      service.update({
        status: 200,
        duration: 0.01,
      });

      expect(service.getLogContext()).toMatchObject({
        requestId: 'request-1',
        correlationId: 'request-1',
        endpoint: '/health',
        method: 'GET',
        status: 200,
        duration: 0.01,
      });
      expect(service.getLogContext().traceId).toHaveLength(32);
      expect(service.getLogContext().spanId).toHaveLength(16);
    });
  });

  it('returns system context outside a request scope', () => {
    const service = new RequestContextService();

    service.update({ status: 200 });
    service.captureActiveTraceContext();

    expect(service.getLogContext()).toMatchObject({
      requestId: 'system',
      correlationId: 'system',
      endpoint: null,
      method: null,
      status: null,
    });
    expect(service.getLogContext().traceId).toHaveLength(32);
    expect(service.getLogContext().spanId).toHaveLength(16);
  });
});
