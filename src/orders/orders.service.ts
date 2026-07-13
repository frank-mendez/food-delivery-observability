import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  RestaurantStatus,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';
import { TracingService } from '../common/tracing/tracing.service';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_NAMES } from '../queues/queue-names';
import { QueuesService } from '../queues/queues.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderLifecycleService } from './order-lifecycle.service';

type NormalizedOrderItem = {
  menuItemId: string;
  quantity: number;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly metricsService: MetricsService,
    private readonly logger: StructuredLoggerService,
    private readonly tracingService: TracingService,
    private readonly queuesService: QueuesService,
    private readonly orderLifecycleService: OrderLifecycleService,
  ) {}

  async create(user: AuthenticatedUser, createOrderDto: CreateOrderDto) {
    return this.tracingService.startActiveSpan(
      'OrdersService.create',
      {
        'food_delivery.layer': 'service',
        'food_delivery.order.item_count':
          createOrderDto.items?.length ??
          createOrderDto.menuItemIds?.length ??
          0,
      },
      async () => this.createOrder(user, createOrderDto),
    );
  }

  async findMine(user: AuthenticatedUser) {
    return this.prismaService.order.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        restaurant: true,
        items: { include: { menuItem: true } },
        payment: true,
        delivery: true,
      },
    });
  }

  async findOne(orderId: string, user: AuthenticatedUser) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: true,
        items: { include: { menuItem: true } },
        payment: true,
        delivery: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.assertCanViewOrder(order, user);

    return order;
  }

  async cancel(orderId: string, user: AuthenticatedUser) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== user.id) {
      throw new ForbiddenException('Cannot cancel another customer order');
    }

    return this.orderLifecycleService.transitionOrder({
      orderId,
      nextStatus: OrderStatus.CANCELLED,
      actorRole: user.role,
      reason: 'customer_cancel',
    });
  }

  private async createOrder(
    user: AuthenticatedUser,
    createOrderDto: CreateOrderDto,
  ) {
    const endTimer = this.metricsService.startOrderCreationTimer();

    try {
      const normalizedItems = this.normalizeOrderItems(createOrderDto);

      const order = await this.tracingService.startActiveSpan(
        'Prisma.order.createTransaction',
        {
          'food_delivery.layer': 'prisma',
          'db.system.name': 'postgresql',
          'db.operation.name': 'transaction',
        },
        async () =>
          this.prismaService.$transaction(async (transaction) => {
            const restaurant = await transaction.restaurant.findUnique({
              where: { id: createOrderDto.restaurantId },
            });

            if (!restaurant) {
              throw new NotFoundException('Restaurant not found');
            }

            if (restaurant.status !== RestaurantStatus.OPEN) {
              throw new BadRequestException(
                'Restaurant is not accepting orders',
              );
            }

            const menuItems = await transaction.menuItem.findMany({
              where: {
                id: {
                  in: normalizedItems.map((item) => item.menuItemId),
                },
                restaurantId: createOrderDto.restaurantId,
                isAvailable: true,
              },
            });

            if (menuItems.length !== normalizedItems.length) {
              throw new BadRequestException(
                'One or more menu items are unavailable for this restaurant',
              );
            }

            const menuItemsById = new Map(
              menuItems.map((menuItem) => [menuItem.id, menuItem]),
            );

            const totalAmount = normalizedItems.reduce(
              (total, item) =>
                total.plus(
                  menuItemsById.get(item.menuItemId)!.price.mul(item.quantity),
                ),
              new Prisma.Decimal(0),
            );

            return transaction.order.create({
              data: {
                restaurantId: createOrderDto.restaurantId,
                customerId: user.id,
                status: OrderStatus.PENDING,
                totalAmount,
                items: {
                  create: normalizedItems.map((item) => {
                    const menuItem = menuItemsById.get(item.menuItemId)!;

                    return {
                      menuItemId: item.menuItemId,
                      quantity: item.quantity,
                      priceSnapshot: menuItem.price,
                    };
                  }),
                },
                payment: {
                  create: {
                    amount: totalAmount,
                    status: PaymentStatus.PENDING,
                  },
                },
              },
              include: {
                restaurant: true,
                items: {
                  include: {
                    menuItem: true,
                  },
                },
                payment: true,
              },
            });
          }),
      );

      this.metricsService.incrementOrdersCreated(Number(order.totalAmount));
      this.logger.info('Order created', {
        orderStatus: order.status,
        totalAmount: Number(order.totalAmount),
        itemCount: order.items?.length ?? normalizedItems.length,
      });

      const transitionedOrder =
        await this.orderLifecycleService.transitionOrder({
          orderId: order.id,
          nextStatus: OrderStatus.PAYMENT_PENDING,
          actorRole: user.role,
          reason: 'payment_required',
        });
      await this.queuesService.add(
        QUEUE_NAMES.payment,
        'payment.process',
        {
          orderId: order.id,
          scenario: createOrderDto.paymentScenario ?? 'success',
        },
        {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 1_000,
          },
        },
      );

      return transitionedOrder;
    } catch (error) {
      this.metricsService.incrementFailedOrderCreation();
      throw error;
    } finally {
      endTimer();
    }
  }

  private normalizeOrderItems(
    createOrderDto: CreateOrderDto,
  ): NormalizedOrderItem[] {
    const requestedItems =
      createOrderDto.items?.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity ?? 1,
      })) ??
      createOrderDto.menuItemIds?.map((menuItemId) => ({
        menuItemId,
        quantity: 1,
      })) ??
      [];

    if (requestedItems.length === 0) {
      throw new BadRequestException('At least one menu item is required');
    }

    const quantitiesByMenuItemId = new Map<string, number>();

    for (const item of requestedItems) {
      if (item.quantity < 1) {
        throw new BadRequestException('Item quantity must be at least 1');
      }

      quantitiesByMenuItemId.set(
        item.menuItemId,
        (quantitiesByMenuItemId.get(item.menuItemId) ?? 0) + item.quantity,
      );
    }

    return Array.from(quantitiesByMenuItemId.entries()).map(
      ([menuItemId, quantity]) => ({
        menuItemId,
        quantity,
      }),
    );
  }

  private async assertCanViewOrder(
    order: {
      customerId: string | null;
      restaurantId: string;
      riderId: string | null;
    },
    user: AuthenticatedUser,
  ) {
    if (user.role === UserRole.ADMINISTRATOR || order.customerId === user.id) {
      return;
    }

    if (user.role === UserRole.RESTAURANT_OWNER) {
      const restaurant = await this.prismaService.restaurant.findUnique({
        where: { id: order.restaurantId },
        select: { ownerId: true },
      });

      if (restaurant?.ownerId === user.id) {
        return;
      }
    }

    if (user.role === UserRole.RIDER) {
      const riderProfile = await this.prismaService.riderProfile.findUnique({
        where: { userId: user.id },
      });

      if (riderProfile && order.riderId === riderProfile.id) {
        return;
      }
    }

    throw new ForbiddenException('Cannot view this order');
  }
}
