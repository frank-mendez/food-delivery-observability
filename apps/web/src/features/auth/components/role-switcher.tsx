'use client';

import { Bike, ChefHat, ShieldAlert, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores/session-store';
import type { DevelopmentRole } from '@/types/domain';
import { useDemoSession } from '../hooks/use-demo-session';

const roles: Array<{
  value: DevelopmentRole;
  label: string;
  icon: typeof UserRound;
}> = [
  { value: 'customer', label: 'Customer', icon: UserRound },
  { value: 'restaurant', label: 'Restaurant', icon: ChefHat },
  { value: 'rider', label: 'Rider', icon: Bike },
];

export function RoleSwitcher({ compact = false }: { compact?: boolean }) {
  const activeRole = useSessionStore((state) => state.activeRole);
  const sessions = useSessionStore((state) => state.sessions);
  const setActiveRole = useSessionStore((state) => state.setActiveRole);
  const { login, isConnecting } = useDemoSession();

  function handleRoleChange(role: DevelopmentRole) {
    setActiveRole(role);

    if (!sessions[role]) {
      login(role);
    }
  }

  return (
    <section
      className={cn(
        'rounded-lg border border-border bg-card p-3 shadow-sm',
        compact && 'p-2',
      )}
      aria-label="Development role switcher"
    >
      <div className="mb-3 flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
        <p>
          Development-only role switcher. Protected actions use seeded demo
          accounts through real backend login.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {roles.map((role) => {
          const Icon = role.icon;
          const selected = activeRole === role.value;
          const connected = Boolean(sessions[role.value]);

          return (
            <Button
              key={role.value}
              type="button"
              variant={selected ? 'default' : 'outline'}
              className="justify-start"
              aria-pressed={selected}
              onClick={() => handleRoleChange(role.value)}
              isLoading={isConnecting && selected}
            >
              <Icon className="h-4 w-4" />
              <span>{role.label}</span>
              <span className="ml-auto text-xs opacity-75">
                {connected ? 'Live' : DEMO_ACCOUNTS[role.value].email}
              </span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
