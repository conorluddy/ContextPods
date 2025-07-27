/**
 * Mock helpers for testing
 */

export class MockHelpers {
  static createMockMCPServer() {
    // TODO: Implement mock MCP server
  }

  static createMockRequest(method: string, params?: any) {
    return {
      jsonrpc: '2.0',
      method,
      params: params || {},
      id: Math.floor(Math.random() * 1000),
    };
  }

  static createMockResponse(id: number, result?: any, error?: any) {
    return {
      jsonrpc: '2.0',
      ...(result !== undefined ? { result } : {}),
      ...(error !== undefined ? { error } : {}),
      id,
    };
  }
}