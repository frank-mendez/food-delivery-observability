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
  private readonly authAttemptsTotal: Counter<string>;
  private readonly orderStatusTransitionsTotal: Counter<string>;
  private readonly paymentAttemptsTotal: Counter<string>;
  private readonly paymentDuration: Histogram<string>;
  private readonly queueDepth: Gauge<string>;
  private readonly queueProcessingDuration: Histogram<string>;
  private readonly queueFailuresTotal: Counter<string>;
  private readonly queueRetriesTotal: Counter<string>;
  private readonly notificationEventsTotal: Counter<string>;
  private readonly cacheEventsTotal: Counter<string>;
  private readonly cacheOperationDuration: Histogram<string>;
  private readonly cacheInvalidationsTotal: Counter<string>;
  private readonly riderDeliveryEventsTotal: Counter<string>;
  private readonly domainEventsTotal: Counter<string>;
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

    this.authAttemptsTotal = new Counter({
      name: 'food_delivery_auth_attempts_total',
      help: 'Authentication attempts by action, role, and outcome.',
      labelNames: ['action', 'role', 'outcome'],
      registers: [this.registry],
    });

    this.orderStatusTransitionsTotal = new Counter({
      name: 'food_delivery_order_status_transitions_total',
      help: 'Order lifecycle transition attempts by status and outcome.',
      labelNames: ['from_status', 'to_status', 'actor_role', 'outcome'],
      registers: [this.registry],
    });

    this.paymentAttemptsTotal = new Counter({
      name: 'food_delivery_payment_attempts_total',
      help: 'Payment simulator attempts by outcome.',
      labelNames: ['outcome'],
      registers: [this.registry],
    });

    this.paymentDuration = new Histogram({
      name: 'food_delivery_payment_duration_seconds',
      help: 'Payment simulator latency in seconds.',
      labelNames: ['outcome'],
      buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.queueDepth = new Gauge({
      name: 'food_delivery_queue_depth',
      help: 'BullMQ queue jobs by queue and state.',
      labelNames: ['queue', 'state'],
      registers: [this.registry],
    });

    this.queueProcessingDuration = new Histogram({
      name: 'food_delivery_queue_processing_duration_seconds',
      help: 'BullMQ job processing duration in seconds.',
      labelNames: ['queue', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.queueFailuresTotal = new Counter({
      name: 'food_delivery_queue_failures_total',
      help: 'BullMQ job failures by queue.',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueRetriesTotal = new Counter({
      name: 'food_delivery_queue_retries_total',
      help: 'BullMQ job retries by queue.',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.notificationEventsTotal = new Counter({
      name: 'food_delivery_notification_events_total',
      help: 'Notification events by channel and status.',
      labelNames: ['channel', 'status'],
      registers: [this.registry],
    });

    this.cacheEventsTotal = new Counter({
      name: 'food_delivery_cache_events_total',
      help: 'Redis cache events by cache and result.',
      labelNames: ['cache', 'result'],
      registers: [this.registry],
    });

    this.cacheOperationDuration = new Histogram({
      name: 'food_delivery_cache_operation_duration_seconds',
      help: 'Redis cache operation duration in seconds.',
      labelNames: ['cache', 'operation', 'result'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
      registers: [this.registry],
    });

    this.cacheInvalidationsTotal = new Counter({
      name: 'food_delivery_cache_invalidations_total',
      help: 'Redis cache invalidations by cache name.',
      labelNames: ['cache'],
      registers: [this.registry],
    });

    this.riderDeliveryEventsTotal = new Counter({
      name: 'food_delivery_rider_delivery_events_total',
      help: 'Rider delivery lifecycle events by action and status.',
      labelNames: ['action', 'status'],
      registers: [this.registry],
    });

    this.domainEventsTotal = new Counter({
      name: 'food_delivery_domain_events_total',
      help: 'Domain events recorded by aggregate type and event type.',
      labelNames: ['aggregate_type', 'event_type'],
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

  recordAuthAttempt(action: string, role: string, outcome: string) {
    this.authAttemptsTotal.inc({ action, role, outcome });
  }

  recordOrderStatusTransition(
    fromStatus: string,
    toStatus: string,
    actorRole: string,
    outcome: 'success' | 'failure',
  ) {
    this.orderStatusTransitionsTotal.inc({
      from_status: fromStatus,
      to_status: toStatus,
      actor_role: actorRole,
      outcome,
    });
  }

  recordPaymentAttempt(outcome: string, durationSeconds: number) {
    this.paymentAttemptsTotal.inc({ outcome });
    this.paymentDuration.observe({ outcome }, durationSeconds);
  }

  setQueueDepth(queue: string, state: string, count: number) {
    this.queueDepth.set({ queue, state }, count);
  }

  startQueueProcessingTimer(
    queue: string,
  ): (status: 'success' | 'failure') => void {
    const startedAt = process.hrtime.bigint();

    return (status: 'success' | 'failure') => {
      const durationSeconds =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      this.queueProcessingDuration.observe({ queue, status }, durationSeconds);
    };
  }

  incrementQueueFailure(queue: string) {
    this.queueFailuresTotal.inc({ queue });
  }

  incrementQueueRetry(queue: string) {
    this.queueRetriesTotal.inc({ queue });
  }

  recordNotification(channel: string, status: string) {
    this.notificationEventsTotal.inc({ channel, status });
  }

  recordCacheEvent(cache: string, result: string) {
    this.cacheEventsTotal.inc({ cache, result });
  }

  startCacheOperationTimer(
    cache: string,
    operation: string,
  ): (result: string) => void {
    const startedAt = process.hrtime.bigint();

    return (result: string) => {
      const durationSeconds =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      this.cacheOperationDuration.observe(
        { cache, operation, result },
        durationSeconds,
      );
    };
  }

  incrementCacheInvalidation(cache: string) {
    this.cacheInvalidationsTotal.inc({ cache });
  }

  recordRiderDeliveryEvent(action: string, status: string) {
    this.riderDeliveryEventsTotal.inc({ action, status });
  }

  recordDomainEvent(aggregateType: string, eventType: string) {
    this.domainEventsTotal.inc({
      aggregate_type: aggregateType,
      event_type: eventType,
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
