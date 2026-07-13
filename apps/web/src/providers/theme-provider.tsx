'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/theme-store';

function resolveSystemTheme() {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    const resolvedTheme = theme === 'system' ? resolveSystemTheme() : theme;

    root.classList.toggle('dark', resolvedTheme === 'dark');
  }, [theme]);

  return children;
}
