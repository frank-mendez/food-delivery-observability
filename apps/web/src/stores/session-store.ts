'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession, DevelopmentRole } from '@/types/domain';

type SessionState = {
  activeRole: DevelopmentRole;
  sessions: Partial<Record<DevelopmentRole, AuthSession>>;
  setActiveRole: (role: DevelopmentRole) => void;
  setSession: (role: DevelopmentRole, session: AuthSession) => void;
  clearSession: (role?: DevelopmentRole) => void;
  getActiveSession: () => AuthSession | undefined;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      activeRole: 'customer',
      sessions: {},
      setActiveRole: (role) => set({ activeRole: role }),
      setSession: (role, session) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [role]: session,
          },
        })),
      clearSession: (role) =>
        set((state) => {
          if (!role) {
            return { sessions: {} };
          }

          const nextSessions = { ...state.sessions };
          delete nextSessions[role];

          return { sessions: nextSessions };
        }),
      getActiveSession: () => {
        const state = get();

        return state.sessions[state.activeRole];
      },
    }),
    {
      name: 'food-delivery-web-session',
      partialize: (state) => ({
        activeRole: state.activeRole,
        sessions: state.sessions,
      }),
    },
  ),
);

export function getRoleSession(role: DevelopmentRole) {
  return useSessionStore.getState().sessions[role];
}
