import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, RestaurantStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { CacheService } from '../cache/cache.service';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';
import { TracingService } from '../common/tracing/tracing.service';
import { DomainEventsService } from '../domain-events/domain-events.service';
import { OrderLifecycleService } from '../orders/order-lifecycle.service';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_NAMES } from '../queues/queue-names';
import { QueuesService } from '../queues/queues.service';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu-item.dto';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { UpdateRestaurantStatusDto } from './dto/update-restaurant-status.dto';

const RESTAURANT_LIST_CACHE = 'restaurant_list';
const RESTAURANT_DETAIL_CACHE = 'restaurant_detail';
const RESTAURANT_MENU_CACHE = 'restaurant_menu';
const POPULAR_ITEMS_CACHE = 'popular_items';
const CACHE_TTL_SECONDS = 60;

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tracingService: TracingService,
    private readonly cacheService: CacheService,
    private readonly logger: StructuredLoggerService,
    private readonly domainEventsService: DomainEventsService,
    private readonly orderLifecycleService: OrderLifecycleService,
    private readonly queuesService: QueuesService,
  ) {}

  findAll() {
    return this.tracingService.startActiveSpan(
      'RestaurantsService.findAll',
      {
        'food_delivery.layer': 'service',
      },
      async () => {
        const cacheKey = 'restaurants:list';
        const cachedRestaurants = await this.cacheService.getJson(
          RESTAURANT_LIST_CACHE,
          cacheKey,
        );

        if (cachedRestaurants) {
          return cachedRestaurants;
        }

        const restaurants = await this.tracingService.startActiveSpan(
          'Prisma.restaurant.findMany',
          {
            'food_delivery.layer': 'prisma',
            'db.system.name': 'postgresql',
            'db.operation.name': 'findMany',
          },
          async () =>
            this.prismaService.restaurant.findMany({
              orderBy: {
                name: 'asc',
              },
              include: {
                menuItems: {
                  where: { isAvailable: true },
                  orderBy: {
                    name: 'asc',
                  },
                },
              },
            }),
        );

        await this.cacheService.setJson(
          RESTAURANT_LIST_CACHE,
          cacheKey,
          restaurants,
          CACHE_TTL_SECONDS,
        );

        return restaurants;
      },
    );
  }

  async findOne(restaurantId: string) {
    const cacheKey = `restaurants:${restaurantId}`;
    const cachedRestaurant = await this.cacheService.getJson(
      RESTAURANT_DETAIL_CACHE,
      cacheKey,
    );

    if (cachedRestaurant) {
      return cachedRestaurant;
    }

    const restaurant = await this.prismaService.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        menuItems: {
          where: { isAvailable: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    await this.cacheService.setJson(
      RESTAURANT_DETAIL_CACHE,
      cacheKey,
      restaurant,
      CACHE_TTL_SECONDS,
    );

    return restaurant;
  }

  async findMenu(restaurantId: string) {
    const cacheKey = `restaurants:${restaurantId}:menu`;
    const cachedMenu = await this.cacheService.getJson(
      RESTAURANT_MENU_CACHE,
      cacheKey,
    );

    if (cachedMenu) {
      return cachedMenu;
    }

    await this.ensureRestaurantExists(restaurantId);
    const menu = await this.prismaService.menuItem.findMany({
      where: {
        restaurantId,
        isAvailable: true,
      },
      orderBy: { name: 'asc' },
    });

    await this.cacheService.setJson(
      RESTAURANT_MENU_CACHE,
      cacheKey,
      menu,
      CACHE_TTL_SECONDS,
    );

    return menu;
  }

  async findPopularItems(restaurantId?: string) {
    const cacheKey = restaurantId
      ? `restaurants:${restaurantId}:popular-items`
      : 'restaurants:popular-items';
    const cachedPopularItems = await this.cacheService.getJson(
      POPULAR_ITEMS_CACHE,
      cacheKey,
    );

    if (cachedPopularItems) {
      return cachedPopularItems;
    }

    const orderItems = await this.prismaService.orderItem.findMany({
      where: restaurantId
        ? {
            menuItem: {
              restaurantId,
            },
          }
        : undefined,
      include: {
        menuItem: true,
      },
    });
    const totalsByMenuItemId = new Map<
      string,
      { menuItem: (typeof orderItems)[number]['menuItem']; quantity: number }
    >();

    for (const orderItem of orderItems) {
      const current = totalsByMenuItemId.get(orderItem.menuItemId);

      totalsByMenuItemId.set(orderItem.menuItemId, {
        menuItem: orderItem.menuItem,
        quantity: (current?.quantity ?? 0) + orderItem.quantity,
      });
    }

    const popularItems = Array.from(totalsByMenuItemId.values())
      .sort((left, right) => right.quantity - left.quantity)
      .slice(0, 10);

    await this.cacheService.setJson(
      POPULAR_ITEMS_CACHE,
      cacheKey,
      popularItems,
      CACHE_TTL_SECONDS,
    );

    return popularItems;
  }

  async findOrders(user: AuthenticatedUser, restaurantId: string) {
    await this.assertCanManageRestaurant(user, restaurantId);

    return this.prismaService.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
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
  }

  async createRestaurant(
    user: AuthenticatedUser,
    createDto: CreateRestaurantDto,
  ) {
    const restaurant = await this.prismaService.restaurant.create({
      data: {
        name: createDto.name,
        status: createDto.status ?? RestaurantStatus.OPEN,
        ownerId:
          user.role === UserRole.RESTAURANT_OWNER ||
          user.role === UserRole.ADMINISTRATOR
            ? user.id
            : undefined,
      },
    });

    await this.invalidateRestaurantCaches(restaurant.id);
    await this.domainEventsService.recordEvent(
      'restaurant',
      restaurant.id,
      'restaurant.created',
      { status: restaurant.status },
    );
    this.logger.info('Restaurant created', {
      restaurantStatus: restaurant.status,
      actorRole: user.role,
    });

    return restaurant;
  }

  async updateRestaurant(
    user: AuthenticatedUser,
    restaurantId: string,
    updateDto: UpdateRestaurantDto,
  ) {
    await this.assertCanManageRestaurant(user, restaurantId);

    const restaurant = await this.prismaService.restaurant.update({
      where: { id: restaurantId },
      data: {
        name: updateDto.name,
      },
    });

    await this.invalidateRestaurantCaches(restaurantId);
    await this.domainEventsService.recordEvent(
      'restaurant',
      restaurant.id,
      'restaurant.updated',
      {},
    );

    return restaurant;
  }

  async updateRestaurantStatus(
    user: AuthenticatedUser,
    restaurantId: string,
    updateDto: UpdateRestaurantStatusDto,
  ) {
    await this.assertCanManageRestaurant(user, restaurantId);

    const restaurant = await this.prismaService.restaurant.update({
      where: { id: restaurantId },
      data: {
        status: updateDto.status,
      },
    });

    await this.invalidateRestaurantCaches(restaurantId);
    await this.domainEventsService.recordEvent(
      'restaurant',
      restaurant.id,
      `restaurant.${updateDto.status.toLowerCase()}`,
      { status: updateDto.status },
    );
    this.logger.info('Restaurant status updated', {
      restaurantStatus: restaurant.status,
      actorRole: user.role,
    });

    return restaurant;
  }

  async createMenuItem(
    user: AuthenticatedUser,
    restaurantId: string,
    createDto: CreateMenuItemDto,
  ) {
    await this.assertCanManageRestaurant(user, restaurantId);

    const menuItem = await this.prismaService.menuItem.create({
      data: {
        restaurantId,
        name: createDto.name,
        price: createDto.price,
        isAvailable: createDto.isAvailable ?? true,
      },
    });

    await this.invalidateRestaurantCaches(restaurantId);
    await this.domainEventsService.recordEvent(
      'menu_item',
      menuItem.id,
      'menu_item.created',
      { restaurantId },
    );

    return menuItem;
  }

  async updateMenuItem(
    user: AuthenticatedUser,
    restaurantId: string,
    menuItemId: string,
    updateDto: UpdateMenuItemDto,
  ) {
    await this.assertCanManageRestaurant(user, restaurantId);
    await this.assertMenuItemBelongsToRestaurant(menuItemId, restaurantId);

    const menuItem = await this.prismaService.menuItem.update({
      where: { id: menuItemId },
      data: {
        name: updateDto.name,
        price: updateDto.price,
        isAvailable: updateDto.isAvailable,
      },
    });

    await this.invalidateRestaurantCaches(restaurantId);
    await this.domainEventsService.recordEvent(
      'menu_item',
      menuItem.id,
      'menu_item.updated',
      { restaurantId },
    );

    return menuItem;
  }

  async removeMenuItem(
    user: AuthenticatedUser,
    restaurantId: string,
    menuItemId: string,
  ) {
    await this.assertCanManageRestaurant(user, restaurantId);
    await this.assertMenuItemBelongsToRestaurant(menuItemId, restaurantId);

    const menuItem = await this.prismaService.menuItem.update({
      where: { id: menuItemId },
      data: { isAvailable: false },
    });

    await this.invalidateRestaurantCaches(restaurantId);
    await this.domainEventsService.recordEvent(
      'menu_item',
      menuItem.id,
      'menu_item.disabled',
      { restaurantId },
    );

    return menuItem;
  }

  async acceptOrder(
    user: AuthenticatedUser,
    restaurantId: string,
    orderId: string,
  ) {
    await this.assertOrderBelongsToManagedRestaurant(
      user,
      restaurantId,
      orderId,
    );

    return this.orderLifecycleService.transitionOrder({
      orderId,
      nextStatus: OrderStatus.ACCEPTED,
      actorRole: user.role,
      reason: 'restaurant_accept',
    });
  }

  async rejectOrder(
    user: AuthenticatedUser,
    restaurantId: string,
    orderId: string,
  ) {
    await this.assertOrderBelongsToManagedRestaurant(
      user,
      restaurantId,
      orderId,
    );

    return this.orderLifecycleService.transitionOrder({
      orderId,
      nextStatus: OrderStatus.REJECTED,
      actorRole: user.role,
      reason: 'restaurant_reject',
    });
  }

  async markPreparing(
    user: AuthenticatedUser,
    restaurantId: string,
    orderId: string,
  ) {
    await this.assertOrderBelongsToManagedRestaurant(
      user,
      restaurantId,
      orderId,
    );

    return this.orderLifecycleService.transitionOrder({
      orderId,
      nextStatus: OrderStatus.PREPARING,
      actorRole: user.role,
      reason: 'restaurant_preparing',
    });
  }

  async markReady(
    user: AuthenticatedUser,
    restaurantId: string,
    orderId: string,
  ) {
    await this.assertOrderBelongsToManagedRestaurant(
      user,
      restaurantId,
      orderId,
    );

    const order = await this.orderLifecycleService.transitionOrder({
      orderId,
      nextStatus: OrderStatus.READY,
      actorRole: user.role,
      reason: 'restaurant_ready',
    });

    await this.queuesService.add(
      QUEUE_NAMES.delivery,
      'delivery.assign',
      {
        orderId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2_000,
        },
      },
    );

    return order;
  }

  private async assertCanManageRestaurant(
    user: AuthenticatedUser,
    restaurantId: string,
  ) {
    const restaurant = await this.prismaService.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (
      user.role === UserRole.ADMINISTRATOR ||
      restaurant.ownerId === user.id
    ) {
      return restaurant;
    }

    throw new ForbiddenException('Cannot manage this restaurant');
  }

  private async assertOrderBelongsToManagedRestaurant(
    user: AuthenticatedUser,
    restaurantId: string,
    orderId: string,
  ) {
    await this.assertCanManageRestaurant(user, restaurantId);

    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.restaurantId !== restaurantId) {
      throw new NotFoundException('Order not found for this restaurant');
    }
  }

  private async assertMenuItemBelongsToRestaurant(
    menuItemId: string,
    restaurantId: string,
  ) {
    const menuItem = await this.prismaService.menuItem.findUnique({
      where: { id: menuItemId },
    });

    if (!menuItem || menuItem.restaurantId !== restaurantId) {
      throw new NotFoundException('Menu item not found for this restaurant');
    }
  }

  private async ensureRestaurantExists(restaurantId: string) {
    const restaurant = await this.prismaService.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
  }

  private async invalidateRestaurantCaches(restaurantId?: string) {
    await this.cacheService.delete(RESTAURANT_LIST_CACHE, 'restaurants:list');
    await this.cacheService.deleteByPattern(
      POPULAR_ITEMS_CACHE,
      'restaurants:*:popular-items',
    );
    await this.cacheService.delete(
      POPULAR_ITEMS_CACHE,
      'restaurants:popular-items',
    );

    if (restaurantId) {
      await this.cacheService.delete(
        RESTAURANT_DETAIL_CACHE,
        `restaurants:${restaurantId}`,
      );
      await this.cacheService.delete(
        RESTAURANT_MENU_CACHE,
        `restaurants:${restaurantId}:menu`,
      );
    }
  }
}
