import type { Delivery, DeliveryStatus, Order, OrderStatus } from '@/types/domain';

const orderSteps: OrderStatus[] = [
  'PAYMENT_PENDING',
  'PAID',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'RIDER_ASSIGNED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

const deliverySteps: DeliveryStatus[] = [
  'ASSIGNED',
  'ACCEPTED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export function getOrderTotalItems(order: Order) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

export function getOrderTimeline(order: Order) {
  const currentIndex = orderSteps.indexOf(order.status);

  return orderSteps.map((status, index) => ({
    label: status,
    complete: currentIndex >= index || order.status === 'DELIVERED',
    current: order.status === status,
  }));
}

export function getDeliveryTimeline(delivery: Delivery) {
  const currentIndex = deliverySteps.indexOf(delivery.status);

  return deliverySteps.map((status, index) => ({
    label: status,
    complete: currentIndex >= index || delivery.status === 'DELIVERED',
    current: delivery.status === status,
  }));
}

export function nextDeliveryAction(delivery: Delivery) {
  switch (delivery.status) {
    case 'ASSIGNED':
      return { action: 'accept' as const, label: 'Accept delivery' };
    case 'ACCEPTED':
      return { action: 'pick-up' as const, label: 'Pick up' };
    case 'PICKED_UP':
      return { action: 'out-for-delivery' as const, label: 'Out for delivery' };
    case 'OUT_FOR_DELIVERY':
      return { action: 'deliver' as const, label: 'Mark delivered' };
    default:
      return null;
  }
}
