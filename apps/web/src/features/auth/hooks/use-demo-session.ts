'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { authRepository } from '@/lib/api/repositories/auth';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';
import { useSessionStore } from '@/stores/session-store';
import type { AuthSession, DevelopmentRole } from '@/types/domain';

export function useDemoSession(role?: DevelopmentRole) {
  const activeRole = useSessionStore((state) => state.activeRole);
  const sessions = useSessionStore((state) => state.sessions);
  const setSession = useSessionStore((state) => state.setSession);
  const selectedRole = role ?? activeRole;
  const session = sessions[selectedRole];

  const loginMutation = useMutation({
    mutationFn: async (targetRole: DevelopmentRole) => {
      const account = DEMO_ACCOUNTS[targetRole];

      return authRepository.login({
        email: account.email,
        password: account.password,
      });
    },
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

      if (currentSession) {
        return currentSession;
      }

      return loginMutation.mutateAsync(targetRole);
    },
    [loginMutation, selectedRole],
  );

  return {
    session,
    ensureSession,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isConnecting: loginMutation.isPending,
  };
}
