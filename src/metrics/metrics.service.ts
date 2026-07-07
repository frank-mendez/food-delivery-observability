import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly ordersCreatedTotal: Counter<string>;
  private readonly failedOrderCreationTotal: Counter<string>;
  private readonly orderCreationDuration: Histogram<string>;
  private readonly healthCheckTotal: Counter<string>;

  constructor() {
    this.registry.setDefaultLabels({
      app: 'food-delivery-api',
    });

    collectDefaultMetrics({
      prefix: 'food_delivery_',
      register: this.registry,
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

    this.healthCheckTotal = new Counter({
      name: 'food_delivery_health_check_total',
      help: 'Total number of health check requests.',
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

  incrementOrdersCreated() {
    this.ordersCreatedTotal.inc();
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

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
