import Link from 'next/link';
import { ArrowRight, Clock3, Store } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Restaurant } from '@/types/domain';

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const menuCount = restaurant.menuItems?.length ?? 0;

  return (
    <Card className="group overflow-hidden transition-colors hover:border-primary/50">
      <CardContent className="p-0">
        <div className="operational-band border-b border-border p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="h-6 w-6" />
            </span>
            <StatusBadge status={restaurant.status} />
          </div>
          <h2 className="mt-5 text-xl font-semibold">{restaurant.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {menuCount} active menu signals ready for checkout traffic.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 p-5">
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            Local seed kitchen
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href={`/restaurants/${restaurant.id}`}>
              Menu <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
