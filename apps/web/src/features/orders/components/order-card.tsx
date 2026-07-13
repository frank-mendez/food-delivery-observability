import Link from 'next/link';
import { ArrowRight, ReceiptText } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { getOrderTotalItems } from '@/features/orders/lib/order-view';
import type { Order } from '@/types/domain';

export function OrderCard({ order }: { order: Order }) {
  return (
    <Card>
      <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ReceiptText className="h-5 w-5" />
            </span>
            <StatusBadge status={order.status} />
            {order.payment ? <StatusBadge status={order.payment.status} /> : null}
          </div>
          <h3 className="mt-4 text-lg font-semibold">
            {order.restaurant.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {getOrderTotalItems(order)} items · {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
          <p className="text-2xl font-semibold">
            {formatCurrency(order.totalAmount)}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/orders/${order.id}`}>
              Track <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
