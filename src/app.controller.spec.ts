import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns the API index', () => {
    const controller = new AppController();

    expect(controller.getIndex()).toEqual({
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
    });
  });
});
