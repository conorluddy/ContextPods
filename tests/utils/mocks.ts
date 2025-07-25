/**
 * Common mock utilities for Context-Pods tests
 */

import { vi } from 'vitest';
import { Volume } from 'memfs';
import type { IPromisesAPI } from 'memfs/lib/promises/index.js';

interface MockFileSystem {
  vol: Volume;
  fs: IPromisesAPI;
  reset: () => void;
}

interface MockMCPClient {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  request: ReturnType<typeof vi.fn>;
  notify: ReturnType<typeof vi.fn>;
  getServerCapabilities: ReturnType<typeof vi.fn>;
  listTools: ReturnType<typeof vi.fn>;
  listResources: ReturnType<typeof vi.fn>;
  listPrompts: ReturnType<typeof vi.fn>;
  callTool: ReturnType<typeof vi.fn>;
  readResource: ReturnType<typeof vi.fn>;
  getPrompt: ReturnType<typeof vi.fn>;
  listResourceTemplates: ReturnType<typeof vi.fn>;
  completeResourceTemplate: ReturnType<typeof vi.fn>;
}

interface MockMCPServer {
  connect: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onRequest: ReturnType<typeof vi.fn>;
  onNotification: ReturnType<typeof vi.fn>;
  sendNotification: ReturnType<typeof vi.fn>;
  sendResult: ReturnType<typeof vi.fn>;
  sendError: ReturnType<typeof vi.fn>;
  setRequestHandler: ReturnType<typeof vi.fn>;
  setNotificationHandler: ReturnType<typeof vi.fn>;
}

interface MockDatabase {
  run: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
  prepare: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  exec: ReturnType<typeof vi.fn>;
}

interface MockLogger {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock file system using memfs
 */
export const createMockFileSystem = (): MockFileSystem => {
  const vol = new Volume();
  return {
    vol,
    fs: vol.promises,
    reset: () => vol.reset(),
  };
};

/**
 * Create a mock MCP client
 */
export const createMockMCPClient = (): MockMCPClient => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  request: vi.fn(),
  notify: vi.fn(),
  getServerCapabilities: vi.fn(),
  listTools: vi.fn(),
  listResources: vi.fn(),
  listPrompts: vi.fn(),
  callTool: vi.fn(),
  readResource: vi.fn(),
  getPrompt: vi.fn(),
  listResourceTemplates: vi.fn(),
  completeResourceTemplate: vi.fn(),
});

/**
 * Create a mock MCP server
 */
export const createMockMCPServer = (): MockMCPServer => ({
  connect: vi.fn(),
  close: vi.fn(),
  onRequest: vi.fn(),
  onNotification: vi.fn(),
  sendNotification: vi.fn(),
  sendResult: vi.fn(),
  sendError: vi.fn(),
  setRequestHandler: vi.fn(),
  setNotificationHandler: vi.fn(),
});

/**
 * Create a mock SQLite database
 */
export const createMockDatabase = (): MockDatabase => ({
  run: vi.fn(),
  get: vi.fn(),
  all: vi.fn(),
  prepare: vi.fn(),
  close: vi.fn(),
  exec: vi.fn(),
});

/**
 * Create a mock logger
 */
export const createMockLogger = (): MockLogger => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
});
