export const queryKeys = {
  health: ['health'] as const,
  restaurants: {
    all: ['restaurants'] as const,
    detail: (restaurantId: string) =>
      ['restaurants', restaurantId] as const,
    menu: (restaurantId: string) =>
      ['restaurants', restaurantId, 'menu'] as const,
    popular: (restaurantId?: string) =>
      ['restaurants', 'popular-items', restaurantId ?? 'all'] as const,
    orders: (restaurantId: string) =>
      ['restaurants', restaurantId, 'orders'] as const,
  },
  orders: {
    mine: ['orders', 'mine'] as const,
    detail: (orderId: string) => ['orders', orderId] as const,
  },
  customer: {
    profile: ['customer', 'profile'] as const,
    orders: ['customer', 'orders'] as const,
  },
  rider: {
    profile: ['rider', 'profile'] as const,
    deliveries: ['rider', 'deliveries'] as const,
  },
  notifications: ['notifications'] as const,
};
