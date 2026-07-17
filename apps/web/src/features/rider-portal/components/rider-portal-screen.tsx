'use client';

import Link from 'next/link';
import { Bike, Clock3, PackageCheck, Route } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { MetricCard } from '@/components/shared/metric-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useRoleSession } from '@/hooks/use-role-session';
import { formatDateTime } from '@/lib/format';
import type { RiderAvailability } from '@/types/domain';
import { getCurrentDelivery } from '@/features/orders/lib/order-view';
import {
  useRiderDeliveries,
  useRiderProfile,
  useUpdateRiderAvailability,
} from '../hooks/use-rider';

export function RiderPortalScreen() {
  useRoleSession('rider');
  const profileQuery = useRiderProfile();
  const deliveriesQuery = useRiderDeliveries();
  const availabilityMutation = useUpdateRiderAvailability();
  const deliveries = deliveriesQuery.data ?? [];
  const current = getCurrentDelivery(deliveries);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Rider"
        title="Rider portal"
        description="Manage availability and progress assigned deliveries through the protected rider API."
        actions={
          <Button asChild>
            <Link href="/rider/current">
              <PackageCheck className="h-4 w-4" />
              Current delivery
            </Link>
          </Button>
        }
      />

      {profileQuery.isError ? (
        <ErrorState
          error={profileQuery.error}
          onRetry={() => void profileQuery.refetch()}
        />
      ) : null}

      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_240px] md:items-end">
          <div>
            <h2 className="text-xl font-semibold">
              {profileQuery.data?.user.name ?? 'Demo Rider'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {profileQuery.data?.user.email ?? 'rider@example.com'}
            </p>
            {profileQuery.data ? (
              <div className="mt-3">
                <StatusBadge status={profileQuery.data.availability} />
              </div>
            ) : null}
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="availability">
              Availability
            </label>
            <Select
              id="availability"
              value={profileQuery.data?.availability ?? 'AVAILABLE'}
              disabled={availabilityMutation.isPending}
              onChange={(event) =>
                availabilityMutation.mutate(
                  event.target.value as RiderAvailability,
                )
              }
            >
              <option value="AVAILABLE">Available</option>
              <option value="BUSY">Busy</option>
              <option value="OFFLINE">Offline</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Deliveries"
          value={String(deliveries.length)}
          detail="Assigned to rider"
          icon={Bike}
          tone="blue"
        />
        <MetricCard
          label="Current"
          value={current ? current.status.replaceAll('_', ' ') : 'None'}
          detail={current?.order?.restaurant.name ?? 'No active assignment'}
          icon={Route}
          tone={current ? 'orange' : 'slate'}
        />
        <MetricCard
          label="Last update"
          value={current ? formatDateTime(current.updatedAt) : 'Idle'}
          detail="Delivery status clock"
          icon={Clock3}
          tone="green"
        />
      </div>

      {!current && !deliveriesQuery.isPending ? (
        <EmptyState
          title="No current delivery"
          description="Mark a restaurant order ready to let the backend assign an available rider."
        />
      ) : null}
    </section>
  );
}
