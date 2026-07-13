import path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'e2e/**'],
    globals: true,
    setupFiles: './vitest.setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/components/shared/**/*.{ts,tsx}',
        'src/features/**/components/**/*.{ts,tsx}',
        'src/features/**/schemas/**/*.{ts,tsx}',
        'src/features/orders/lib/**/*.{ts,tsx}',
        'src/stores/cart-store.ts',
        'src/stores/session-store.ts',
      ],
      exclude: [
        'e2e/**',
        '**/*.stories.tsx',
        '**/tests/**',
        'src/features/**/components/*screen.tsx',
        'src/features/**/hooks/**',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
