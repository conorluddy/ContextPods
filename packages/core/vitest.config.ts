import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: '@context-pods/core',
    globals: true,
    environment: 'node',
    setupFiles: ['../../tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.d.ts', '**/tests/**', '**/*.config.*'],
      thresholds: {
        lines: 80,
        functions: 85,
        branches: 75,
        statements: 80,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@context-pods/core': path.resolve(__dirname, './src'),
    },
  },
});
