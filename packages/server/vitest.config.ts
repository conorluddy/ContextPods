import { defineConfig, mergeConfig } from 'vitest/config';
import rootConfig from '../../vitest.config';

export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      name: '@context-pods/server',
      dir: './',
      globals: true,
      environment: 'node',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/*.d.ts', '**/tests/**', '**/*.config.*'],
        thresholds: {
          lines: 0,
          functions: 0,
          branches: 0,
          statements: 0,
        },
      },
    },
  }),
);
