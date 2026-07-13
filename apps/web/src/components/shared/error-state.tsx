import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizeApiError } from '@/lib/api/errors';

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const normalized = normalizeApiError(error);

  return (
    <div className="rounded-lg border border-destructive/35 bg-destructive/10 p-5 text-destructive">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h2 className="font-semibold">Request failed</h2>
          <p className="mt-1 text-sm">{normalized.message}</p>
          {onRetry ? (
            <Button
              className="mt-4"
              variant="destructive"
              size="sm"
              onClick={onRetry}
            >
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
