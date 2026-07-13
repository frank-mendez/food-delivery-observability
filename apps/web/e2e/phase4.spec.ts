import { expect, test, type Page } from '@playwright/test';

const restaurant = {
  id: 'restaurant-1',
  ownerId: 'owner-1',
  name: 'Northstar Burgers',
  status: 'OPEN',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  menuItems: [
    {
      id: 'menu-1',
      restaurantId: 'restaurant-1',
      name: 'Classic Cheeseburger',
      price: '11.50',
      isAvailable: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

const order = {
  id: 'order-1',
  restaurantId: 'restaurant-1',
  status: 'PAID',
  totalAmount: '11.50',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  restaurant,
  items: [
    {
      id: 'order-item-1',
      orderId: 'order-1',
      menuItemId: 'menu-1',
      quantity: 1,
      priceSnapshot: '11.50',
      menuItem: restaurant.menuItems[0],
    },
  ],
  payment: {
    id: 'payment-1',
    orderId: 'order-1',
    status: 'SUCCEEDED',
    amount: '11.50',
    attemptCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
};

async function mockBackend(page: Page) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const isApiRequest =
      request.resourceType() === 'fetch' || request.resourceType() === 'xhr';

    if (!isApiRequest) {
      await route.continue();
      return;
    }

    const path = url.pathname.startsWith('/api/backend')
      ? url.pathname.replace('/api/backend', '')
      : url.pathname;
    const method = request.method();

    if (
      ![
        '/health',
        '/auth/login',
        '/restaurants',
        '/restaurants/restaurant-1',
        '/restaurants/restaurant-1/menu',
        '/customers/me',
        '/orders',
        '/orders/order-1',
      ].includes(path)
    ) {
      await route.continue();
      return;
    }

    if (path === '/health') {
      await route.fulfill({ json: { status: 'ok' } });
      return;
    }

    if (path === '/auth/login' && method === 'POST') {
      await route.fulfill({
        json: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: {
            id: 'customer-1',
            email: 'customer@example.com',
            name: 'Demo Customer',
            role: 'CUSTOMER',
          },
        },
      });
      return;
    }

    if (path === '/restaurants') {
      await route.fulfill({ json: [restaurant] });
      return;
    }

    if (path === '/restaurants/restaurant-1') {
      await route.fulfill({ json: restaurant });
      return;
    }

    if (path === '/restaurants/restaurant-1/menu') {
      await route.fulfill({ json: restaurant.menuItems });
      return;
    }

    if (path === '/customers/me') {
      await route.fulfill({
        json: {
          id: 'customer-1',
          email: 'customer@example.com',
          name: 'Demo Customer',
          phone: '+15550101010',
          role: 'CUSTOMER',
          customerProfile: {
            id: 'profile-1',
            userId: 'customer-1',
            address: '100 Local Test Ave',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      });
      return;
    }

    if (path === '/orders' && method === 'POST') {
      await route.fulfill({ json: order });
      return;
    }

    if (path === '/orders' && method === 'GET') {
      await route.fulfill({ json: [order] });
      return;
    }

    if (path === '/orders/order-1') {
      await route.fulfill({ json: order });
      return;
    }

    await route.fulfill({ status: 404, json: { message: `No mock for ${path}` } });
  });
}

test.beforeEach(async ({ page }) => {
  await mockBackend(page);
});

test('customer can browse, cart, checkout, and land on order tracking', async ({
  page,
}) => {
  await page.goto('/restaurants');

  await expect(page.getByText('Northstar Burgers')).toBeVisible();
  await page.getByRole('link', { name: /menu/i }).click();
  await page.getByRole('button', { name: /add to cart/i }).click();
  await page.getByRole('banner').getByRole('link', { name: /cart/i }).click();
  await expect(
    page.getByRole('heading', { name: 'Classic Cheeseburger' }),
  ).toBeVisible();
  await page.getByRole('link', { name: /^checkout$/i }).click();
  await page.getByLabel('Name').fill('Demo Customer');
  await page.getByLabel('Phone').fill('+15550101010');
  await page.getByLabel('Delivery address').fill('100 Local Test Ave');
  await page.getByRole('button', { name: /place order/i }).click();

  await expect(page).toHaveURL(/\/orders\/order-1$/);
  await expect(page.getByText('Northstar Burgers')).toBeVisible();
});

test('development role switcher persists restaurant role', async ({ page }) => {
  await page.goto('/');

  await page
    .locator('#main-content')
    .getByRole('button', { name: /restaurant/i })
    .click();

  await expect(page.getByRole('link', { name: 'Portal', exact: true }).first()).toBeVisible();
});
