/**
 * Global test setup for Context-Pods test suite
 * This file is run before all tests
 */

import { beforeEach, afterEach } from 'vitest'

// Define resetFileSystemMocks function inline to avoid import issues
function resetFileSystemMocks() {
  // This will be properly implemented when we have proper mocks
}

// Global test setup
beforeEach(() => {
  // Reset all mocks before each test
  resetFileSystemMocks()
})

afterEach(() => {
  // Cleanup after each test
  resetFileSystemMocks()
})

// Global test configuration
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'silent'

// Suppress console output during tests unless explicitly needed
if (!process.env.DEBUG_TESTS) {
  console.log = () => {}
  console.warn = () => {}
  console.error = () => {}
}