import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFilterStore } from '@/stores/filter-store';
import { RestaurantsScreen } from '../components/restaurants-screen';

const refetch = vi.fn();

vi.mock('../hooks/use-restaurants', () => ({
  useRestaurants: () => ({
    data: [
      {
        id: 'restaurant-1',
        name: 'Northstar Burgers',
        status: 'OPEN',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        menuItems: [],
      },
      {
        id: 'restaurant-2',
        name: 'Pasta Sprint',
        status: 'CLOSED',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        menuItems: [],
      },
    ],
    isPending: false,
    isError: false,
    refetch,
  }),
}));

describe('RestaurantsScreen', () => {
  beforeEach(() => {
    useFilterStore.getState().clearRestaurantFilters();
  });

  it('filters the restaurant listing by search text', async () => {
    render(<RestaurantsScreen />);

    expect(screen.getByText('Northstar Burgers')).toBeInTheDocument();
    expect(screen.getByText('Pasta Sprint')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/search restaurants/i), 'pasta');

    expect(screen.queryByText('Northstar Burgers')).not.toBeInTheDocument();
    expect(screen.getByText('Pasta Sprint')).toBeInTheDocument();
  });
});
