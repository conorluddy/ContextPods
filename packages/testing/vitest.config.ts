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
    },
  },
  resolve: {
    alias: {
      '@context-pods/testing': path.resolve(__dirname, './src'),
      '@context-pods/core': path.resolve(__dirname, '../core/src'),
    },
  },
});