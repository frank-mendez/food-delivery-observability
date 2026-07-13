import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrderCard } from '../components/order-card';
import type { Order } from '@/types/domain';

const baseOrder: Order = {
  id: 'order-1',
  restaurantId: 'restaurant-1',
  status: 'PAID',
  totalAmount: '18.50',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  restaurant: {
    id: 'restaurant-1',
    name: 'Northstar Burgers',
    status: 'OPEN',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  items: [
    {
      id: 'item-1',
      orderId: 'order-1',
      menuItemId: 'menu-1',
      quantity: 1,
      priceSnapshot: '18.50',
      menuItem: {
        id: 'menu-1',
        restaurantId: 'restaurant-1',
        name: 'Classic Cheeseburger',
        price: '18.50',
        isAvailable: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    },
  ],
};

describe('OrderCard', () => {
  it('renders order summary and tracking link', () => {
    render(<OrderCard order={baseOrder} />);

    expect(screen.getByText('Northstar Burgers')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /track/i })).toHaveAttribute(
      'href',
      '/orders/order-1',
    );
  });

  it('renders payment status when present', () => {
    render(
      <OrderCard
        order={{
          ...baseOrder,
          payment: {
            id: 'payment-1',
            orderId: 'order-1',
            status: 'SUCCEEDED',
            amount: '18.50',
            attemptCount: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        }}
      />,
    );

    expect(screen.getByText('Succeeded')).toBeInTheDocument();
  });
});
