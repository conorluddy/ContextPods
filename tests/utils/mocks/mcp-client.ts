/**
 * MCP client mocking utilities
 */

import { vi } from 'vitest'

/**
 * Create a mock MCP client
 */
export function createMockMCPClient() {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    request: vi.fn().mockResolvedValue({}),
    notify: vi.fn().mockResolvedValue(undefined),
    listTools: vi.fn().mockResolvedValue({ tools: [] }),
    listResources: vi.fn().mockResolvedValue({ resources: [] }),
    callTool: vi.fn().mockResolvedValue({ content: [] }),
    readResource: vi.fn().mockResolvedValue({ contents: [] }),
    initialize: vi.fn().mockResolvedValue({
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {}
      },
      serverInfo: {
        name: 'mock-server',
        version: '1.0.0'
      }
    }),
    ping: vi.fn().mockResolvedValue({})
  }
}

/**
 * Create a mock MCP server
 */
export function createMockMCPServer() {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    onRequest: vi.fn(),
    onNotification: vi.fn(),
    setRequestHandler: vi.fn(),
    setNotificationHandler: vi.fn(),
    sendResponse: vi.fn(),
    sendError: vi.fn(),
    sendNotification: vi.fn()
  }
}

/**
 * Mock MCP transport
 */
export function createMockTransport() {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
    onMessage: vi.fn(),
    onClose: vi.fn(),
    onError: vi.fn()
  }
}