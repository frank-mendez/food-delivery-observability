import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.PAYMENT_PENDING,
    OrderStatus.CANCELLED,
    OrderStatus.EXPIRED,
  ],
  [OrderStatus.PAYMENT_PENDING]: [
    OrderStatus.PAID,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED,
    OrderStatus.EXPIRED,
  ],
  [OrderStatus.PAID]: [OrderStatus.ACCEPTED, OrderStatus.REJECTED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.RIDER_ASSIGNED],
  [OrderStatus.RIDER_ASSIGNED]: [OrderStatus.PICKED_UP],
  [OrderStatus.PICKED_UP]: [OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.PAYMENT_FAILED]: [OrderStatus.PAYMENT_PENDING],
  [OrderStatus.EXPIRED]: [],
};

export function assertOrderStatusTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
) {
  if (!ORDER_STATUS_TRANSITIONS[currentStatus].includes(nextStatus)) {
    throw new BadRequestException(
      `Cannot transition order from ${currentStatus} to ${nextStatus}`,
    );
  }
}

export function getAllowedOrderStatusTransitions(
  currentStatus: OrderStatus,
): OrderStatus[] {
  return [...ORDER_STATUS_TRANSITIONS[currentStatus]];
}
