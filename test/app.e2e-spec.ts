import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  OrderStatus,
  RestaurantStatus,
  RiderAvailability,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
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
    auth: string;
    metrics: string;
  };
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    role: string;
  };
};

describe('Food Delivery API (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;
  let stdoutWrite: jest.SpiedFunction<typeof process.stdout.write>;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.TEST_DATABASE_URL ??
      'postgresql://food_delivery:food_delivery@localhost:5432/food_delivery_test?schema=public';
    process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
    process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
    process.env.LOG_LEVEL = 'info';
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        transform: true,
        validationError: {
          target: false,
          value: false,
        },
        whitelist: true,
      }),
    );
    await app.init();

    prismaService = app.get(PrismaService);
    await resetDatabase();
    await seedUsers();
    await seedRestaurants();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    stdoutWrite.mockRestore();
  });

  it('GET / returns the API index', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((response) => {
        const body = response.body as IndexResponse;

        expect(body).toMatchObject({
          name: 'food-delivery-observability',
          phase: 'Phase 3',
          status: 'ok',
          endpoints: {
            auth: '/auth',
            customers: '/customers/me',
            health: '/health',
            notifications: '/notifications',
            payments: '/payments/:orderId',
            restaurants: '/restaurants',
            orders: '/orders',
            riders: '/riders',
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

  it('generates request ids and structured request logs', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('user-agent', 'supertest')
      .expect(200);
    const requestId = response.headers['x-request-id'];
    const records = getStructuredLogRecords();
    const completedLog = records.find(
      (record) =>
        record.message === 'API request completed' &&
        record.requestId === requestId,
    );

    expect(requestId).toBeDefined();
    expect(completedLog).toMatchObject({
      message: 'API request completed',
      requestId,
      endpoint: '/health',
      method: 'GET',
      status: 200,
      userAgent: 'supertest',
    });
    expect(completedLog?.traceId).toEqual(
      expect.stringMatching(/^[a-f0-9]{32}$/),
    );
    expect(completedLog?.spanId).toEqual(
      expect.stringMatching(/^[a-f0-9]{16}$/),
    );
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

  it('POST /auth/login returns JWT tokens for seeded customers', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'customer.e2e@example.com',
        password: 'Password123!',
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as AuthResponse;

        expect(body.accessToken).toEqual(expect.any(String));
        expect(body.refreshToken).toEqual(expect.any(String));
        expect(body.user.role).toBe(UserRole.CUSTOMER);
      });
  });

  it('POST /orders creates a payment-pending order for a customer', async () => {
    const restaurant = await prismaService.restaurant.findFirstOrThrow({
      include: { menuItems: true },
    });
    const menuItemIds = restaurant.menuItems.slice(0, 2).map((item) => item.id);
    const accessToken = await loginCustomer();

    await request(app.getHttpServer())
      .post('/orders')
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        restaurantId: restaurant.id,
        menuItemIds,
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as OrderResponse;

        expect(body.status).toBe(OrderStatus.PAYMENT_PENDING);
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
    const accessToken = await loginCustomer();

    await request(app.getHttpServer())
      .post('/orders')
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        restaurantId: restaurant.id,
        menuItemIds: [otherRestaurant.menuItems[0].id],
      })
      .expect(400);
  });

  it('POST /orders logs validation failures', async () => {
    const accessToken = await loginCustomer();

    await request(app.getHttpServer())
      .post('/orders')
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        restaurantId: 'not-a-uuid',
        menuItemIds: [],
      })
      .expect(400);

    expect(getStructuredLogRecords()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Validation failure',
          endpoint: '/orders',
          method: 'POST',
          status: 400,
        }),
      ]),
    );
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
    await prismaService.notification.deleteMany();
    await prismaService.delivery.deleteMany();
    await prismaService.payment.deleteMany();
    await prismaService.orderItem.deleteMany();
    await prismaService.order.deleteMany();
    await prismaService.menuItem.deleteMany();
    await prismaService.restaurant.deleteMany();
    await prismaService.refreshToken.deleteMany();
    await prismaService.customerProfile.deleteMany();
    await prismaService.riderProfile.deleteMany();
    await prismaService.user.deleteMany();
    await prismaService.domainEvent.deleteMany();
  }

  async function seedUsers() {
    const passwordHash = await bcrypt.hash('Password123!', 12);

    await prismaService.user.create({
      data: {
        email: 'customer.e2e@example.com',
        passwordHash,
        name: 'E2E Customer',
        phone: '+15550101010',
        role: UserRole.CUSTOMER,
        customerProfile: {
          create: {
            address: '100 E2E Test Ave',
          },
        },
      },
    });
    await prismaService.user.create({
      data: {
        email: 'owner.e2e@example.com',
        passwordHash,
        name: 'E2E Owner',
        role: UserRole.RESTAURANT_OWNER,
      },
    });
    await prismaService.user.create({
      data: {
        email: 'rider.e2e@example.com',
        passwordHash,
        name: 'E2E Rider',
        role: UserRole.RIDER,
        riderProfile: {
          create: {
            availability: RiderAvailability.AVAILABLE,
          },
        },
      },
    });
  }

  async function seedRestaurants() {
    const owner = await prismaService.user.findUniqueOrThrow({
      where: { email: 'owner.e2e@example.com' },
    });
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
          ownerId: owner.id,
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

  async function loginCustomer(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'customer.e2e@example.com',
        password: 'Password123!',
      })
      .expect(201);
    const body = response.body as AuthResponse;

    return body.accessToken;
  }

  function getStructuredLogRecords(): Array<Record<string, unknown>> {
    return stdoutWrite.mock.calls
      .map(([chunk]) => String(chunk).trim())
      .filter((line) => line.startsWith('{') && line.endsWith('}'))
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }
});
