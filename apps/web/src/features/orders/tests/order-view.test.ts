import { describe, expect, it } from 'vitest';
import {
  canCustomerCancelOrder,
  getCurrentDelivery,
  getDeliveryHistoryItems,
  getDeliveryTimeline,
  getOrderTimeline,
  getOrderTotalItems,
  nextDeliveryAction,
  shouldShowLinkedOrderStatus,
} from '../lib/order-view';
import type { Delivery, Order } from '@/types/domain';

const order = {
  id: 'order-1',
  restaurantId: 'restaurant-1',
  status: 'PREPARING',
  totalAmount: '25.00',
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
      quantity: 2,
      priceSnapshot: '10.00',
      menuItem: {
        id: 'menu-1',
        restaurantId: 'restaurant-1',
        name: 'Burger',
        price: '10.00',
        isAvailable: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    },
  ],
} satisfies Order;

const delivery = {
  id: 'delivery-1',
  orderId: 'order-1',
  status: 'PICKED_UP',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} satisfies Delivery;

describe('order view helpers', () => {
  it('summarizes item quantities', () => {
    expect(getOrderTotalItems(order)).toBe(2);
  });

  it('marks the current order timeline step', () => {
    const timeline = getOrderTimeline(order);

    expect(timeline.find((item) => item.current)?.label).toBe('PREPARING');
  });

  it('only allows customer cancellation before payment completes', () => {
    expect(
      canCustomerCancelOrder({ ...order, status: 'PAYMENT_PENDING' }),
    ).toBe(true);
    expect(canCustomerCancelOrder({ ...order, status: 'PAID' })).toBe(false);
    expect(canCustomerCancelOrder({ ...order, status: 'REJECTED' })).toBe(false);
  });

  it('shows rejected orders as a terminal timeline branch', () => {
    const timeline = getOrderTimeline({ ...order, status: 'REJECTED' });

    expect(timeline.map((item) => item.label)).toEqual([
      'PAYMENT_PENDING',
      'PAID',
      'REJECTED',
    ]);
    expect(timeline.find((item) => item.current)?.label).toBe('REJECTED');
  });

  it('returns the next delivery action', () => {
    expect(nextDeliveryAction(delivery)).toEqual({
      action: 'out-for-delivery',
      label: 'Out for delivery',
    });
    expect(getDeliveryTimeline(delivery).find((item) => item.current)?.label).toBe(
      'PICKED_UP',
    );
  });

  it('separates current delivery from completed history', () => {
    const delivered = {
      ...delivery,
      id: 'delivery-2',
      status: 'DELIVERED',
      updatedAt: '2026-01-01T00:02:00.000Z',
      deliveredAt: '2026-01-01T00:02:00.000Z',
    } satisfies Delivery;
    const laterDelivered = {
      ...delivery,
      id: 'delivery-3',
      status: 'DELIVERED',
      updatedAt: '2026-01-01T00:03:00.000Z',
      deliveredAt: '2026-01-01T00:03:00.000Z',
    } satisfies Delivery;

    expect(getCurrentDelivery([delivered, delivery])).toEqual(delivery);
    expect(
      getDeliveryHistoryItems([delivered, delivery, laterDelivered]).map(
        (item) => item.id,
      ),
    ).toEqual(['delivery-3', 'delivery-2']);
  });

  it('hides duplicate linked order status badges', () => {
    expect(
      shouldShowLinkedOrderStatus({
        ...delivery,
        status: 'DELIVERED',
        order: { ...order, status: 'DELIVERED' },
      }),
    ).toBe(false);
    expect(
      shouldShowLinkedOrderStatus({
        ...delivery,
        status: 'ASSIGNED',
        order: { ...order, status: 'RIDER_ASSIGNED' },
      }),
    ).toBe(true);
  });

  it('handles each delivery action branch', () => {
    expect(nextDeliveryAction({ ...delivery, status: 'ASSIGNED' })).toEqual({
      action: 'accept',
      label: 'Accept delivery',
    });
    expect(nextDeliveryAction({ ...delivery, status: 'ACCEPTED' })).toEqual({
      action: 'pick-up',
      label: 'Pick up',
    });
    expect(nextDeliveryAction({ ...delivery, status: 'OUT_FOR_DELIVERY' })).toEqual({
      action: 'deliver',
      label: 'Mark delivered',
    });
    expect(nextDeliveryAction({ ...delivery, status: 'DELIVERED' })).toBeNull();
  });
});
