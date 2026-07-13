'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useRoleSession } from '@/hooks/use-role-session';
import { normalizeApiError } from '@/lib/api/errors';
import { formatCurrency } from '@/lib/format';
import { useRestaurantMenu } from '@/features/restaurants/hooks/use-restaurants';
import {
  useCreateMenuItem,
  useSelectedOwnerRestaurant,
  useUpdateMenuItem,
} from '../hooks/use-restaurant-portal';
import { menuItemSchema, type MenuItemValues } from '../schemas/menu-item-schema';

export function RestaurantMenuScreen() {
  useRoleSession('restaurant');
  const restaurantQuery = useSelectedOwnerRestaurant();
  const restaurant = restaurantQuery.restaurant;
  const menuQuery = useRestaurantMenu(restaurant?.id ?? '');
  const createMutation = useCreateMenuItem(restaurant?.id);
  const updateMutation = useUpdateMenuItem(restaurant?.id);
  const form = useForm<MenuItemValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: '',
      price: 9.99,
      isAvailable: true,
    },
  });
  const isAvailable = useWatch({
    control: form.control,
    name: 'isAvailable',
  });

  async function onSubmit(values: MenuItemValues) {
    try {
      await createMutation.mutateAsync(values);
      form.reset({ name: '', price: 9.99, isAvailable: true });
      toast.success('Menu item created');
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Restaurant"
        title="Menu management"
        description="Create items and toggle availability through owner-protected menu endpoints."
      />

      {menuQuery.isError ? (
        <ErrorState error={menuQuery.error} onRetry={() => void menuQuery.refetch()} />
      ) : null}

      <Card>
        <CardContent className="p-5">
          <form
            className="grid gap-3 md:grid-cols-[1fr_160px_180px_auto] md:items-end"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="grid gap-2">
              <Label htmlFor="menu-name">Item name</Label>
              <Input id="menu-name" {...form.register('name')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-price">Price</Label>
              <Input
                id="menu-price"
                type="number"
                step="0.01"
                min="0.01"
                {...form.register('price', { valueAsNumber: true })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-available">Availability</Label>
              <Select
                id="menu-available"
                value={isAvailable ? 'true' : 'false'}
                onChange={(event) =>
                  form.setValue('isAvailable', event.target.value === 'true')
                }
              >
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </Select>
            </div>
            <Button type="submit" isLoading={createMutation.isPending}>
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          </form>
        </CardContent>
      </Card>

      {(menuQuery.data ?? []).length === 0 && !menuQuery.isPending ? (
        <EmptyState
          title="No menu items"
          description="Add the first menu item to make this restaurant checkout-ready."
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(menuQuery.data ?? []).map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{item.name}</h2>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatCurrency(item.price)}
                  </p>
                </div>
                <StatusBadge status={item.isAvailable ? 'AVAILABLE' : 'CLOSED'} />
              </div>
              <Button
                className="w-full"
                type="button"
                variant="outline"
                isLoading={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    menuItemId: item.id,
                    payload: { isAvailable: !item.isAvailable },
                  })
                }
              >
                {item.isAvailable ? 'Pause item' : 'Resume item'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
