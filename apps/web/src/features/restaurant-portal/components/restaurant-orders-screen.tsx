'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/shared/skeleton';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRoleSession } from '@/hooks/use-role-session';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { Order } from '@/types/domain';
import {
  useRestaurantOrders,
  useSelectedOwnerRestaurant,
  useTransitionRestaurantOrder,
} from '../hooks/use-restaurant-portal';

function nextRestaurantActions(order: Order) {
  switch (order.status) {
    case 'PAID':
      return [
        { action: 'accept' as const, label: 'Accept', variant: 'accent' as const },
        { action: 'reject' as const, label: 'Reject', variant: 'destructive' as const },
      ];
    case 'ACCEPTED':
      return [{ action: 'preparing' as const, label: 'Start preparing', variant: 'secondary' as const }];
    case 'PREPARING':
      return [{ action: 'ready' as const, label: 'Mark ready', variant: 'default' as const }];
    default:
      return [];
  }
}

export function RestaurantOrdersScreen() {
  useRoleSession('restaurant');
  const restaurantQuery = useSelectedOwnerRestaurant();
  const restaurant = restaurantQuery.restaurant;
  const ordersQuery = useRestaurantOrders(restaurant?.id);
  const transitionMutation = useTransitionRestaurantOrder(restaurant?.id);
  const orders = ordersQuery.data ?? [];

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Restaurant"
        title="Incoming and active orders"
        description="Accept, reject, prepare, and mark orders ready through the protected owner API."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => void ordersQuery.refetch()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {ordersQuery.isPending ? <Skeleton className="h-64" /> : null}
      {ordersQuery.isError ? (
        <ErrorState
          error={ordersQuery.error}
          onRetry={() => void ordersQuery.refetch()}
        />
      ) : null}
      {!ordersQuery.isPending && orders.length === 0 ? (
        <EmptyState
          title="No restaurant orders"
          description="Create a customer checkout, then return here to move the kitchen workflow."
        />
      ) : null}

      <div className="space-y-3">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardContent className="grid gap-4 p-5 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={order.status} />
                  {order.payment ? <StatusBadge status={order.payment.status} /> : null}
                </div>
                <h2 className="mt-3 text-lg font-semibold">
                  Order {order.id.slice(0, 8)}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {order.items.length} lines · {formatDateTime(order.createdAt)} ·{' '}
                  {formatCurrency(order.totalAmount)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {nextRestaurantActions(order).map((item) => (
                  <Button
                    key={item.action}
                    type="button"
                    variant={item.variant}
                    isLoading={transitionMutation.isPending}
                    onClick={() =>
                      transitionMutation.mutate({
                        orderId: order.id,
                        action: item.action,
                      })
                    }
                  >
                    {item.label}
                  </Button>
                ))}
                <Button asChild variant="outline">
                  <Link href={`/orders/${order.id}`}>Details</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
