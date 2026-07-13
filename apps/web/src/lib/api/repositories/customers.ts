import type { CustomerAccount, Order } from '@/types/domain';
import { apiFetch } from '../client';

export type UpdateCustomerProfilePayload = {
  name?: string;
  phone?: string;
  address?: string;
};

export const customersRepository = {
  profile(token: string) {
    return apiFetch<CustomerAccount>('/customers/me', { token });
  },
  updateProfile(token: string, payload: UpdateCustomerProfilePayload) {
    return apiFetch<CustomerAccount>('/customers/me', {
      method: 'PATCH',
      token,
      body: payload,
    });
  },
  orders(token: string) {
    return apiFetch<Order[]>('/customers/me/orders', { token });
  },
};
