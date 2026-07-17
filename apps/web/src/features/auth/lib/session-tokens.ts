'use client';

import { ApiError } from '@/lib/api/errors';
import { authRepository } from '@/lib/api/repositories/auth';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';
import { useSessionStore } from '@/stores/session-store';
import type { AuthSession, DevelopmentRole } from '@/types/domain';

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60_000;

const sessionRequests = new Map<DevelopmentRole, Promise<AuthSession>>();

function decodeJwtPayload(token: string) {
  const [, payload] = token.split('.');

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      '=',
    );

    return JSON.parse(atob(paddedPayload)) as { exp?: unknown };
  } catch {
    return null;
  }
}

function getAccessTokenExpiry(accessToken: string) {
  const payload = decodeJwtPayload(accessToken);

  return typeof payload?.exp === 'number' ? payload.exp * 1_000 : null;
}

export function isAccessTokenFresh(accessToken: string) {
  const expiresAt = getAccessTokenExpiry(accessToken);

  return (
    expiresAt !== null &&
    expiresAt - Date.now() > ACCESS_TOKEN_REFRESH_BUFFER_MS
  );
}

async function loginDemoRole(role: DevelopmentRole) {
  const account = DEMO_ACCOUNTS[role];

  return authRepository.login({
    email: account.email,
    password: account.password,
  });
}

async function refreshOrLoginRoleSession(role: DevelopmentRole) {
  const currentSession = useSessionStore.getState().sessions[role];

  if (currentSession?.refreshToken) {
    try {
      const refreshedSession = await authRepository.refresh(
        currentSession.refreshToken,
      );

      useSessionStore.getState().setSession(role, refreshedSession);

      return refreshedSession;
    } catch {
      useSessionStore.getState().clearSession(role);
    }
  }

  const nextSession = await loginDemoRole(role);
  useSessionStore.getState().setSession(role, nextSession);

  return nextSession;
}

export async function ensureRoleSession(role: DevelopmentRole) {
  const currentSession = useSessionStore.getState().sessions[role];

  if (
    currentSession &&
    isAccessTokenFresh(currentSession.accessToken)
  ) {
    return currentSession;
  }

  const currentRequest = sessionRequests.get(role);

  if (currentRequest) {
    return currentRequest;
  }

  const nextRequest = refreshOrLoginRoleSession(role).finally(() => {
    sessionRequests.delete(role);
  });
  sessionRequests.set(role, nextRequest);

  return nextRequest;
}

export async function getRoleAccessToken(role: DevelopmentRole) {
  const session = await ensureRoleSession(role);

  return session.accessToken;
}

export async function withRoleAccessToken<T>(
  role: DevelopmentRole,
  request: (accessToken: string) => Promise<T>,
) {
  const accessToken = await getRoleAccessToken(role);

  try {
    return await request(accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }

    const latestSession = useSessionStore.getState().sessions[role];

    if (latestSession?.accessToken === accessToken) {
      useSessionStore.getState().clearSession(role);
    }

    const nextSession = await ensureRoleSession(role);

    return request(nextSession.accessToken);
  }
}
