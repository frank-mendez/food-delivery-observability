'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRoleSession } from '@/hooks/use-role-session';
import { normalizeApiError } from '@/lib/api/errors';
import { useCustomerProfile, useUpdateCustomerProfile } from '@/features/customer/hooks/use-customer';
import { profileSchema, type ProfileValues } from '../schemas/profile-schema';

export function ProfileScreen() {
  const { ensureSession, isConnecting } = useRoleSession('customer');
  const profileQuery = useCustomerProfile();
  const updateProfileMutation = useUpdateCustomerProfile();
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      phone: '',
      address: '',
    },
  });

  useEffect(() => {
    const profile = profileQuery.data;

    if (profile) {
      form.reset({
        name: profile.name,
        phone: profile.phone ?? '',
        address: profile.customerProfile?.address ?? '',
      });
    }
  }, [form, profileQuery.data]);

  async function onSubmit(values: ProfileValues) {
    try {
      await ensureSession('customer');
      await updateProfileMutation.mutateAsync(values);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Customer"
        title="Customer profile"
        description="Profile edits hit the protected customer endpoint and appear in backend request telemetry."
      />
      {profileQuery.isError ? (
        <ErrorState
          error={profileQuery.error}
          onRetry={() => void profileQuery.refetch()}
        />
      ) : null}
      <Card>
        <CardContent className="p-5">
          <form className="grid max-w-2xl gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input id="profile-name" autoComplete="name" {...form.register('name')} />
              {form.formState.errors.name ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
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
              <Label htmlFor="profile-address">Address</Label>
              <Textarea
                id="profile-address"
                autoComplete="street-address"
                {...form.register('address')}
              />
              {form.formState.errors.address ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.address.message}
                </p>
              ) : null}
            </div>
            <Button
              className="w-fit"
              type="submit"
              isLoading={
                form.formState.isSubmitting ||
                updateProfileMutation.isPending ||
                isConnecting
              }
            >
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
