import type { HealthStatus } from '@/types/domain';
import { apiFetch } from '../client';

export const healthRepository = {
  current() {
    return apiFetch<HealthStatus>('/health');
  },
};
