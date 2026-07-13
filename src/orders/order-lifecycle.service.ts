import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';
import { TracingService } from '../common/tracing/tracing.service';
import { DomainEventsService } from '../domain-events/domain-events.service';
import { MetricsService } from '../metrics/metrics.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertOrderStatusTransition } from './order-status-transitions';

type TransitionOrderOptions = {
  orderId: string;
  nextStatus: OrderStatus;
  actorRole: string;
  reason?: string;
  data?: Prisma.OrderUncheckedUpdateInput;
};

@Injectable()
export class OrderLifecycleService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly metricsService: MetricsService,
    private readonly logger: StructuredLoggerService,
    private readonly tracingService: TracingService,
    private readonly domainEventsService: DomainEventsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async transitionOrder(options: TransitionOrderOptions) {
    return this.tracingService.startActiveSpan(
      'OrderLifecycleService.transitionOrder',
      {
        'food_delivery.layer': 'service',
        'food_delivery.order.next_status': options.nextStatus,
      },
      async () => {
        const order = await this.prismaService.order.findUnique({
          where: { id: options.orderId },
          include: {
            restaurant: true,
          },
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        try {
          assertOrderStatusTransition(order.status, options.nextStatus);
        } catch (error) {
          this.metricsService.recordOrderStatusTransition(
            order.status,
            options.nextStatus,
            options.actorRole,
            'failure',
          );
          throw error;
        }

        const updatedOrder = await this.prismaService.order.update({
          where: { id: order.id },
          data: {
            ...options.data,
            status: options.nextStatus,
            cancelledAt:
              options.nextStatus === OrderStatus.CANCELLED
                ? new Date()
                : options.data?.cancelledAt,
            deliveredAt:
              options.nextStatus === OrderStatus.DELIVERED
                ? new Date()
                : options.data?.deliveredAt,
          },
          include: {
            restaurant: true,
            items: {
              include: {
                menuItem: true,
              },
            },
            payment: true,
            delivery: true,
          },
        });

        this.metricsService.recordOrderStatusTransition(
          order.status,
          options.nextStatus,
          options.actorRole,
          'success',
        );
        this.logger.info('Order status changed', {
          previousOrderStatus: order.status,
          orderStatus: options.nextStatus,
          actorRole: options.actorRole,
          reason: options.reason,
        });
        await this.domainEventsService.recordEvent(
          'order',
          updatedOrder.id,
          `order.${options.nextStatus.toLowerCase()}`,
          {
            fromStatus: order.status,
            toStatus: options.nextStatus,
            actorRole: options.actorRole,
            reason: options.reason ?? null,
          },
        );
        await this.notificationsService.enqueueUserNotification(
          updatedOrder.customerId,
          updatedOrder.id,
          `Your order at ${updatedOrder.restaurant.name} is ${options.nextStatus.toLowerCase().replaceAll('_', ' ')}.`,
        );

        return updatedOrder;
      },
    );
  }
}
