import { type LucideIcon, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = SearchX,
  className,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-6 text-center',
        className,
      )}
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {actionLabel && onAction ? (
        <Button className="mt-5" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
