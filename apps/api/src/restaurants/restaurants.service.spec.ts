import { RestaurantsService } from './restaurants.service';

describe('RestaurantsService', () => {
  it('returns restaurants with menu items ordered by name', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const tracingService = {
      startActiveSpan: jest.fn(
        (
          _name: string,
          _attributes: Record<string, unknown>,
          callback: () => unknown,
        ) => callback(),
      ),
    };
    const cacheService = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn(),
    };
    const service = new RestaurantsService(
      {
        restaurant: { findMany },
      } as never,
      tracingService as never,
      cacheService as never,
      { info: jest.fn() } as never,
      { recordEvent: jest.fn() } as never,
      { transitionOrder: jest.fn() } as never,
      { add: jest.fn() } as never,
    );

    await expect(service.findAll()).resolves.toEqual([]);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      include: {
        menuItems: {
          where: { isAvailable: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    expect(cacheService.setJson).toHaveBeenCalledWith(
      'restaurant_list',
      'restaurants:list',
      [],
      60,
    );
  });

  it('returns orders for a restaurant the owner can manage', async () => {
    const restaurant = { id: 'restaurant-1', ownerId: 'owner-1' };
    const findUnique = jest.fn().mockResolvedValue(restaurant);
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new RestaurantsService(
      {
        restaurant: { findUnique },
        order: { findMany },
      } as never,
      { startActiveSpan: jest.fn() } as never,
      { getJson: jest.fn(), setJson: jest.fn(), delete: jest.fn() } as never,
      { info: jest.fn() } as never,
      { recordEvent: jest.fn() } as never,
      { transitionOrder: jest.fn() } as never,
      { add: jest.fn() } as never,
    );

    await expect(
      service.findOrders(
        {
          id: 'owner-1',
          email: 'owner@example.com',
          name: 'Owner',
          role: 'RESTAURANT_OWNER',
        },
        'restaurant-1',
      ),
    ).resolves.toEqual([]);

    expect(findMany).toHaveBeenCalledWith({
      where: { restaurantId: 'restaurant-1' },
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
  });
});
