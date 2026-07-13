'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MenuItem, MoneyValue } from '@/types/domain';
import { toNumber } from '@/lib/format';

export type CartLine = {
  menuItemId: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  price: MoneyValue;
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  addItem: (item: MenuItem, restaurantName: string) => void;
  removeItem: (menuItemId: string) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  clear: () => void;
  subtotal: () => number;
  itemCount: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      addItem: (item, restaurantName) =>
        set((state) => {
          const existingRestaurantId = state.lines[0]?.restaurantId;
          const baseLines =
            existingRestaurantId && existingRestaurantId !== item.restaurantId
              ? []
              : state.lines;
          const existingLine = baseLines.find(
            (line) => line.menuItemId === item.id,
          );

          if (existingLine) {
            return {
              lines: baseLines.map((line) =>
                line.menuItemId === item.id
                  ? { ...line, quantity: line.quantity + 1 }
                  : line,
              ),
            };
          }

          return {
            lines: [
              ...baseLines,
              {
                menuItemId: item.id,
                restaurantId: item.restaurantId,
                restaurantName,
                name: item.name,
                price: item.price,
                quantity: 1,
              },
            ],
          };
        }),
      removeItem: (menuItemId) =>
        set((state) => ({
          lines: state.lines.filter((line) => line.menuItemId !== menuItemId),
        })),
      setQuantity: (menuItemId, quantity) =>
        set((state) => ({
          lines: state.lines
            .map((line) =>
              line.menuItemId === menuItemId
                ? { ...line, quantity: Math.max(1, quantity) }
                : line,
            )
            .filter((line) => line.quantity > 0),
        })),
      clear: () => set({ lines: [] }),
      subtotal: () =>
        get().lines.reduce(
          (total, line) => total + toNumber(line.price) * line.quantity,
          0,
        ),
      itemCount: () =>
        get().lines.reduce((total, line) => total + line.quantity, 0),
    }),
    {
      name: 'food-delivery-web-cart',
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);
