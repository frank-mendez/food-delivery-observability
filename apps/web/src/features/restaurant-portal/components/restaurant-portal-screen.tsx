'use client';

import Link from 'next/link';
import { BarChart3, ClipboardList, Menu, Power } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { MetricCard } from '@/components/shared/metric-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRoleSession } from '@/hooks/use-role-session';
import { formatCurrency } from '@/lib/format';
import {
  useRestaurantOrders,
  useSelectedOwnerRestaurant,
  useUpdateRestaurantStatus,
} from '../hooks/use-restaurant-portal';

export function RestaurantPortalScreen() {
  useRoleSession('restaurant');
  const restaurantQuery = useSelectedOwnerRestaurant();
  const restaurant = restaurantQuery.restaurant;
  const ordersQuery = useRestaurantOrders(restaurant?.id);
  const statusMutation = useUpdateRestaurantStatus(restaurant?.id);
  const orders = ordersQuery.data ?? [];
  const revenue = orders.reduce((total, order) => total + Number(order.totalAmount), 0);
  const activeOrders = orders.filter((order) =>
    ['PAID', 'ACCEPTED', 'PREPARING', 'READY', 'RIDER_ASSIGNED'].includes(
      order.status,
    ),
  ).length;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Restaurant"
        title={restaurant?.name ?? 'Restaurant portal'}
        description="Operate the seeded owner account through protected restaurant endpoints."
        actions={
          restaurant ? (
            <Button
              type="button"
              variant={restaurant.status === 'OPEN' ? 'outline' : 'secondary'}
              isLoading={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate(
                  restaurant.status === 'OPEN' ? 'CLOSED' : 'OPEN',
                )
              }
            >
              <Power className="h-4 w-4" />
              {restaurant.status === 'OPEN' ? 'Close kitchen' : 'Open kitchen'}
            </Button>
          ) : null
        }
      />

      {restaurantQuery.isError ? (
        <ErrorState
          error={restaurantQuery.error}
          onRetry={() => void restaurantQuery.refetch()}
        />
      ) : null}

      {!restaurant && !restaurantQuery.isPending ? (
        <EmptyState
          title="No owned restaurants"
          description="The seeded owner account should own the local restaurants after migrations and seed data run."
        />
      ) : null}

      {restaurant ? (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{restaurant.name}</h2>
                  <StatusBadge status={restaurant.status} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {restaurant.menuItems?.length ?? 0} menu items wired to cart and checkout.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href="/restaurant/orders">
                    <ClipboardList className="h-4 w-4" />
                    Orders
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/restaurant/menu">
                    <Menu className="h-4 w-4" />
                    Menu
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/restaurant/analytics">
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Active orders"
              value={String(activeOrders)}
              detail="Owner workflow queue"
              icon={ClipboardList}
              tone="orange"
            />
            <MetricCard
              label="Total order value"
              value={formatCurrency(revenue)}
              detail={`${orders.length} visible orders`}
              icon={BarChart3}
              tone="green"
            />
            <MetricCard
              label="Menu items"
              value={String(restaurant.menuItems?.length ?? 0)}
              detail="Editable catalog"
              icon={Menu}
              tone="blue"
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
