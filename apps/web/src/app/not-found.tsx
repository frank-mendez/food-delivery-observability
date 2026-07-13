import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
        <Compass className="h-7 w-7" />
      </span>
      <h1 className="mt-6 text-3xl font-semibold">Route not found</h1>
      <p className="mt-3 text-muted-foreground">
        This workspace has no screen at that address.
      </p>
      <Button asChild className="mt-6">
        <Link href="/restaurants">Back to restaurants</Link>
      </Button>
    </section>
  );
}
