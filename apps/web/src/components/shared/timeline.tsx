import { CheckCircle2, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimelineItem = {
  label: string;
  detail?: string;
  complete?: boolean;
  current?: boolean;
};

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="space-y-4">
      {items.map((item, index) => {
        const Icon = item.complete ? CheckCircle2 : CircleDashed;

        return (
          <li className="flex gap-3" key={`${item.label}-${index}`}>
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-lg border',
                  item.complete
                    ? 'border-accent bg-accent text-accent-foreground'
                    : item.current
                      ? 'border-secondary bg-secondary text-secondary-foreground'
                      : 'border-border bg-muted text-muted-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {index < items.length - 1 ? (
                <span className="mt-2 h-full min-h-6 w-px bg-border" />
              ) : null}
            </div>
            <div className="min-w-0 pb-3">
              <p className="font-medium">{item.label}</p>
              {item.detail ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.detail}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
