'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import {
  restaurantsRepository,
  type CreateMenuItemPayload,
  type UpdateMenuItemPayload,
} from '@/lib/api/repositories/restaurants';
import { useSessionStore } from '@/stores/session-store';
import { useRestaurants } from '@/features/restaurants/hooks/use-restaurants';
import type { RestaurantStatus } from '@/types/domain';

export function useOwnerRestaurants() {
  const restaurantsQuery = useRestaurants();
  const ownerId = useSessionStore(
    (state) => state.sessions.restaurant?.user.id,
  );

  const restaurants = useMemo(
    () =>
      (restaurantsQuery.data ?? []).filter(
        (restaurant) => !ownerId || restaurant.ownerId === ownerId,
      ),
    [ownerId, restaurantsQuery.data],
  );

  return { ...restaurantsQuery, data: restaurants };
}

export function useSelectedOwnerRestaurant() {
  const restaurantsQuery = useOwnerRestaurants();

  return {
    ...restaurantsQuery,
    restaurant: restaurantsQuery.data?.[0],
  };
}

export function useRestaurantOrders(restaurantId?: string) {
  const token = useSessionStore(
    (state) => state.sessions.restaurant?.accessToken,
  );

  return useQuery({
    queryKey: restaurantId
      ? [...queryKeys.restaurants.orders(restaurantId), token]
      : ['restaurants', 'orders', 'missing'],
    queryFn: () => restaurantsRepository.orders(restaurantId ?? '', token ?? ''),
    enabled: Boolean(restaurantId && token),
  });
}

export function useUpdateRestaurantStatus(restaurantId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: RestaurantStatus) => {
      const token =
        useSessionStore.getState().sessions.restaurant?.accessToken;

      return restaurantsRepository.updateStatus(
        restaurantId ?? '',
        token ?? '',
        status,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.restaurants.all,
      });
    },
  });
}

export function useTransitionRestaurantOrder(restaurantId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      action,
    }: {
      orderId: string;
      action: 'accept' | 'reject' | 'preparing' | 'ready';
    }) => {
      const token =
        useSessionStore.getState().sessions.restaurant?.accessToken;

      return restaurantsRepository.transitionOrder(
        restaurantId ?? '',
        orderId,
        action,
        token ?? '',
      );
    },
    onSuccess: async () => {
      if (restaurantId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.restaurants.orders(restaurantId),
        });
      }
    },
  });
}

export function useCreateMenuItem(restaurantId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMenuItemPayload) => {
      const token =
        useSessionStore.getState().sessions.restaurant?.accessToken;

      return restaurantsRepository.createMenuItem(
        restaurantId ?? '',
        token ?? '',
        payload,
      );
    },
    onSuccess: async () => {
      if (restaurantId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.restaurants.menu(restaurantId),
        });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.restaurants.all });
    },
  });
}

export function useUpdateMenuItem(restaurantId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      menuItemId,
      payload,
    }: {
      menuItemId: string;
      payload: UpdateMenuItemPayload;
    }) => {
      const token =
        useSessionStore.getState().sessions.restaurant?.accessToken;

      return restaurantsRepository.updateMenuItem(
        restaurantId ?? '',
        menuItemId,
        token ?? '',
        payload,
      );
    },
    onSuccess: async () => {
      if (restaurantId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.restaurants.menu(restaurantId),
        });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.restaurants.all });
    },
  });
}
