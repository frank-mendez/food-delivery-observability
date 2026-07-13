'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import { restaurantsRepository } from '@/lib/api/repositories/restaurants';

export function useRestaurants() {
  return useQuery({
    queryKey: queryKeys.restaurants.all,
    queryFn: () => restaurantsRepository.list(),
  });
}

export function useRestaurant(restaurantId: string) {
  return useQuery({
    queryKey: queryKeys.restaurants.detail(restaurantId),
    queryFn: () => restaurantsRepository.detail(restaurantId),
    enabled: Boolean(restaurantId),
  });
}

export function useRestaurantMenu(restaurantId: string) {
  return useQuery({
    queryKey: queryKeys.restaurants.menu(restaurantId),
    queryFn: () => restaurantsRepository.menu(restaurantId),
    enabled: Boolean(restaurantId),
  });
}

export function usePopularItems(restaurantId?: string) {
  return useQuery({
    queryKey: queryKeys.restaurants.popular(restaurantId),
    queryFn: () => restaurantsRepository.popularItems(restaurantId),
  });
}
