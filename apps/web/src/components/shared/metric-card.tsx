import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  icon?: LucideIcon;
  tone?: 'blue' | 'orange' | 'green' | 'slate';
};

const toneClassName = {
  blue: 'bg-primary/10 text-primary',
  orange: 'bg-secondary/10 text-secondary',
  green: 'bg-accent/10 text-accent',
  slate: 'bg-muted text-foreground',
};

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon = ArrowUpRight,
  tone = 'blue',
}: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold leading-none">{value}</p>
          {detail ? (
            <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
          ) : null}
        </div>
        <span
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-lg',
            toneClassName[tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}
