'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import {
  customersRepository,
  type UpdateCustomerProfilePayload,
} from '@/lib/api/repositories/customers';
import { withRoleAccessToken } from '@/features/auth/lib/session-tokens';
import { useSessionStore } from '@/stores/session-store';

export function useCustomerProfile() {
  const token = useSessionStore(
    (state) => state.sessions.customer?.accessToken,
  );

  return useQuery({
    queryKey: [...queryKeys.customer.profile, token],
    queryFn: () =>
      withRoleAccessToken('customer', (token) =>
        customersRepository.profile(token),
      ),
    enabled: Boolean(token),
  });
}

export function useUpdateCustomerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCustomerProfilePayload) =>
      withRoleAccessToken('customer', (token) =>
        customersRepository.updateProfile(token, payload),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.customer.profile,
      });
    },
  });
}
