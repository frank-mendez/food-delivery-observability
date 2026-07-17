import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { authRepository } from '@/lib/api/repositories/auth';
import { useSessionStore } from '@/stores/session-store';
import type { AuthSession } from '@/types/domain';
import {
  ensureRoleSession,
  isAccessTokenFresh,
  withRoleAccessToken,
} from '../lib/session-tokens';

vi.mock('@/lib/api/repositories/auth', () => ({
  authRepository: {
    login: vi.fn(),
    refresh: vi.fn(),
  },
}));

function toBase64Url(value: string) {
  return btoa(value)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createToken(expiresInMs: number) {
  const expiresAt = Math.floor((Date.now() + expiresInMs) / 1_000);

  return [
    toBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' })),
    toBase64Url(JSON.stringify({ exp: expiresAt })),
    'signature',
  ].join('.');
}

function createSession(accessToken: string): AuthSession {
  return {
    accessToken,
    refreshToken: 'refresh-token',
    user: {
      id: 'owner-1',
      email: 'owner@example.com',
      name: 'Restaurant Owner',
      role: 'RESTAURANT_OWNER',
    },
  };
}

describe('session token helpers', () => {
  const mockedAuthRepository = vi.mocked(authRepository);

  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().clearSession();
    useSessionStore.getState().setActiveRole('customer');
  });

  it('detects stale access tokens before protected requests reuse them', () => {
    expect(isAccessTokenFresh(createToken(120_000))).toBe(true);
    expect(isAccessTokenFresh(createToken(10_000))).toBe(false);
  });

  it('refreshes an expired role session before returning its access token', async () => {
    const expiredSession = createSession(createToken(-1_000));
    const refreshedSession = createSession(createToken(120_000));
    useSessionStore.getState().setSession('restaurant', expiredSession);
    mockedAuthRepository.refresh.mockResolvedValue(refreshedSession);

    await expect(ensureRoleSession('restaurant')).resolves.toEqual(
      refreshedSession,
    );

    expect(mockedAuthRepository.refresh).toHaveBeenCalledWith('refresh-token');
    expect(mockedAuthRepository.login).not.toHaveBeenCalled();
    expect(useSessionStore.getState().sessions.restaurant).toEqual(
      refreshedSession,
    );
  });

  it('replaces the role session and retries once after an auth failure', async () => {
    const staleSession = createSession(createToken(120_000));
    const replacementSession = createSession(createToken(120_000));
    useSessionStore.getState().setSession('restaurant', staleSession);
    mockedAuthRepository.login.mockResolvedValue(replacementSession);
    const request = vi
      .fn<(accessToken: string) => Promise<string>>()
      .mockRejectedValueOnce(new ApiError('Access token is invalid', 401))
      .mockResolvedValueOnce('ok');

    await expect(
      withRoleAccessToken('restaurant', request),
    ).resolves.toBe('ok');

    expect(request).toHaveBeenNthCalledWith(1, staleSession.accessToken);
    expect(mockedAuthRepository.login).toHaveBeenCalledWith({
      email: 'owner@example.com',
      password: 'Password123!',
    });
    expect(request).toHaveBeenNthCalledWith(
      2,
      replacementSession.accessToken,
    );
  });
});
