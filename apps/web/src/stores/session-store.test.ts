import { beforeEach, describe, expect, it } from 'vitest';
import { getRoleSession, useSessionStore } from './session-store';
import type { AuthSession } from '@/types/domain';

const session: AuthSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: {
    id: 'user-1',
    email: 'customer@example.com',
    name: 'Demo Customer',
    role: 'CUSTOMER',
  },
};

describe('session store', () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession();
    useSessionStore.getState().setActiveRole('customer');
  });

  it('stores and returns the active role session', () => {
    useSessionStore.getState().setSession('customer', session);

    expect(useSessionStore.getState().getActiveSession()).toEqual(session);
    expect(getRoleSession('customer')).toEqual(session);
  });

  it('clears one role or every role', () => {
    useSessionStore.getState().setSession('customer', session);
    useSessionStore.getState().setSession('rider', {
      ...session,
      user: { ...session.user, id: 'rider-1', role: 'RIDER' },
    });
    useSessionStore.getState().clearSession('customer');

    expect(getRoleSession('customer')).toBeUndefined();
    expect(getRoleSession('rider')).toBeDefined();

    useSessionStore.getState().clearSession();

    expect(useSessionStore.getState().sessions).toEqual({});
  });
});
