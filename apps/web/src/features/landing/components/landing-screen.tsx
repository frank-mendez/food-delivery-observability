'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Bike,
  ChefHat,
  ReceiptText,
  Store,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState } from '@/components/shared/error-state';
import { MetricCard } from '@/components/shared/metric-card';
import { CardGridSkeleton } from '@/components/shared/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RoleSwitcher } from '@/features/auth/components/role-switcher';
import { RestaurantCard } from '@/features/restaurants/components/restaurant-card';
import { useRestaurants } from '@/features/restaurants/hooks/use-restaurants';
import { useHealth } from '../hooks/use-health';

export function LandingScreen() {
  const restaurantsQuery = useRestaurants();
  const healthQuery = useHealth();
  const restaurants = restaurantsQuery.data ?? [];
  const openRestaurants = restaurants.filter(
    (restaurant) => restaurant.status === 'OPEN',
  ).length;
  const menuItems = restaurants.reduce(
    (total, restaurant) => total + (restaurant.menuItems?.length ?? 0),
    0,
  );

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Phase 4 frontend"
        title="A live operations console for the local delivery stack"
        description="Browse seeded restaurants, create observable orders, advance kitchen workflows, and move rider deliveries through the real backend."
        actions={
          <>
            <Button asChild>
              <Link href="/restaurants">
                Browse restaurants <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/restaurant">Restaurant portal</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="API status"
          value={healthQuery.data?.status ?? 'Checking'}
          detail="Via Next proxy"
          icon={Activity}
          tone={healthQuery.data?.status === 'ok' ? 'green' : 'orange'}
        />
        <MetricCard
          label="Open restaurants"
          value={String(openRestaurants)}
          detail={`${restaurants.length} seeded kitchens`}
          icon={Store}
          tone="blue"
        />
        <MetricCard
          label="Menu items"
          value={String(menuItems)}
          detail="Cart-ready selections"
          icon={ReceiptText}
          tone="orange"
        />
        <MetricCard
          label="Roles"
          value="3"
          detail="Customer, owner, rider"
          icon={Bike}
          tone="green"
        />
      </div>

      <RoleSwitcher />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Seeded restaurants</h2>
            <Button asChild variant="link">
              <Link href="/restaurants">View all</Link>
            </Button>
          </div>
          {restaurantsQuery.isPending ? <CardGridSkeleton count={3} /> : null}
          {restaurantsQuery.isError ? (
            <ErrorState
              error={restaurantsQuery.error}
              onRetry={() => void restaurantsQuery.refetch()}
            />
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
            {restaurants.slice(0, 3).map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        </section>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <ChefHat className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold">Observable workflow</h2>
                <p className="text-sm text-muted-foreground">
                  Each step calls the backend and emits logs, metrics, and traces.
                </p>
              </div>
            </div>
            <div className="grid gap-3">
              {[
                ['Customer checkout', '/checkout'],
                ['Owner order queue', '/restaurant/orders'],
                ['Rider delivery board', '/rider/current'],
              ].map(([label, href]) => (
                <Button key={href} asChild variant="outline" className="justify-between">
                  <Link href={href}>
                    {label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
