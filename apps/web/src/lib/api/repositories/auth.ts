import type { AuthSession } from '@/types/domain';
import { apiFetch } from '../client';

export type LoginPayload = {
  email: string;
  password: string;
};

export const authRepository = {
  login(payload: LoginPayload) {
    return apiFetch<AuthSession>('/auth/login', {
      method: 'POST',
      body: payload,
    });
  },
  refresh(refreshToken: string) {
    return apiFetch<AuthSession>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
  },
  logout(refreshToken: string) {
    return apiFetch<{ status: string }>('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
    });
  },
};
