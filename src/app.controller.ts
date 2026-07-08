import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getIndex() {
    return {
      name: 'food-delivery-observability',
      phase: 'Phase 2',
      status: 'ok',
      endpoints: {
        health: '/health',
        restaurants: '/restaurants',
        orders: '/orders',
        metrics: '/metrics',
        grafana: 'http://localhost:3000',
        prometheus: 'http://localhost:9090',
        loki: 'http://localhost:3100',
        tempo: 'http://localhost:3200',
      },
    };
  }
}
