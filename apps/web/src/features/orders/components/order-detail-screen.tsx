'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/shared/skeleton';
import { StatusBadge } from '@/components/shared/status-badge';
import { Timeline } from '@/components/shared/timeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRoleSession } from '@/hooks/use-role-session';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { useSessionStore } from '@/stores/session-store';
import { canCustomerCancelOrder, getOrderTimeline } from '../lib/order-view';
import { useCancelOrder, useOrderDetail, useRetryPayment } from '../hooks/use-orders';

export function OrderDetailScreen({ orderId }: { orderId: string }) {
  const activeRole = useSessionStore((state) => state.activeRole);
  useRoleSession(activeRole);
  const orderQuery = useOrderDetail(orderId);
  const cancelMutation = useCancelOrder();
  const retryPaymentMutation = useRetryPayment(orderId);
  const order = orderQuery.data;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Tracking"
        title={order ? `Order ${order.id.slice(0, 8)}` : 'Order details'}
        description="Status transitions are served by the existing backend lifecycle."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => void orderQuery.refetch()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {orderQuery.isPending ? <Skeleton className="h-96" /> : null}
      {orderQuery.isError ? (
        <ErrorState
          error={orderQuery.error}
          onRetry={() => void orderQuery.refetch()}
        />
      ) : null}

      {order ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <Card>
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={order.status} />
                {order.payment ? <StatusBadge status={order.payment.status} /> : null}
              </div>
              <div>
                <h2 className="text-2xl font-semibold">
                  {order.restaurant.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Created {formatDateTime(order.createdAt)}
                </p>
              </div>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <span>
                      {item.quantity}x {item.menuItem.name}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(Number(item.priceSnapshot) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="font-medium">Total</span>
                <span className="text-2xl font-semibold">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeRole === 'customer' && canCustomerCancelOrder(order) ? (
                  <Button
                    type="button"
                    variant="destructive"
                    isLoading={cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate(order.id)}
                  >
                    Cancel order
                  </Button>
                ) : null}
                {activeRole === 'customer' &&
                order.payment?.status === 'FAILED' ? (
                  <Button
                    type="button"
                    variant="secondary"
                    isLoading={retryPaymentMutation.isPending}
                    onClick={() => retryPaymentMutation.mutate()}
                  >
                    Retry payment
                  </Button>
                ) : null}
                <Button asChild variant="outline">
                  <Link href="/orders">Back to orders</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 text-lg font-semibold">Timeline</h2>
              <Timeline items={getOrderTimeline(order)} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
