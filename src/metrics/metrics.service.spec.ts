import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('records Prometheus-compatible application metrics', async () => {
    const service = new MetricsService();
    const endTimer = service.startOrderCreationTimer();

    service.recordHttpRequest('GET', '/health', 200, 0.01);
    service.incrementHealthChecks();
    service.incrementOrdersCreated();
    service.incrementFailedOrderCreation();
    endTimer();

    const metrics = await service.getMetrics();

    expect(service.contentType).toContain('text/plain');
    expect(metrics).toContain('food_delivery_http_requests_total');
    expect(metrics).toContain('food_delivery_http_request_duration_seconds');
    expect(metrics).toContain('food_delivery_orders_created_total');
    expect(metrics).toContain('food_delivery_failed_order_creation_total');
    expect(metrics).toContain('food_delivery_order_creation_duration_seconds');
    expect(metrics).toContain('food_delivery_health_check_total');
  });
});
