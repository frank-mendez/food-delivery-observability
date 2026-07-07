import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns the API index', () => {
    const controller = new AppController();

    expect(controller.getIndex()).toEqual({
      name: 'food-delivery-observability',
      phase: 'Phase 1',
      status: 'ok',
      endpoints: {
        health: '/health',
        restaurants: '/restaurants',
        orders: '/orders',
        metrics: '/metrics',
      },
    });
  });
});
