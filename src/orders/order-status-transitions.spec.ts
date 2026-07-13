import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import {
  assertOrderStatusTransition,
  getAllowedOrderStatusTransitions,
} from './order-status-transitions';

describe('order status transitions', () => {
  it('allows the expected happy-path lifecycle', () => {
    const path = [
      OrderStatus.PENDING,
      OrderStatus.PAYMENT_PENDING,
      OrderStatus.PAID,
      OrderStatus.ACCEPTED,
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.RIDER_ASSIGNED,
      OrderStatus.PICKED_UP,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
    ];

    for (let index = 0; index < path.length - 1; index += 1) {
      expect(() =>
        assertOrderStatusTransition(path[index], path[index + 1]),
      ).not.toThrow();
    }
  });

  it('rejects invalid lifecycle jumps', () => {
    expect(() =>
      assertOrderStatusTransition(OrderStatus.PENDING, OrderStatus.DELIVERED),
    ).toThrow(BadRequestException);
  });

  it('allows retrying failed payments', () => {
    expect(
      getAllowedOrderStatusTransitions(OrderStatus.PAYMENT_FAILED),
    ).toEqual([OrderStatus.PAYMENT_PENDING]);
  });
});
