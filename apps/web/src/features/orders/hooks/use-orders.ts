'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import {
  ordersRepository,
  type CreateOrderPayload,
} from '@/lib/api/repositories/orders';
import { paymentsRepository } from '@/lib/api/repositories/payments';
import { withRoleAccessToken } from '@/features/auth/lib/session-tokens';
import { useSessionStore } from '@/stores/session-store';

export function useCustomerOrders() {
  const token = useSessionStore(
    (state) => state.sessions.customer?.accessToken,
  );

  return useQuery({
    queryKey: [...queryKeys.orders.mine, token],
    queryFn: () =>
      withRoleAccessToken('customer', (token) => ordersRepository.mine(token)),
    enabled: Boolean(token),
  });
}

export function useOrderDetail(orderId: string) {
  const activeRole = useSessionStore((state) => state.activeRole);
  const token = useSessionStore(
    (state) => state.sessions[state.activeRole]?.accessToken,
  );

  return useQuery({
    queryKey: [...queryKeys.orders.detail(orderId), activeRole, token],
    queryFn: () =>
      withRoleAccessToken(activeRole, (token) =>
        ordersRepository.detail(orderId, token),
      ),
    enabled: Boolean(orderId && token),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrderPayload) =>
      withRoleAccessToken('customer', (token) =>
        ordersRepository.create(token, payload),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.mine });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.customer.orders,
      });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) =>
      withRoleAccessToken('customer', (token) =>
        ordersRepository.cancel(orderId, token),
      ),
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.mine });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(order.id),
      });
    },
  });
}

export function useRetryPayment(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      withRoleAccessToken('customer', (token) =>
        paymentsRepository.retry(orderId, token, 'success'),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.mine });
    },
  });
}
