'use client';

import { useEffect } from 'react';
import { useDemoSession } from '@/features/auth/hooks/use-demo-session';
import { isAccessTokenFresh } from '@/features/auth/lib/session-tokens';
import { useSessionStore } from '@/stores/session-store';
import type { DevelopmentRole } from '@/types/domain';

export function useRoleSession(role: DevelopmentRole) {
  const demoSession = useDemoSession(role);
  const { ensureSession, isConnecting, session } = demoSession;
  const activeRole = useSessionStore((state) => state.activeRole);
  const setActiveRole = useSessionStore((state) => state.setActiveRole);

  useEffect(() => {
    if (activeRole !== role) {
      setActiveRole(role);
    }

    const needsSession =
      !session || !isAccessTokenFresh(session.accessToken);

    if (needsSession && !isConnecting) {
      void ensureSession(role);
    }
  }, [
    activeRole,
    ensureSession,
    isConnecting,
    role,
    session,
    setActiveRole,
  ]);

  return demoSession;
}
