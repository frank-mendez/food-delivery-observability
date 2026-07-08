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
    const service = new RestaurantsService(
      {
        restaurant: { findMany },
      } as never,
      tracingService as never,
    );

    await expect(service.findAll()).resolves.toEqual([]);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      include: {
        menuItems: {
          orderBy: { name: 'asc' },
        },
      },
    });
  });
});
