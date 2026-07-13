import { Badge, type BadgeProps } from '@/components/ui/badge';
import { sentenceCase } from '@/lib/format';

const variantByStatus: Record<string, BadgeProps['variant']> = {
  OPEN: 'accent',
  CLOSED: 'muted',
  PAID: 'accent',
  ACCEPTED: 'accent',
  PREPARING: 'secondary',
  READY: 'secondary',
  DELIVERED: 'accent',
  SUCCEEDED: 'accent',
  FAILED: 'destructive',
  PAYMENT_FAILED: 'destructive',
  REJECTED: 'destructive',
  CANCELLED: 'muted',
  OFFLINE: 'muted',
  AVAILABLE: 'accent',
  BUSY: 'secondary',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={variantByStatus[status] ?? 'outline'}>
      {sentenceCase(status)}
    </Badge>
  );
}
