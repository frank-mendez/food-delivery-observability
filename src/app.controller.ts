import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getIndex() {
    return {
      name: 'food-delivery-observability',
      phase: 'Phase 1',
      status: 'ok',
      endpoints: {
        health: '/health',
        restaurants: '/restaurants',
        orders: '/orders',
        metrics: '/metrics',
      },
    };
  }
}
