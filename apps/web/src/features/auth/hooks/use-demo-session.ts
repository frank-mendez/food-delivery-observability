'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';
import { useSessionStore } from '@/stores/session-store';
import type { AuthSession, DevelopmentRole } from '@/types/domain';
import { ensureRoleSession, isAccessTokenFresh } from '../lib/session-tokens';

export function useDemoSession(role?: DevelopmentRole) {
  const activeRole = useSessionStore((state) => state.activeRole);
  const sessions = useSessionStore((state) => state.sessions);
  const setSession = useSessionStore((state) => state.setSession);
  const selectedRole = role ?? activeRole;
  const session = sessions[selectedRole];
  const [isEnsuringSession, setIsEnsuringSession] = useState(false);

  const loginMutation = useMutation({
    mutationFn: ensureRoleSession,
    onSuccess: (nextSession, targetRole) => {
      setSession(targetRole, nextSession);
      toast.success(`Connected ${DEMO_ACCOUNTS[targetRole].label}`);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Demo login failed';
      toast.error(message);
    },
  });

  const ensureSession = useCallback(
    async (targetRole: DevelopmentRole = selectedRole): Promise<AuthSession> => {
      const currentSession = useSessionStore.getState().sessions[targetRole];

      if (
        currentSession &&
        isAccessTokenFresh(currentSession.accessToken)
      ) {
        return currentSession;
      }

      setIsEnsuringSession(true);

      try {
        return await ensureRoleSession(targetRole);
      } finally {
        setIsEnsuringSession(false);
      }
    },
    [selectedRole],
  );

  return {
    session,
    ensureSession,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isConnecting: loginMutation.isPending || isEnsuringSession,
  };
}
