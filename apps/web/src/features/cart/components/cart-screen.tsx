'use client';

import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, toNumber } from '@/lib/format';
import { useCartStore } from '@/stores/cart-store';

export function CartScreen() {
  const lines = useCartStore((state) => state.lines);
  const removeItem = useCartStore((state) => state.removeItem);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const clear = useCartStore((state) => state.clear);
  const subtotal = useCartStore((state) => state.subtotal());

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Customer"
        title="Cart"
        description="Cart state is local, while checkout creates a real backend order."
        actions={
          lines.length > 0 ? (
            <Button type="button" variant="outline" onClick={clear}>
              <Trash2 className="h-4 w-4" />
              Clear cart
            </Button>
          ) : null
        }
      />

      {lines.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Cart is empty"
          description="Add menu items from a restaurant to prepare an observable checkout."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {lines.map((line) => (
              <Card key={line.menuItemId}>
                <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {line.restaurantName}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">{line.name}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {formatCurrency(line.price)} each
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 md:justify-end">
                    <div className="flex items-center rounded-lg border border-border">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Decrease ${line.name}`}
                        onClick={() =>
                          line.quantity <= 1
                            ? removeItem(line.menuItemId)
                            : setQuantity(line.menuItemId, line.quantity - 1)
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-10 text-center font-semibold tabular-nums">
                        {line.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Increase ${line.name}`}
                        onClick={() =>
                          setQuantity(line.menuItemId, line.quantity + 1)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="min-w-24 text-right font-semibold">
                      {formatCurrency(toNumber(line.price) * line.quantity)}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => removeItem(line.menuItemId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-lg font-semibold">Checkout summary</h2>
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-2xl font-semibold">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <Button asChild className="w-full" size="lg">
                <Link href="/checkout">Checkout</Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href={`/restaurants/${lines[0]?.restaurantId}`}>
                  Add more from this restaurant
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
