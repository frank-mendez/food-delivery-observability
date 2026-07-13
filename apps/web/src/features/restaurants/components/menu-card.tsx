'use client';

import { Plus, Utensils } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import type { MenuItem } from '@/types/domain';

export function MenuCard({
  item,
  onAdd,
}: {
  item: MenuItem;
  onAdd?: (item: MenuItem) => void;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
            <Utensils className="h-5 w-5" />
          </span>
          <StatusBadge status={item.isAvailable ? 'AVAILABLE' : 'CLOSED'} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">{item.name}</h3>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(item.price)}
          </p>
        </div>
        {onAdd ? (
          <Button
            type="button"
            variant="secondary"
            disabled={!item.isAvailable}
            onClick={() => onAdd(item)}
          >
            <Plus className="h-4 w-4" />
            Add to cart
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
