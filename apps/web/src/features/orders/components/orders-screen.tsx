'use client';

import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/shared/skeleton';
import { Button } from '@/components/ui/button';
import { useRoleSession } from '@/hooks/use-role-session';
import { OrderCard } from './order-card';
import { useCustomerOrders } from '../hooks/use-orders';

export function OrdersScreen() {
  useRoleSession('customer');
  const ordersQuery = useCustomerOrders();
  const orders = ordersQuery.data ?? [];

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Customer"
        title="Order history"
        description="Track created orders and payment or delivery status."
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
      {ordersQuery.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : null}
      {ordersQuery.isError ? (
        <ErrorState
          error={ordersQuery.error}
          onRetry={() => void ordersQuery.refetch()}
        />
      ) : null}
      {!ordersQuery.isPending && orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Create a checkout to populate this observable history."
        />
      ) : null}
      <div className="space-y-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </section>
  );
}
