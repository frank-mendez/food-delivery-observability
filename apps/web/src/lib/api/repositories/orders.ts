import type { Order, PaymentScenario } from '@/types/domain';
import { apiFetch } from '../client';

export type CreateOrderPayload = {
  restaurantId: string;
  items: Array<{ menuItemId: string; quantity: number }>;
  paymentScenario?: PaymentScenario;
};

export const ordersRepository = {
  create(token: string, payload: CreateOrderPayload) {
    return apiFetch<Order>('/orders', {
      method: 'POST',
      token,
      body: payload,
    });
  },
  mine(token: string) {
    return apiFetch<Order[]>('/orders', { token });
  },
  detail(orderId: string, token: string) {
    return apiFetch<Order>(`/orders/${orderId}`, { token });
  },
  cancel(orderId: string, token: string) {
    return apiFetch<Order>(`/orders/${orderId}/cancel`, {
      method: 'PATCH',
      token,
    });
  },
};
