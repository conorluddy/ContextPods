/**
 * MCP message testing utilities
 */

import { spawn, type ChildProcess } from 'child_process';

import { logger } from '@context-pods/core';

import type { TestHarnessConfig } from '../types.js';

/**
 * MCP Message Test Harness
 *
 * Provides utilities for testing MCP server message handling
 */
export class MCPMessageTestHarness {
  private serverProcess?: ChildProcess;
  private config: TestHarnessConfig;

  constructor(config: TestHarnessConfig) {
    this.config = config;
  }

  /**
   * Start the MCP server
   */
  async startServer(): Promise<void> {
    if (this.config.transport !== 'stdio') {
      throw new Error('Only stdio transport is currently supported');
    }

    logger.info(`Starting MCP server: ${this.config.serverPath}`);

    // Spawn the server process
    this.serverProcess = spawn('node', [this.config.serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MCP_DEBUG: this.config.debug ? 'true' : 'false',
      },
    });

    // Handle server errors
    this.serverProcess.on('error', (error) => {
      logger.error(`Server process error: ${error.message}`);
    });

    this.serverProcess.stderr?.on('data', (data) => {
      if (this.config.debug) {
        logger.debug(`Server stderr: ${(data as Buffer).toString()}`);
      }
    });

    // Give server time to start
    await this.delay(1000);

    logger.info('MCP server started');
  }

  /**
   * Stop the MCP server
   */
  async stopServer(): Promise<void> {
    if (this.serverProcess) {
      logger.info('Stopping MCP server');
      this.serverProcess.kill();
      this.serverProcess = undefined;
    }
    await Promise.resolve(); // Make async function have await
    // Client cleanup will be implemented when we add proper MCP client integration
  }

  /**
   * Send initialize request
   */
  async initialize(capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  }): Promise<unknown> {
    const request = {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '1.0',
        capabilities: capabilities || {
          tools: true,
          resources: true,
          prompts: true,
        },
        clientInfo: {
          name: 'test-harness',
          version: '1.0.0',
        },
      },
      id: 1,
    };

    return this.sendMessage(request);
  }

  /**
   * List available tools
   */
  async listTools(): Promise<unknown> {
    const request = {
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: this.generateId(),
    };

    return this.sendMessage(request);
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args?: Record<string, unknown>): Promise<unknown> {
    const request = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name,
        arguments: args || {},
      },
      id: this.generateId(),
    };

    return this.sendMessage(request);
  }

  /**
   * List available resources
   */
  async listResources(): Promise<unknown> {
    const request = {
      jsonrpc: '2.0',
      method: 'resources/list',
      params: {},
      id: this.generateId(),
    };

    return this.sendMessage(request);
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<unknown> {
    const request = {
      jsonrpc: '2.0',
      method: 'resources/read',
      params: {
        uri,
      },
      id: this.generateId(),
    };

    return this.sendMessage(request);
  }

  /**
   * List available prompts
   */
  async listPrompts(): Promise<unknown> {
    const request = {
      jsonrpc: '2.0',
      method: 'prompts/list',
      params: {},
      id: this.generateId(),
    };

    return this.sendMessage(request);
  }

  /**
   * Get a prompt
   */
  async getPrompt(name: string, args?: Record<string, string>): Promise<unknown> {
    const request = {
      jsonrpc: '2.0',
      method: 'prompts/get',
      params: {
        name,
        arguments: args || {},
      },
      id: this.generateId(),
    };

    return this.sendMessage(request);
  }

  /**
   * Send a raw message
   */
  async sendMessage(message: Record<string, unknown>): Promise<unknown> {
    if (!this.serverProcess?.stdin || !this.serverProcess.stdout) {
      throw new Error('Server not started');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, this.config.timeout || 5000);

      // Set up response handler
      const responseHandler = (data: Buffer): void => {
        try {
          const lines = data.toString().split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const response = JSON.parse(line) as Record<string, unknown>;
              if (response.id === (message as { id: unknown }).id) {
                clearTimeout(timeout);
                this.serverProcess?.stdout?.off('data', responseHandler);
                resolve(response);
                return;
              }
            } catch (e) {
              // Not JSON, continue
              if (this.config.debug) {
                logger.debug(`Non-JSON output: ${line}`);
              }
            }
          }
        } catch (error) {
          clearTimeout(timeout);
          this.serverProcess?.stdout?.off('data', responseHandler);
          reject(error);
        }
      };

      if (!this.serverProcess?.stdout || !this.serverProcess.stdin) {
        reject(new Error('Server process or streams not available'));
        return;
      }

      const { stdout, stdin } = this.serverProcess;
      stdout.on('data', responseHandler);

      // Send the message
      const messageStr = JSON.stringify(message) + '\n';
      stdin.write(messageStr);

      if (this.config.debug) {
        logger.debug(`Sent message: ${messageStr.trim()}`);
      }
    });
  }

  /**
   * Test error handling
   */
  async sendInvalidMessage(message: Record<string, unknown> | string): Promise<unknown> {
    if (typeof message === 'string') {
      // For string messages, we can't use sendMessage directly
      throw new Error('Invalid message format');
    }
    return this.sendMessage(message);
  }

  /**
   * Test method not found
   */
  async callNonExistentMethod(method: string): Promise<unknown> {
    const request = {
      jsonrpc: '2.0',
      method,
      params: {},
      id: this.generateId(),
    };

    return this.sendMessage(request);
  }

  /**
   * Test invalid parameters
   */
  async sendInvalidParams(method: string, params: Record<string, unknown>): Promise<unknown> {
    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id: this.generateId(),
    };

    return this.sendMessage(request);
  }

  /**
   * Batch request test
   */
  async sendBatchRequest(requests: Record<string, unknown>[]): Promise<unknown[]> {
    // Batch requests need to be sent directly via the process, not through sendMessage
    // For now, simulate batch by sending individual requests
    const results: unknown[] = [];
    for (const request of requests) {
      const result = await this.sendMessage(request);
      results.push(result);
    }
    return results;
  }

  /**
   * Notification test (no id)
   */
  async sendNotification(method: string, params?: Record<string, unknown>): Promise<void> {
    const notification = {
      jsonrpc: '2.0',
      method,
      params: params || {},
    };

    // Send without expecting response
    if (!this.serverProcess?.stdin) {
      throw new Error('Server not started');
    }

    const messageStr = JSON.stringify(notification) + '\n';
    this.serverProcess.stdin.write(messageStr);

    // Give time for processing
    await this.delay(100);
  }

  /**
   * Generate unique message ID
   */
  private generateId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  /**
   * Delay helper
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get server process info
   */
  getServerInfo(): {
    pid?: number;
    running: boolean;
  } {
    return {
      pid: this.serverProcess?.pid,
      running: !!this.serverProcess && !this.serverProcess.killed,
    };
  }
}
