import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '@/stores/session-store';
import { RoleSwitcher } from '../components/role-switcher';

const login = vi.fn();

vi.mock('../hooks/use-demo-session', () => ({
  useDemoSession: () => ({
    login,
    isConnecting: false,
  }),
}));

describe('RoleSwitcher', () => {
  beforeEach(() => {
    login.mockClear();
    useSessionStore.getState().clearSession();
    useSessionStore.getState().setActiveRole('customer');
  });

  it('persists the selected role and starts demo login', async () => {
    render(<RoleSwitcher />);

    await userEvent.click(screen.getByRole('button', { name: /restaurant/i }));

    expect(useSessionStore.getState().activeRole).toBe('restaurant');
    expect(login).toHaveBeenCalledWith('restaurant');
  });

  it('shows connected state without starting login for existing sessions', async () => {
    useSessionStore.getState().setSession('rider', {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'rider-1',
        email: 'rider@example.com',
        name: 'Demo Rider',
        role: 'RIDER',
      },
    });

    render(<RoleSwitcher compact />);

    await userEvent.click(screen.getByRole('button', { name: /rider/i }));

    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });
});
