import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, RestaurantStatus } from '@prisma/client';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';
import { TracingService } from '../common/tracing/tracing.service';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

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
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    return this.tracingService.startActiveSpan(
      'OrdersService.create',
      {
        'food_delivery.layer': 'service',
        'food_delivery.order.item_count':
          createOrderDto.items?.length ??
          createOrderDto.menuItemIds?.length ??
          0,
      },
      async () => this.createOrder(createOrderDto),
    );
  }

  private async createOrder(createOrderDto: CreateOrderDto) {
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
              },
              include: {
                restaurant: true,
                items: {
                  include: {
                    menuItem: true,
                  },
                },
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

      return order;
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
}
