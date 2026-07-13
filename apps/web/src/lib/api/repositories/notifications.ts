import type { Notification } from '@/types/domain';
import { apiFetch } from '../client';

export const notificationsRepository = {
  mine(token: string) {
    return apiFetch<Notification[]>('/notifications', { token });
  },
};
