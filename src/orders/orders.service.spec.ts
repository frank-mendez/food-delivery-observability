import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, RestaurantStatus } from '@prisma/client';
import { OrdersService } from './orders.service';

type OrderCreateArgs = {
  data: {
    status?: OrderStatus;
    totalAmount?: Prisma.Decimal;
    items?: {
      create: Array<{
        menuItemId: string;
        quantity: number;
        priceSnapshot: Prisma.Decimal;
      }>;
    };
  };
};

function createPrismaServiceMock<TTransaction>(transaction: TTransaction) {
  return {
    $transaction: jest.fn((callback: (transaction: TTransaction) => unknown) =>
      callback(transaction),
    ),
  };
}

function getFirstOrderCreateArgs(
  createMock: jest.Mock,
): OrderCreateArgs | undefined {
  const calls = createMock.mock.calls as Array<[OrderCreateArgs]>;
  return calls[0]?.[0];
}

describe('OrdersService', () => {
  const metricsService = {
    startOrderCreationTimer: jest.fn(() => jest.fn()),
    incrementOrdersCreated: jest.fn(),
    incrementFailedOrderCreation: jest.fn(),
  };
  const logger = {
    info: jest.fn(),
  };
  const tracingService = {
    startActiveSpan: jest.fn(
      (
        _name: string,
        _attributes: Record<string, unknown>,
        callback: () => unknown,
      ) => callback(),
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a pending order and calculates the total amount', async () => {
    const transaction = {
      restaurant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'restaurant-1',
          status: RestaurantStatus.OPEN,
        }),
      },
      menuItem: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'menu-item-1',
            price: new Prisma.Decimal('10.50'),
          },
          {
            id: 'menu-item-2',
            price: new Prisma.Decimal('5.25'),
          },
        ]),
      },
      order: {
        create: jest.fn().mockResolvedValue({
          id: 'order-1',
          status: OrderStatus.PENDING,
          totalAmount: new Prisma.Decimal('26.25'),
        }),
      },
    };
    const prismaService = createPrismaServiceMock(transaction);
    const service = new OrdersService(
      prismaService as never,
      metricsService as never,
      logger as never,
      tracingService as never,
    );

    await expect(
      service.create({
        restaurantId: 'restaurant-1',
        items: [
          { menuItemId: 'menu-item-1', quantity: 2 },
          { menuItemId: 'menu-item-2', quantity: 1 },
        ],
      }),
    ).resolves.toMatchObject({
      id: 'order-1',
      status: OrderStatus.PENDING,
    });

    const createOrderArgs = getFirstOrderCreateArgs(transaction.order.create);

    expect(createOrderArgs?.data.status).toBe(OrderStatus.PENDING);
    expect(createOrderArgs?.data.totalAmount?.equals('26.25')).toBe(true);
    expect(metricsService.incrementOrdersCreated).toHaveBeenCalledWith(26.25);
    expect(metricsService.incrementFailedOrderCreation).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Order created', {
      orderStatus: OrderStatus.PENDING,
      totalAmount: 26.25,
      itemCount: 2,
    });
  });

  it('combines duplicate menu item ids into item quantities', async () => {
    const transaction = {
      restaurant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'restaurant-1',
          status: RestaurantStatus.OPEN,
        }),
      },
      menuItem: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'menu-item-1',
            price: new Prisma.Decimal('3.00'),
          },
        ]),
      },
      order: {
        create: jest.fn().mockResolvedValue({
          id: 'order-1',
          status: OrderStatus.PENDING,
        }),
      },
    };
    const prismaService = createPrismaServiceMock(transaction);
    const service = new OrdersService(
      prismaService as never,
      metricsService as never,
      logger as never,
      tracingService as never,
    );

    await service.create({
      restaurantId: 'restaurant-1',
      menuItemIds: ['menu-item-1', 'menu-item-1'],
    });

    const createOrderArgs = getFirstOrderCreateArgs(transaction.order.create);

    expect(createOrderArgs?.data.items?.create).toEqual([
      {
        menuItemId: 'menu-item-1',
        quantity: 2,
        priceSnapshot: new Prisma.Decimal('3.00'),
      },
    ]);
  });

  it('tracks failed order creation when the restaurant does not exist', async () => {
    const transaction = {
      restaurant: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const prismaService = createPrismaServiceMock(transaction);
    const service = new OrdersService(
      prismaService as never,
      metricsService as never,
      logger as never,
      tracingService as never,
    );

    await expect(
      service.create({
        restaurantId: 'missing-restaurant',
        menuItemIds: ['menu-item-1'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(metricsService.incrementFailedOrderCreation).toHaveBeenCalledTimes(
      1,
    );
    expect(metricsService.incrementOrdersCreated).not.toHaveBeenCalled();
  });

  it('rejects menu items outside the restaurant or unavailable items', async () => {
    const transaction = {
      restaurant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'restaurant-1',
          status: RestaurantStatus.OPEN,
        }),
      },
      menuItem: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const prismaService = createPrismaServiceMock(transaction);
    const service = new OrdersService(
      prismaService as never,
      metricsService as never,
      logger as never,
      tracingService as never,
    );

    await expect(
      service.create({
        restaurantId: 'restaurant-1',
        menuItemIds: ['menu-item-1'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(metricsService.incrementFailedOrderCreation).toHaveBeenCalledTimes(
      1,
    );
  });
});
