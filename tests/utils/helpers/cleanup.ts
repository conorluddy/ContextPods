/**
 * Test cleanup utilities
 */

import { vol } from 'memfs'
import { vi } from 'vitest'
import * as tmp from 'tmp-promise'

/**
 * Cleanup all test resources
 */
export async function cleanupAll(): Promise<void> {
  // Reset file system mocks
  vol.reset()
  
  // Clear all vitest mocks
  vi.clearAllMocks()
  
  // Reset environment variables
  delete process.env.TEST_DB_PATH
  delete process.env.TEST_OUTPUT_DIR
  
  // Cleanup temporary directories if any were created
  await cleanupTempDirectories()
}

/**
 * Cleanup temporary directories created during tests
 */
export async function cleanupTempDirectories(): Promise<void> {
  // In a real implementation, you'd track temp directories
  // For now, this is a placeholder for temp directory cleanup
}

/**
 * Create a temporary directory for testing
 */
export async function createTempDirectory(): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const tmpDir = await tmp.dir({ unsafeCleanup: true })
  
  return {
    path: tmpDir.path,
    cleanup: async () => {
      try {
        await tmpDir.cleanup()
      } catch (error) {
        console.warn('Failed to cleanup temp directory:', error)
      }
    }
  }
}

/**
 * Create a temporary file for testing
 */
export async function createTempFile(content: string = '', extension: string = '.txt'): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const tmpFile = await tmp.file({ postfix: extension })
  
  if (content) {
    await require('fs').promises.writeFile(tmpFile.path, content)
  }
  
  return {
    path: tmpFile.path,
    cleanup: async () => {
      try {
        await tmpFile.cleanup()
      } catch (error) {
        console.warn('Failed to cleanup temp file:', error)
      }
    }
  }
}

/**
 * Setup test environment
 */
export function setupTestEnvironment() {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.LOG_LEVEL = 'silent'
  
  // Mock console methods if not in debug mode
  if (!process.env.DEBUG_TESTS) {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  }
}

/**
 * Restore test environment
 */
export function restoreTestEnvironment() {
  vi.restoreAllMocks()
}