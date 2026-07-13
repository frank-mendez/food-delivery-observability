'use client';

import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/shared/skeleton';
import { StatusBadge } from '@/components/shared/status-badge';
import { Timeline } from '@/components/shared/timeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRoleSession } from '@/hooks/use-role-session';
import { formatCurrency } from '@/lib/format';
import {
  getDeliveryTimeline,
  nextDeliveryAction,
} from '@/features/orders/lib/order-view';
import { useRiderDeliveries, useUpdateDelivery } from '../hooks/use-rider';

export function CurrentDeliveryScreen() {
  useRoleSession('rider');
  const deliveriesQuery = useRiderDeliveries();
  const updateDeliveryMutation = useUpdateDelivery();
  const delivery = (deliveriesQuery.data ?? []).find(
    (item) => item.status !== 'DELIVERED',
  );
  const nextAction = delivery ? nextDeliveryAction(delivery) : null;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Rider"
        title="Current delivery"
        description="Advance assigned deliveries through accept, pickup, out-for-delivery, and delivered states."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => void deliveriesQuery.refetch()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {deliveriesQuery.isPending ? <Skeleton className="h-96" /> : null}
      {deliveriesQuery.isError ? (
        <ErrorState
          error={deliveriesQuery.error}
          onRetry={() => void deliveriesQuery.refetch()}
        />
      ) : null}

      {!delivery && !deliveriesQuery.isPending ? (
        <EmptyState
          title="No active delivery"
          description="Ready restaurant orders are assigned by the backend when a rider is available."
        />
      ) : null}

      {delivery ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={delivery.status} />
                {delivery.order ? <StatusBadge status={delivery.order.status} /> : null}
              </div>
              <div>
                <h2 className="text-2xl font-semibold">
                  {delivery.order?.restaurant.name ?? 'Assigned order'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Delivery {delivery.id.slice(0, 8)}
                </p>
              </div>
              <div className="space-y-3">
                {(delivery.order?.items ?? []).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
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
              {nextAction ? (
                <Button
                  type="button"
                  size="lg"
                  isLoading={updateDeliveryMutation.isPending}
                  onClick={() =>
                    updateDeliveryMutation.mutate({
                      deliveryId: delivery.id,
                      action: nextAction.action,
                    })
                  }
                >
                  {nextAction.label}
                </Button>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 text-lg font-semibold">Delivery timeline</h2>
              <Timeline items={getDeliveryTimeline(delivery)} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
