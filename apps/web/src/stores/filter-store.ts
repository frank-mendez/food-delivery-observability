'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RestaurantStatus } from '@/types/domain';

type RestaurantFilters = {
  search: string;
  status: RestaurantStatus | 'ALL';
};

type FilterState = {
  restaurants: RestaurantFilters;
  setRestaurantSearch: (search: string) => void;
  setRestaurantStatus: (status: RestaurantFilters['status']) => void;
  clearRestaurantFilters: () => void;
};

const defaultRestaurantFilters: RestaurantFilters = {
  search: '',
  status: 'ALL',
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      restaurants: defaultRestaurantFilters,
      setRestaurantSearch: (search) =>
        set((state) => ({
          restaurants: { ...state.restaurants, search },
        })),
      setRestaurantStatus: (status) =>
        set((state) => ({
          restaurants: { ...state.restaurants, status },
        })),
      clearRestaurantFilters: () =>
        set({ restaurants: defaultRestaurantFilters }),
    }),
    {
      name: 'food-delivery-web-filters',
    },
  ),
);
