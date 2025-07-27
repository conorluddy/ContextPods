/**
 * Mock helpers for testing
 */

export class MockHelpers {
  static createMockMCPServer(): void {
    // TODO: Implement mock MCP server
  }

  static createMockRequest(
    method: string,
    params?: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      jsonrpc: '2.0',
      method,
      params: params || ({} as Record<string, unknown>),
      id: Math.floor(Math.random() * 1000),
    };
  }

  static createMockResponse(
    id: number,
    result?: unknown,
    error?: unknown,
  ): Record<string, unknown> {
    return {
      jsonrpc: '2.0',
      ...(result !== undefined ? { result } : ({} as Record<string, unknown>)),
      ...(error !== undefined ? { error } : ({} as Record<string, unknown>)),
      id,
    };
  }
}
