'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import {
  customersRepository,
  type UpdateCustomerProfilePayload,
} from '@/lib/api/repositories/customers';
import { useSessionStore } from '@/stores/session-store';

export function useCustomerProfile() {
  const token = useSessionStore(
    (state) => state.sessions.customer?.accessToken,
  );

  return useQuery({
    queryKey: [...queryKeys.customer.profile, token],
    queryFn: () => customersRepository.profile(token ?? ''),
    enabled: Boolean(token),
  });
}

export function useUpdateCustomerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCustomerProfilePayload) => {
      const token = useSessionStore.getState().sessions.customer?.accessToken;

      return customersRepository.updateProfile(token ?? '', payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.customer.profile,
      });
    },
  });
}
