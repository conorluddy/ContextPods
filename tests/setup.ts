/**
 * Global test setup for Context-Pods test suite
 * Initializes common test environment and utilities
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';

/**
 * Global setup before all tests
 */
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.CONTEXT_PODS_TEST = 'true';
});

/**
 * Cleanup after each test
 */
afterEach(() => {
  // Clear any mocks after each test
  vi.clearAllMocks();
});

/**
 * Global cleanup after all tests
 */
afterAll(() => {
  // Any global cleanup needed
});
