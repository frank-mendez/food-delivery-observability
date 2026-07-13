import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getIndex() {
    return {
      name: 'food-delivery-observability',
      phase: 'Phase 3',
      status: 'ok',
      endpoints: {
        auth: '/auth',
        customers: '/customers/me',
        health: '/health',
        notifications: '/notifications',
        payments: '/payments/:orderId',
        restaurants: '/restaurants',
        orders: '/orders',
        riders: '/riders',
        metrics: '/metrics',
        grafana: 'http://localhost:3000',
        prometheus: 'http://localhost:9090',
        loki: 'http://localhost:3100',
        tempo: 'http://localhost:3200',
      },
    };
  }
}
