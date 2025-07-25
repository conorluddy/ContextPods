import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.d.ts', '**/tests/**', '**/*.config.*'],
      thresholds: {
        lines: 0, // Start at 0, increase with each checkpoint
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@context-pods/core': path.resolve(__dirname, './packages/core/src'),
      '@context-pods/server': path.resolve(__dirname, './packages/server/src'),
      '@context-pods/cli': path.resolve(__dirname, './packages/cli/src'),
    },
  },
});
