/**
 * Database mocking utilities for SQLite3
 */

import { vi } from 'vitest'

/**
 * Mock SQLite3 database
 */
export function createMockDatabase() {
  const mockRows: any[] = []
  
  return {
    run: vi.fn().mockImplementation((sql: string, params: any[], callback?: Function) => {
      if (callback) callback(null)
      return { lastID: 1, changes: 1 }
    }),
    get: vi.fn().mockImplementation((sql: string, params: any[], callback?: Function) => {
      const result = mockRows.find(() => true) || null
      if (callback) callback(null, result)
      return result
    }),
    all: vi.fn().mockImplementation((sql: string, params: any[], callback?: Function) => {
      if (callback) callback(null, mockRows)
      return mockRows
    }),
    exec: vi.fn().mockImplementation((sql: string, callback?: Function) => {
      if (callback) callback(null)
    }),
    close: vi.fn().mockImplementation((callback?: Function) => {
      if (callback) callback(null)
    }),
    serialize: vi.fn().mockImplementation((callback?: Function) => {
      if (callback) callback()
    }),
    parallelize: vi.fn().mockImplementation((callback?: Function) => {
      if (callback) callback()
    }),
    prepare: vi.fn().mockReturnValue({
      run: vi.fn().mockImplementation((params: any[], callback?: Function) => {
        if (callback) callback(null)
        return { lastID: 1, changes: 1 }
      }),
      get: vi.fn().mockImplementation((params: any[], callback?: Function) => {
        const result = mockRows.find(() => true) || null
        if (callback) callback(null, result)
        return result
      }),
      all: vi.fn().mockImplementation((params: any[], callback?: Function) => {
        if (callback) callback(null, mockRows)
        return mockRows
      }),
      finalize: vi.fn().mockImplementation((callback?: Function) => {
        if (callback) callback(null)
      })
    }),
    // Helper methods for testing
    __setMockRows: (rows: any[]) => {
      mockRows.length = 0
      mockRows.push(...rows)
    },
    __getMockRows: () => mockRows,
    __clearMockRows: () => {
      mockRows.length = 0
    }
  }
}

/**
 * Create in-memory SQLite database mock
 */
export function createInMemoryDatabase() {
  const db = createMockDatabase()
  
  // Override for in-memory behavior
  db.run = vi.fn().mockImplementation((sql: string, params: any[] = []) => {
    // Simple mock implementation for common SQL operations
    if (sql.includes('CREATE TABLE')) {
      return { lastID: 0, changes: 0 }
    }
    if (sql.includes('INSERT')) {
      return { lastID: Date.now(), changes: 1 }
    }
    if (sql.includes('UPDATE')) {
      return { lastID: 0, changes: 1 }
    }
    if (sql.includes('DELETE')) {
      return { lastID: 0, changes: 1 }
    }
    return { lastID: 0, changes: 0 }
  })
  
  return db
}