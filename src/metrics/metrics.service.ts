import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpActiveRequests: Gauge<string>;
  private readonly ordersCreatedTotal: Counter<string>;
  private readonly failedOrderCreationTotal: Counter<string>;
  private readonly orderCreationDuration: Histogram<string>;
  private readonly orderValue: Histogram<string>;
  private readonly averageOrderValue: Gauge<string>;
  private readonly healthCheckTotal: Counter<string>;
  private readonly databaseQueryDuration: Histogram<string>;
  private readonly databaseConnectionPoolConnections: Gauge<string>;
  private readonly databaseConnectionStatus: Gauge<string>;
  private readonly redisConnectionStatus: Gauge<string>;
  private readonly redisOperationDuration: Histogram<string>;
  private totalOrderValue = 0;
  private totalCreatedOrders = 0;

  constructor() {
    this.registry.setDefaultLabels({
      app: 'food-delivery-api',
    });

    collectDefaultMetrics({
      prefix: 'food_delivery_',
      register: this.registry,
      eventLoopMonitoringPrecision: 10,
    });

    this.httpRequestsTotal = new Counter({
      name: 'food_delivery_http_requests_total',
      help: 'Total number of HTTP requests received by the API.',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'food_delivery_http_request_duration_seconds',
      help: 'HTTP request duration in seconds.',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpActiveRequests = new Gauge({
      name: 'food_delivery_http_active_requests',
      help: 'Current number of in-flight HTTP requests.',
      labelNames: ['method', 'route'],
      registers: [this.registry],
    });

    this.ordersCreatedTotal = new Counter({
      name: 'food_delivery_orders_created_total',
      help: 'Total number of successfully created orders.',
      registers: [this.registry],
    });

    this.failedOrderCreationTotal = new Counter({
      name: 'food_delivery_failed_order_creation_total',
      help: 'Total number of failed order creation attempts.',
      registers: [this.registry],
    });

    this.orderCreationDuration = new Histogram({
      name: 'food_delivery_order_creation_duration_seconds',
      help: 'Order creation duration in seconds.',
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.orderValue = new Histogram({
      name: 'food_delivery_order_value_dollars',
      help: 'Created order value in dollars.',
      buckets: [5, 10, 15, 20, 30, 50, 75, 100, 150, 250],
      registers: [this.registry],
    });

    this.averageOrderValue = new Gauge({
      name: 'food_delivery_average_order_value_dollars',
      help: 'Average value of successfully created orders in dollars since process start.',
      registers: [this.registry],
    });

    this.healthCheckTotal = new Counter({
      name: 'food_delivery_health_check_total',
      help: 'Total number of health check requests.',
      registers: [this.registry],
    });

    this.databaseQueryDuration = new Histogram({
      name: 'food_delivery_database_query_duration_seconds',
      help: 'Database query duration in seconds.',
      labelNames: ['operation', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
      registers: [this.registry],
    });

    this.databaseConnectionPoolConnections = new Gauge({
      name: 'food_delivery_database_connection_pool_connections',
      help: 'PostgreSQL connection pool connections by state.',
      labelNames: ['state'],
      registers: [this.registry],
    });

    this.databaseConnectionStatus = new Gauge({
      name: 'food_delivery_database_connection_status',
      help: 'PostgreSQL connection status. 1 means connected, 0 means unavailable.',
      registers: [this.registry],
    });

    this.redisConnectionStatus = new Gauge({
      name: 'food_delivery_redis_connection_status',
      help: 'Redis connection status. 1 means connected, 0 means unavailable.',
      registers: [this.registry],
    });

    this.redisOperationDuration = new Histogram({
      name: 'food_delivery_redis_operation_duration_seconds',
      help: 'Redis operation duration in seconds.',
      labelNames: ['operation', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [this.registry],
    });
  }

  get contentType(): string {
    return this.registry.contentType;
  }

  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ) {
    const labels = {
      method,
      route,
      status_code: String(statusCode),
    };

    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationSeconds);
  }

  incrementActiveHttpRequests(method: string, route: string) {
    this.httpActiveRequests.inc({ method, route });
  }

  decrementActiveHttpRequests(method: string, route: string) {
    this.httpActiveRequests.dec({ method, route });
  }

  incrementOrdersCreated(totalAmount?: number) {
    this.ordersCreatedTotal.inc();

    if (typeof totalAmount === 'number' && Number.isFinite(totalAmount)) {
      this.totalCreatedOrders += 1;
      this.totalOrderValue += totalAmount;
      this.orderValue.observe(totalAmount);
      this.averageOrderValue.set(
        this.totalOrderValue / this.totalCreatedOrders,
      );
    }
  }

  incrementFailedOrderCreation() {
    this.failedOrderCreationTotal.inc();
  }

  startOrderCreationTimer(): () => void {
    const endTimer = this.orderCreationDuration.startTimer();
    return () => {
      endTimer();
    };
  }

  incrementHealthChecks() {
    this.healthCheckTotal.inc();
  }

  recordDatabaseQuery(
    operation: string,
    status: 'success' | 'error',
    durationSeconds: number,
  ) {
    this.databaseQueryDuration.observe({ operation, status }, durationSeconds);
  }

  setDatabaseConnectionPoolUsage(poolUsage: {
    total: number;
    idle: number;
    waiting: number;
  }) {
    this.databaseConnectionPoolConnections.set(
      { state: 'total' },
      poolUsage.total,
    );
    this.databaseConnectionPoolConnections.set(
      { state: 'idle' },
      poolUsage.idle,
    );
    this.databaseConnectionPoolConnections.set(
      { state: 'waiting' },
      poolUsage.waiting,
    );
  }

  setDatabaseConnectionStatus(isConnected: boolean) {
    this.databaseConnectionStatus.set(isConnected ? 1 : 0);
  }

  setRedisConnectionStatus(isConnected: boolean) {
    this.redisConnectionStatus.set(isConnected ? 1 : 0);
  }

  startRedisOperationTimer(
    operation: string,
  ): (status: 'success' | 'error') => void {
    const startedAt = process.hrtime.bigint();

    return (status: 'success' | 'error') => {
      const durationSeconds =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      this.redisOperationDuration.observe(
        { operation, status },
        durationSeconds,
      );
    };
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
