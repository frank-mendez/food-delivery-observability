'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import { ridersRepository } from '@/lib/api/repositories/riders';
import { withRoleAccessToken } from '@/features/auth/lib/session-tokens';
import { useSessionStore } from '@/stores/session-store';
import type { RiderAvailability } from '@/types/domain';

export function useRiderProfile() {
  const token = useSessionStore((state) => state.sessions.rider?.accessToken);

  return useQuery({
    queryKey: [...queryKeys.rider.profile, token],
    queryFn: () =>
      withRoleAccessToken('rider', (token) => ridersRepository.profile(token)),
    enabled: Boolean(token),
  });
}

export function useRiderDeliveries() {
  const token = useSessionStore((state) => state.sessions.rider?.accessToken);

  return useQuery({
    queryKey: [...queryKeys.rider.deliveries, token],
    queryFn: () =>
      withRoleAccessToken('rider', (token) =>
        ridersRepository.deliveries(token),
      ),
    enabled: Boolean(token),
  });
}

export function useUpdateRiderAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (availability: RiderAvailability) =>
      withRoleAccessToken('rider', (token) =>
        ridersRepository.updateAvailability(token, availability),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.rider.profile });
    },
  });
}

export function useUpdateDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      deliveryId,
      action,
    }: {
      deliveryId: string;
      action: 'accept' | 'pick-up' | 'out-for-delivery' | 'deliver';
    }) =>
      withRoleAccessToken('rider', (token) =>
        ridersRepository.updateDelivery(deliveryId, action, token),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.rider.deliveries,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.rider.profile });
    },
  });
}
