'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
          <section className="max-w-lg rounded-lg border border-destructive/30 bg-card p-6 shadow-sm">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <h1 className="mt-4 text-2xl font-semibold">
              The frontend hit an error
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error.message || 'An unexpected rendering error occurred.'}
            </p>
            <Button className="mt-5" onClick={reset}>
              Try again
            </Button>
          </section>
        </main>
      </body>
    </html>
  );
}
