'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bike,
  ChefHat,
  ClipboardList,
  Home,
  Menu,
  Moon,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  ShoppingCart,
  Store,
  Sun,
  UserRound,
} from 'lucide-react';
import { RoleSwitcher } from '@/features/auth/components/role-switcher';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { useSessionStore } from '@/stores/session-store';
import { useSidebarStore } from '@/stores/sidebar-store';
import { useThemeStore } from '@/stores/theme-store';
import type { DevelopmentRole } from '@/types/domain';
import { Button } from '@/components/ui/button';

type NavigationItem = {
  href: string;
  label: string;
  icon: typeof Home;
  roles: DevelopmentRole[];
};

const navigation: NavigationItem[] = [
  { href: '/', label: 'Home', icon: Home, roles: ['customer', 'restaurant', 'rider'] },
  { href: '/restaurants', label: 'Restaurants', icon: Store, roles: ['customer'] },
  { href: '/orders', label: 'Orders', icon: ReceiptText, roles: ['customer'] },
  { href: '/profile', label: 'Profile', icon: UserRound, roles: ['customer'] },
  { href: '/restaurant', label: 'Portal', icon: ChefHat, roles: ['restaurant'] },
  { href: '/restaurant/orders', label: 'Orders', icon: ClipboardList, roles: ['restaurant'] },
  { href: '/restaurant/menu', label: 'Menu', icon: Menu, roles: ['restaurant'] },
  { href: '/restaurant/analytics', label: 'Analytics', icon: BarChart3, roles: ['restaurant'] },
  { href: '/rider', label: 'Rider', icon: Bike, roles: ['rider'] },
  { href: '/rider/current', label: 'Current', icon: PackageCheck, roles: ['rider'] },
  { href: '/rider/history', label: 'History', icon: ClipboardList, roles: ['rider'] },
];

function isActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeRole = useSessionStore((state) => state.activeRole);
  const collapsed = useSidebarStore((state) => state.collapsed);
  const toggleCollapsed = useSidebarStore((state) => state.toggleCollapsed);
  const itemCount = useCartStore((state) => state.itemCount());
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(activeRole),
  );

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <div className="flex min-h-dvh">
        <aside
          className={cn(
            'sticky top-0 hidden h-dvh shrink-0 border-r border-border bg-card/92 backdrop-blur lg:flex lg:flex-col',
            collapsed ? 'w-24' : 'w-80',
          )}
        >
          <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-4">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Store className="h-5 w-5" />
              </span>
              {!collapsed ? (
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    Food Delivery
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    Observability
                  </span>
                </span>
              ) : null}
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={toggleCollapsed}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Primary">
            {visibleNavigation.map((item) => {
              const Icon = item.icon;
              const selected = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    collapsed && 'justify-center px-2',
                  )}
                  aria-current={selected ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>
          <div className="space-y-3 border-t border-border p-3">
            {!collapsed ? <RoleSwitcher compact /> : null}
            <Button
              type="button"
              variant="outline"
              className={cn('w-full justify-start', collapsed && 'px-0')}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              {!collapsed ? <span>Theme</span> : <span className="sr-only">Theme</span>}
            </Button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-border bg-background/88 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              <Link
                href="/"
                className="flex items-center gap-2 font-semibold lg:hidden"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Store className="h-4 w-4" />
                </span>
                <span>Food Delivery</span>
              </Link>
              <div className="hidden min-w-0 text-sm text-muted-foreground lg:block">
                Local frontend traffic flows through the observable NestJS API.
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/cart">
                    <ShoppingCart className="h-4 w-4" />
                    <span>Cart</span>
                    {itemCount > 0 ? (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                        {itemCount}
                      </span>
                    ) : null}
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Toggle theme"
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </header>
          <main
            id="main-content"
            className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 py-2 shadow-lg backdrop-blur lg:hidden"
        aria-label="Mobile primary"
      >
        <div className="grid grid-cols-4 gap-1">
          {visibleNavigation.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const selected = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
                aria-current={selected ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
