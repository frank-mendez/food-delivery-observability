import type {
  Delivery,
  Order,
  RiderAvailability,
  RiderProfile,
} from '@/types/domain';
import { apiFetch } from '../client';

export const ridersRepository = {
  profile(token: string) {
    return apiFetch<RiderProfile>('/riders/me', { token });
  },
  updateAvailability(token: string, availability: RiderAvailability) {
    return apiFetch<RiderProfile>('/riders/me/availability', {
      method: 'PATCH',
      token,
      body: { availability },
    });
  },
  deliveries(token: string) {
    return apiFetch<Delivery[]>('/riders/deliveries', { token });
  },
  updateDelivery(
    deliveryId: string,
    action: 'accept' | 'pick-up' | 'out-for-delivery' | 'deliver',
    token: string,
  ) {
    return apiFetch<Delivery | Order>(`/riders/deliveries/${deliveryId}/${action}`, {
      method: 'PATCH',
      token,
    });
  },
};
