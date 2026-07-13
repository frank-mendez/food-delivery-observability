'use client';

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
import { useRiderDeliveries } from '../hooks/use-rider';

export function DeliveryHistoryScreen() {
  useRoleSession('rider');
  const deliveriesQuery = useRiderDeliveries();
  const deliveries = deliveriesQuery.data ?? [];

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Rider"
        title="Delivery history"
        description="Review assigned and completed deliveries from the backend rider endpoint."
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

      {deliveriesQuery.isPending ? <Skeleton className="h-64" /> : null}
      {deliveriesQuery.isError ? (
        <ErrorState
          error={deliveriesQuery.error}
          onRetry={() => void deliveriesQuery.refetch()}
        />
      ) : null}
      {!deliveriesQuery.isPending && deliveries.length === 0 ? (
        <EmptyState
          title="No delivery history"
          description="Kitchen ready actions assign deliveries when the seeded rider is available."
        />
      ) : null}

      <div className="space-y-3">
        {deliveries.map((delivery) => (
          <Card key={delivery.id}>
            <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={delivery.status} />
                  {delivery.order ? <StatusBadge status={delivery.order.status} /> : null}
                </div>
                <h2 className="mt-3 text-lg font-semibold">
                  {delivery.order?.restaurant.name ?? 'Delivery assignment'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Updated {formatDateTime(delivery.updatedAt)}
                </p>
              </div>
              <p className="text-2xl font-semibold">
                {formatCurrency(delivery.order?.totalAmount ?? 0)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
