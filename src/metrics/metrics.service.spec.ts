import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('records Prometheus-compatible application metrics', async () => {
    const service = new MetricsService();
    const endTimer = service.startOrderCreationTimer();
    const endRedisTimer = service.startRedisOperationTimer('ping');

    service.recordHttpRequest('GET', '/health', 200, 0.01);
    service.incrementActiveHttpRequests('GET', '/health');
    service.decrementActiveHttpRequests('GET', '/health');
    service.incrementHealthChecks();
    service.incrementOrdersCreated(22.5);
    service.incrementFailedOrderCreation();
    service.recordDatabaseQuery('select', 'success', 0.01);
    service.setDatabaseConnectionPoolUsage({
      total: 2,
      idle: 1,
      waiting: 0,
    });
    service.setDatabaseConnectionStatus(true);
    service.setRedisConnectionStatus(true);
    endRedisTimer('success');
    endTimer();

    const metrics = await service.getMetrics();

    expect(service.contentType).toContain('text/plain');
    expect(metrics).toContain('food_delivery_http_requests_total');
    expect(metrics).toContain('food_delivery_http_request_duration_seconds');
    expect(metrics).toContain('food_delivery_http_active_requests');
    expect(metrics).toContain('food_delivery_orders_created_total');
    expect(metrics).toContain('food_delivery_failed_order_creation_total');
    expect(metrics).toContain('food_delivery_order_creation_duration_seconds');
    expect(metrics).toContain('food_delivery_order_value_dollars');
    expect(metrics).toContain('food_delivery_average_order_value_dollars');
    expect(metrics).toContain('food_delivery_health_check_total');
    expect(metrics).toContain('food_delivery_database_query_duration_seconds');
    expect(metrics).toContain(
      'food_delivery_database_connection_pool_connections',
    );
    expect(metrics).toContain('food_delivery_database_connection_status');
    expect(metrics).toContain('food_delivery_redis_connection_status');
    expect(metrics).toContain('food_delivery_redis_operation_duration_seconds');
  });
});
