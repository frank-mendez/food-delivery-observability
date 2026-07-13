import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/shared/skeleton';

export default function Loading() {
  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Loading"
        title="Preparing the operations view"
        description="Fetching the latest local stack state."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-96" />
    </section>
  );
}
