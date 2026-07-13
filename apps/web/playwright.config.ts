import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
  },
  webServer: {
    command:
      'pnpm --filter @food-delivery/web build && mkdir -p .next/standalone/apps/web/.next && rm -rf .next/standalone/apps/web/.next/static .next/standalone/apps/web/public && cp -R .next/static .next/standalone/apps/web/.next/static && cp -R public .next/standalone/apps/web/public && PORT=3001 HOSTNAME=127.0.0.1 node .next/standalone/apps/web/server.js',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
