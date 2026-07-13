import type { Payment, PaymentScenario } from '@/types/domain';
import { apiFetch } from '../client';

export const paymentsRepository = {
  find(orderId: string, token: string) {
    return apiFetch<Payment>(`/payments/${orderId}`, { token });
  },
  retry(orderId: string, token: string, scenario: PaymentScenario = 'success') {
    return apiFetch<Payment>(`/payments/${orderId}/retry`, {
      method: 'POST',
      token,
      body: { scenario },
    });
  },
};
