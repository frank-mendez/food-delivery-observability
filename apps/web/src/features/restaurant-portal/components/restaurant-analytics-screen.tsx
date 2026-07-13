'use client';

import { BarChart3, Clock3, ReceiptText, Utensils } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { MetricCard } from '@/components/shared/metric-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { useRoleSession } from '@/hooks/use-role-session';
import { formatCurrency } from '@/lib/format';
import {
  useRestaurantOrders,
  useSelectedOwnerRestaurant,
} from '../hooks/use-restaurant-portal';

export function RestaurantAnalyticsScreen() {
  useRoleSession('restaurant');
  const restaurantQuery = useSelectedOwnerRestaurant();
  const restaurant = restaurantQuery.restaurant;
  const ordersQuery = useRestaurantOrders(restaurant?.id);
  const orders = ordersQuery.data ?? [];
  const completed = orders.filter((order) => order.status === 'DELIVERED').length;
  const active = orders.filter((order) =>
    ['PAID', 'ACCEPTED', 'PREPARING', 'READY', 'RIDER_ASSIGNED'].includes(
      order.status,
    ),
  ).length;
  const revenue = orders.reduce((total, order) => total + Number(order.totalAmount), 0);
  const average = orders.length > 0 ? revenue / orders.length : 0;
  const statusCounts = orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;

    return acc;
  }, {});

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Restaurant"
        title="Analytics"
        description="Operational cards derived from real order and menu responses."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={formatCurrency(revenue)}
          detail="Visible order value"
          icon={BarChart3}
          tone="green"
        />
        <MetricCard
          label="Average order"
          value={formatCurrency(average)}
          detail={`${orders.length} orders`}
          icon={ReceiptText}
          tone="blue"
        />
        <MetricCard
          label="Active queue"
          value={String(active)}
          detail="Kitchen and dispatch"
          icon={Clock3}
          tone="orange"
        />
        <MetricCard
          label="Delivered"
          value={String(completed)}
          detail="Completed deliveries"
          icon={Utensils}
          tone="slate"
        />
      </div>

      {orders.length === 0 && !ordersQuery.isPending ? (
        <EmptyState
          title="No analytics yet"
          description="Create and progress orders to populate status distribution."
        />
      ) : (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold">Order status distribution</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <StatusBadge status={status} />
                  <span className="font-semibold tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
