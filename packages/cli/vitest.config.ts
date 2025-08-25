import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: '@context-pods/cli',
    dir: './',
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.d.ts', '**/tests/**', '**/*.config.*'],
      thresholds: {
        lines: 39,
        functions: 80,
        branches: 65,
        statements: 39,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@context-pods/core': path.resolve(__dirname, '../core/src'),
      '@context-pods/server': path.resolve(__dirname, '../server/src'),
      '@context-pods/cli': path.resolve(__dirname, './src'),
    },
  },
});
