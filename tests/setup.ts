/**
 * Global test setup for Context-Pods test suite
 * This file is run before all tests
 */

import { beforeEach, afterEach, vi } from 'vitest'

// Define resetFileSystemMocks function inline to avoid import issues
function resetFileSystemMocks() {
  // This will be properly implemented when we have proper mocks
}

// Mock SQLite3 to avoid native module issues in tests
vi.mock('sqlite3', () => {
  const mockDatabase = vi.fn().mockImplementation(() => ({
    run: vi.fn(),
    get: vi.fn(),
    all: vi.fn(),
    close: vi.fn(),
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
      finalize: vi.fn()
    })
  }))
  
  return {
    default: {
      Database: mockDatabase
    },
    Database: mockDatabase
  }
})

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