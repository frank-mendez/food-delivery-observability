'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRoleSession } from '@/hooks/use-role-session';
import { normalizeApiError } from '@/lib/api/errors';
import { formatCurrency } from '@/lib/format';
import { useCartStore } from '@/stores/cart-store';
import { useCustomerProfile, useUpdateCustomerProfile } from '@/features/customer/hooks/use-customer';
import { useCreateOrder } from '@/features/orders/hooks/use-orders';
import { checkoutSchema, type CheckoutValues } from '../schemas/checkout-schema';

export function CheckoutScreen() {
  const router = useRouter();
  const lines = useCartStore((state) => state.lines);
  const subtotal = useCartStore((state) => state.subtotal());
  const clearCart = useCartStore((state) => state.clear);
  const { ensureSession, isConnecting } = useRoleSession('customer');
  const profileQuery = useCustomerProfile();
  const updateProfileMutation = useUpdateCustomerProfile();
  const createOrderMutation = useCreateOrder();
  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      paymentScenario: 'success',
    },
  });

  useEffect(() => {
    const profile = profileQuery.data;

    if (profile) {
      form.reset({
        name: profile.name,
        phone: profile.phone ?? '',
        address: profile.customerProfile?.address ?? '',
        paymentScenario: form.getValues('paymentScenario'),
      });
    }
  }, [form, profileQuery.data]);

  async function onSubmit(values: CheckoutValues) {
    if (lines.length === 0) {
      return;
    }

    try {
      await ensureSession('customer');
      await updateProfileMutation.mutateAsync({
        name: values.name,
        phone: values.phone,
        address: values.address,
      });
      const order = await createOrderMutation.mutateAsync({
        restaurantId: lines[0].restaurantId,
        items: lines.map((line) => ({
          menuItemId: line.menuItemId,
          quantity: line.quantity,
        })),
        paymentScenario: values.paymentScenario,
      });

      clearCart();
      toast.success('Order created');
      router.push(`/orders/${order.id}`);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  if (lines.length === 0) {
    return (
      <section className="space-y-6">
        <PageHeader
          eyebrow="Customer"
          title="Checkout"
          description="Checkout creates an order against the existing backend."
        />
        <EmptyState
          title="No cart lines"
          description="Add restaurant menu items before opening checkout."
        />
      </section>
    );
  }

  const isSubmitting =
    form.formState.isSubmitting ||
    createOrderMutation.isPending ||
    updateProfileMutation.isPending ||
    isConnecting;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Customer"
        title="Checkout"
        description="Validate delivery details, then submit a real order with a selectable payment simulation."
      />

      <form
        className="grid gap-4 lg:grid-cols-[1fr_380px]"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Card>
          <CardContent className="grid gap-4 p-5">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" autoComplete="name" {...form.register('name')} />
              {form.formState.errors.name ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                autoComplete="tel"
                inputMode="tel"
                {...form.register('phone')}
              />
              {form.formState.errors.phone ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.phone.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Delivery address</Label>
              <Textarea
                id="address"
                autoComplete="street-address"
                {...form.register('address')}
              />
              {form.formState.errors.address ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.address.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paymentScenario">Payment simulation</Label>
              <Select id="paymentScenario" {...form.register('paymentScenario')}>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="timeout">Timeout</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <div className="space-y-3">
              {lines.map((line) => (
                <div
                  key={line.menuItemId}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <span>
                    {line.quantity}x {line.name}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(Number(line.price) * line.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="font-medium">Subtotal</span>
              <span className="text-2xl font-semibold">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <Button className="w-full" size="lg" type="submit" isLoading={isSubmitting}>
              Place order
            </Button>
          </CardContent>
        </Card>
      </form>
    </section>
  );
}
