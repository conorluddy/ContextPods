import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@context-pods/server',
    dir: './',
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**'],
    testTimeout: 60000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.d.ts', '**/tests/**', '**/*.config.*'],
      thresholds: {
        lines: 75,
        functions: 85,
        branches: 70,
        statements: 75,
      },
    },
  },
});
