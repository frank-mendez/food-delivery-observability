import type { DevelopmentRole } from '@/types/domain';

export const DEMO_PASSWORD = 'Password123!';

export const DEMO_ACCOUNTS: Record<
  DevelopmentRole,
  { email: string; password: string; label: string }
> = {
  customer: {
    email: 'customer@example.com',
    password: DEMO_PASSWORD,
    label: 'Demo Customer',
  },
  restaurant: {
    email: 'owner@example.com',
    password: DEMO_PASSWORD,
    label: 'Restaurant Owner',
  },
  rider: {
    email: 'rider@example.com',
    password: DEMO_PASSWORD,
    label: 'Demo Rider',
  },
};
