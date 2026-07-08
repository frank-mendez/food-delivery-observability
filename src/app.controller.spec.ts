import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns the API index', () => {
    const controller = new AppController();

    expect(controller.getIndex()).toEqual({
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
    });
  });
});
