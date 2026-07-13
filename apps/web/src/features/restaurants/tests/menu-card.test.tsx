import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MenuCard } from '../components/menu-card';
import type { MenuItem } from '@/types/domain';

const item: MenuItem = {
  id: 'menu-1',
  restaurantId: 'restaurant-1',
  name: 'Classic Cheeseburger',
  price: '11.50',
  isAvailable: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('MenuCard', () => {
  it('adds available menu items', async () => {
    const onAdd = vi.fn();

    render(<MenuCard item={item} onAdd={onAdd} />);
    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    expect(onAdd).toHaveBeenCalledWith(item);
  });

  it('disables unavailable menu items', () => {
    render(<MenuCard item={{ ...item, isAvailable: false }} onAdd={vi.fn()} />);

    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
  });

  it('can render without an add action', () => {
    render(<MenuCard item={item} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
