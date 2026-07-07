import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { OrderStatus, RestaurantStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

type HealthResponse = {
  status: string;
  services: {
    api: { status: string };
    postgres: { status: string };
    redis: { status: string };
  };
};

type RestaurantResponse = {
  menuItems: Array<{ id: string }>;
};

type OrderResponse = {
  status: string;
  totalAmount: string;
  items: Array<{ id: string }>;
};

type IndexResponse = {
  name: string;
  phase: string;
  status: string;
  endpoints: {
    health: string;
    restaurants: string;
    orders: string;
    metrics: string;
  };
};

describe('Food Delivery API (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.TEST_DATABASE_URL ??
      'postgresql://food_delivery:food_delivery@localhost:5432/food_delivery_test?schema=public';
    process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
    process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();

    prismaService = app.get(PrismaService);
    await resetDatabase();
    await seedRestaurants();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET / returns the API index', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((response) => {
        const body = response.body as IndexResponse;

        expect(body).toMatchObject({
          name: 'food-delivery-observability',
          phase: 'Phase 1',
          status: 'ok',
          endpoints: {
            health: '/health',
            restaurants: '/restaurants',
            orders: '/orders',
            metrics: '/metrics',
          },
        });
      });
  });

  it('GET /health returns dependency status', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((response) => {
        const body = response.body as HealthResponse;

        expect(body.status).toBe('ok');
        expect(body.services.api.status).toBe('ok');
        expect(body.services.postgres.status).toBe('ok');
        expect(body.services.redis.status).toBe('ok');
      });
  });

  it('GET /restaurants returns seeded restaurants with menu items', () => {
    return request(app.getHttpServer())
      .get('/restaurants')
      .expect(200)
      .expect((response) => {
        const body = response.body as RestaurantResponse[];

        expect(body).toHaveLength(3);
        expect(body[0].menuItems.length).toBeGreaterThan(0);
      });
  });

  it('POST /orders creates a pending order', async () => {
    const restaurant = await prismaService.restaurant.findFirstOrThrow({
      include: { menuItems: true },
    });
    const menuItemIds = restaurant.menuItems.slice(0, 2).map((item) => item.id);

    await request(app.getHttpServer())
      .post('/orders')
      .send({
        restaurantId: restaurant.id,
        menuItemIds,
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as OrderResponse;

        expect(body.status).toBe(OrderStatus.PENDING);
        expect(body.items).toHaveLength(2);
        expect(Number(body.totalAmount)).toBeGreaterThan(0);
      });

    await expect(prismaService.order.count()).resolves.toBe(1);
  });

  it('POST /orders rejects unavailable restaurant menu items', async () => {
    const restaurant = await prismaService.restaurant.findFirstOrThrow();
    const otherRestaurant = await prismaService.restaurant.findFirstOrThrow({
      where: {
        id: {
          not: restaurant.id,
        },
      },
      include: { menuItems: true },
    });

    await request(app.getHttpServer())
      .post('/orders')
      .send({
        restaurantId: restaurant.id,
        menuItemIds: [otherRestaurant.menuItems[0].id],
      })
      .expect(400);
  });

  it('GET /metrics exposes Prometheus metrics', () => {
    return request(app.getHttpServer())
      .get('/metrics')
      .expect(200)
      .expect(({ text }) => {
        expect(text).toContain('food_delivery_http_requests_total');
        expect(text).toContain('food_delivery_orders_created_total');
        expect(text).toContain('food_delivery_failed_order_creation_total');
        expect(text).toContain('food_delivery_health_check_total');
      });
  });

  async function resetDatabase() {
    await prismaService.orderItem.deleteMany();
    await prismaService.order.deleteMany();
    await prismaService.menuItem.deleteMany();
    await prismaService.restaurant.deleteMany();
  }

  async function seedRestaurants() {
    const restaurants = [
      {
        name: 'Northstar Burgers Test',
        menuItems: [
          { name: 'Classic Cheeseburger', price: '11.50' },
          { name: 'Loaded Fries', price: '6.25' },
        ],
      },
      {
        name: 'Green Bowl Kitchen Test',
        menuItems: [
          { name: 'Harvest Grain Bowl', price: '12.25' },
          { name: 'Ginger Lime Smoothie', price: '5.50' },
        ],
      },
      {
        name: 'Pasta Sprint Test',
        menuItems: [
          { name: 'Spaghetti Pomodoro', price: '13.00' },
          { name: 'Garlic Focaccia', price: '4.75' },
        ],
      },
    ];

    for (const restaurant of restaurants) {
      await prismaService.restaurant.create({
        data: {
          name: restaurant.name,
          status: RestaurantStatus.OPEN,
          menuItems: {
            create: restaurant.menuItems.map((menuItem) => ({
              ...menuItem,
              isAvailable: true,
            })),
          },
        },
      });
    }
  }
});
