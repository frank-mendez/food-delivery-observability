import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  OrderStatus,
  Prisma,
  RestaurantStatus,
  UserRole,
} from '@prisma/client';
import { OrdersService } from './orders.service';

type OrderCreateArgs = {
  data: {
    status?: OrderStatus;
    customerId?: string;
    totalAmount?: Prisma.Decimal;
    payment?: {
      create: {
        amount: Prisma.Decimal;
      };
    };
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
  const customerUser = {
    id: 'customer-1',
    email: 'customer@example.com',
    name: 'Demo Customer',
    role: UserRole.CUSTOMER,
  };
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
  const queuesService = {
    add: jest.fn(),
  };
  const orderLifecycleService = {
    transitionOrder: jest.fn(
      ({ orderId, nextStatus }: { orderId: string; nextStatus: OrderStatus }) =>
        Promise.resolve({
          id: orderId,
          status: nextStatus,
        }),
    ),
  };

  function createService(prismaService: unknown) {
    return new OrdersService(
      prismaService as never,
      metricsService as never,
      logger as never,
      tracingService as never,
      queuesService as never,
      orderLifecycleService as never,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a payment-pending order and calculates the total amount', async () => {
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
    const service = createService(prismaService);

    await expect(
      service.create(customerUser, {
        restaurantId: 'restaurant-1',
        items: [
          { menuItemId: 'menu-item-1', quantity: 2 },
          { menuItemId: 'menu-item-2', quantity: 1 },
        ],
      }),
    ).resolves.toMatchObject({
      id: 'order-1',
      status: OrderStatus.PAYMENT_PENDING,
    });

    const createOrderArgs = getFirstOrderCreateArgs(transaction.order.create);

    expect(createOrderArgs?.data.status).toBe(OrderStatus.PENDING);
    expect(createOrderArgs?.data.customerId).toBe('customer-1');
    expect(createOrderArgs?.data.totalAmount?.equals('26.25')).toBe(true);
    expect(createOrderArgs?.data.payment?.create.amount.equals('26.25')).toBe(
      true,
    );
    expect(metricsService.incrementOrdersCreated).toHaveBeenCalledWith(26.25);
    expect(metricsService.incrementFailedOrderCreation).not.toHaveBeenCalled();
    expect(orderLifecycleService.transitionOrder).toHaveBeenCalledWith({
      orderId: 'order-1',
      nextStatus: OrderStatus.PAYMENT_PENDING,
      actorRole: UserRole.CUSTOMER,
      reason: 'payment_required',
    });
    expect(queuesService.add).toHaveBeenCalledWith(
      'payment',
      'payment.process',
      {
        orderId: 'order-1',
        scenario: 'success',
      },
      expect.objectContaining({ attempts: 2 }),
    );
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
    const service = createService(prismaService);

    await service.create(customerUser, {
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
    const service = createService(prismaService);

    await expect(
      service.create(customerUser, {
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
    const service = createService(prismaService);

    await expect(
      service.create(customerUser, {
        restaurantId: 'restaurant-1',
        menuItemIds: ['menu-item-1'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(metricsService.incrementFailedOrderCreation).toHaveBeenCalledTimes(
      1,
    );
  });
});
