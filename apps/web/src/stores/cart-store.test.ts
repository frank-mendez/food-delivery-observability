import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from './cart-store';
import type { MenuItem } from '@/types/domain';

const burger: MenuItem = {
  id: 'menu-1',
  restaurantId: 'restaurant-1',
  name: 'Classic Cheeseburger',
  price: '11.50',
  isAvailable: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const pasta: MenuItem = {
  ...burger,
  id: 'menu-2',
  restaurantId: 'restaurant-2',
  name: 'Spaghetti Pomodoro',
  price: '13.00',
};

describe('cart store', () => {
  beforeEach(() => {
    useCartStore.getState().clear();
  });

  it('adds quantities and calculates totals', () => {
    useCartStore.getState().addItem(burger, 'Northstar Burgers');
    useCartStore.getState().addItem(burger, 'Northstar Burgers');

    expect(useCartStore.getState().itemCount()).toBe(2);
    expect(useCartStore.getState().subtotal()).toBe(23);
  });

  it('resets when a different restaurant is added', () => {
    useCartStore.getState().addItem(burger, 'Northstar Burgers');
    useCartStore.getState().addItem(pasta, 'Pasta Sprint');

    expect(useCartStore.getState().lines).toHaveLength(1);
    expect(useCartStore.getState().lines[0].restaurantName).toBe('Pasta Sprint');
  });

  it('updates and removes quantities', () => {
    useCartStore.getState().addItem(burger, 'Northstar Burgers');
    useCartStore.getState().setQuantity(burger.id, 3);

    expect(useCartStore.getState().itemCount()).toBe(3);

    useCartStore.getState().removeItem(burger.id);

    expect(useCartStore.getState().lines).toEqual([]);
  });
});
