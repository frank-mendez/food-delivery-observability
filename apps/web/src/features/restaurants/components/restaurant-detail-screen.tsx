'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState } from '@/components/shared/error-state';
import { CardGridSkeleton } from '@/components/shared/skeleton';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cart-store';
import type { MenuItem } from '@/types/domain';
import { MenuCard } from './menu-card';
import { useRestaurant, useRestaurantMenu } from '../hooks/use-restaurants';

export function RestaurantDetailScreen({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const restaurantQuery = useRestaurant(restaurantId);
  const menuQuery = useRestaurantMenu(restaurantId);
  const addItem = useCartStore((state) => state.addItem);
  const restaurant = restaurantQuery.data;

  function handleAdd(item: MenuItem) {
    if (!restaurant) {
      return;
    }

    addItem(item, restaurant.name);
    toast.success(`${item.name} added to cart`);
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Menu"
        title={restaurant?.name ?? 'Restaurant details'}
        description="Add available items to a single-restaurant cart, then checkout with the seeded customer account."
        actions={
          <Button asChild>
            <Link href="/cart">
              <ShoppingCart className="h-4 w-4" />
              Cart
            </Link>
          </Button>
        }
      />

      {restaurantQuery.isError ? (
        <ErrorState
          error={restaurantQuery.error}
          onRetry={() => void restaurantQuery.refetch()}
        />
      ) : null}
      {menuQuery.isPending ? <CardGridSkeleton /> : null}
      {menuQuery.isError ? (
        <ErrorState error={menuQuery.error} onRetry={() => void menuQuery.refetch()} />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(menuQuery.data ?? []).map((item) => (
          <MenuCard key={item.id} item={item} onAdd={handleAdd} />
        ))}
      </div>
    </section>
  );
}
