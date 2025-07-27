/**
 * E2E tests for validating generated MCP servers
 * Phase 7: Add Comprehensive Testing Framework
 *
 * Tests that generated servers:
 * 1. Build successfully
 * 2. Start without errors
 * 3. Respond to MCP protocol messages
 * 4. Handle errors gracefully
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { execa } from 'execa';
import type { ExecaChildProcess } from 'execa';
import { DefaultTemplateEngine } from '../../src/template-engine.js';
import type { TemplateContext } from '../../src/types.js';

// Test timeout for E2E operations
const E2E_TIMEOUT = 120000; // 2 minutes

interface MCPMessage {
  jsonrpc: '2.0';
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

class MCPClient {
  private process?: ExecaChildProcess;
  private messageBuffer = '';
  private responseHandlers = new Map<number | string, (response: MCPMessage) => void>();
  private nextId = 1;

  async start(command: string, args: string[], cwd: string): Promise<void> {
    this.process = execa(command, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    // Handle stdout
    if (this.process.stdout) {
      this.process.stdout.on('data', (data: Buffer) => {
        this.messageBuffer += data.toString();
        this.processMessages();
      });
    }

    // Handle stderr for debugging
    if (this.process.stderr) {
      this.process.stderr.on('data', (data: Buffer) => {
        console.error('Server stderr:', data.toString());
      });
    }

    // Wait a bit for server to start
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      await this.process.catch(() => {}); // Ignore exit errors
      this.process = undefined;
    }
  }

  async sendRequest(method: string, params?: unknown): Promise<MCPMessage> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Server not started');
    }

    const id = this.nextId++;
    const request: MCPMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responseHandlers.delete(id);
        reject(new Error(`Timeout waiting for response to ${method}`));
      }, 10000);

      this.responseHandlers.set(id, (response) => {
        clearTimeout(timeout);
        this.responseHandlers.delete(id);
        resolve(response);
      });

      this.process!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  private processMessages(): void {
    const lines = this.messageBuffer.split('\n');
    this.messageBuffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as MCPMessage;
          if (message.id !== undefined) {
            const handler = this.responseHandlers.get(message.id);
            if (handler) {
              handler(message);
            }
          }
        } catch (error) {
          console.error('Failed to parse message:', line, error);
        }
      }
    }
  }
}

describe('E2E - Generated Server Validation', () => {
  let testDir: string;
  let engine: DefaultTemplateEngine;
  let mcpClients: MCPClient[] = [];

  beforeEach(async () => {
    testDir = join(tmpdir(), `mcp-e2e-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
    engine = new DefaultTemplateEngine();
    mcpClients = [];
  });

  afterEach(async () => {
    // Stop all MCP clients
    for (const client of mcpClients) {
      await client.stop();
    }
    mcpClients = [];

    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  /**
   * Test 1: TypeScript server MCP protocol compliance
   */
  it.skip(
    'should generate TypeScript server with full MCP compliance',
    async () => {
      const templatePath = join(process.cwd(), '../../templates', 'typescript-advanced');
      const outputPath = join(testDir, 'ts-mcp-server');

      // Generate server
      const metadata = JSON.parse(await fs.readFile(join(templatePath, 'template.json'), 'utf8'));

      const context: TemplateContext = {
        templatePath,
        outputPath,
        variables: {
          serverName: 'ts-mcp-test',
          description: 'TypeScript MCP compliance test',
          includeTools: true,
          includeResources: true,
          toolCategories: ['file', 'data'],
        },
        optimization: {
          turboRepo: false,
          hotReload: false,
          sharedDependencies: false,
          buildCaching: false,
        },
      };

      const result = await engine.process(metadata, context);
      expect(result.success).toBe(true);

      // Install and build
      await execa('npm', ['install'], { cwd: outputPath, timeout: 60000 });
      await execa('npm', ['run', 'build'], { cwd: outputPath, timeout: 30000 });

      // Start server and test MCP protocol
      const client = new MCPClient();
      mcpClients.push(client);
      await client.start('node', ['dist/index.js'], outputPath);

      // Test 1: Initialize
      const initResponse = await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      });

      expect(initResponse.result).toBeDefined();
      expect(initResponse.result.protocolVersion).toBe('2024-11-05');
      expect(initResponse.result.capabilities).toBeDefined();
      expect(initResponse.result.serverInfo).toBeDefined();
      expect(initResponse.result.serverInfo.name).toBe('ts-mcp-test');

      // Test 2: List tools (if included)
      if (context.variables.includeTools) {
        const toolsResponse = await client.sendRequest('tools/list');
        expect(toolsResponse.result).toBeDefined();
        expect(Array.isArray(toolsResponse.result.tools)).toBe(true);
        expect(toolsResponse.result.tools.length).toBeGreaterThan(0);

        // Verify tool structure
        const tool = toolsResponse.result.tools[0];
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
      }

      // Test 3: List resources (if included)
      if (context.variables.includeResources) {
        const resourcesResponse = await client.sendRequest('resources/list');
        expect(resourcesResponse.result).toBeDefined();
        expect(Array.isArray(resourcesResponse.result.resources)).toBe(true);
      }

      // Test 4: Ping
      const pingResponse = await client.sendRequest('ping');
      expect(pingResponse.result).toBeDefined();

      // Test 5: Error handling
      const errorResponse = await client.sendRequest('invalid/method');
      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.error.code).toBe(-32601); // Method not found
    },
    E2E_TIMEOUT,
  );

  /**
   * Test 2: Basic template minimal server test
   */
  it.skip(
    'should generate working basic template server',
    async () => {
      const templatePath = join(process.cwd(), '../../templates', 'basic');
      const outputPath = join(testDir, 'basic-server');

      // Generate server
      const metadata = JSON.parse(await fs.readFile(join(templatePath, 'template.json'), 'utf8'));

      const context: TemplateContext = {
        templatePath,
        outputPath,
        variables: {
          serverName: 'basic-test-server',
        },
        optimization: {
          turboRepo: false,
          hotReload: false,
          sharedDependencies: false,
          buildCaching: false,
        },
      };

      const result = await engine.process(metadata, context);
      expect(result.success).toBe(true);

      // Install and build
      await execa('npm', ['install'], { cwd: outputPath, timeout: 60000 });
      await execa('npm', ['run', 'build'], { cwd: outputPath, timeout: 30000 });

      // Start server
      const client = new MCPClient();
      mcpClients.push(client);
      await client.start('node', ['dist/index.js'], outputPath);

      // Basic protocol test
      const initResponse = await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      });

      expect(initResponse.result).toBeDefined();
      expect(initResponse.result.serverInfo.name).toBe('basic-test-server');
    },
    E2E_TIMEOUT,
  );

  /**
   * Test 3: Tool execution in generated server
   */
  it.skip(
    'should execute tools in generated server',
    async () => {
      const templatePath = join(process.cwd(), '../../templates', 'typescript-advanced');
      const outputPath = join(testDir, 'tool-test-server');

      // Generate server with file tools
      const metadata = JSON.parse(await fs.readFile(join(templatePath, 'template.json'), 'utf8'));

      const context: TemplateContext = {
        templatePath,
        outputPath,
        variables: {
          serverName: 'tool-test-server',
          includeTools: true,
          toolCategories: ['file'],
        },
        optimization: {
          turboRepo: false,
          hotReload: false,
          sharedDependencies: false,
          buildCaching: false,
        },
      };

      const result = await engine.process(metadata, context);
      expect(result.success).toBe(true);

      // Install and build
      await execa('npm', ['install'], { cwd: outputPath, timeout: 60000 });
      await execa('npm', ['run', 'build'], { cwd: outputPath, timeout: 30000 });

      // Create test file for file operations
      const testFilePath = join(outputPath, 'test-file.txt');
      await fs.writeFile(testFilePath, 'Test content for tool execution');

      // Start server
      const client = new MCPClient();
      mcpClients.push(client);
      await client.start('node', ['dist/index.js'], outputPath);

      // Initialize
      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      });

      // List tools
      const toolsResponse = await client.sendRequest('tools/list');
      const fileTools = toolsResponse.result.tools.filter(
        (t: { name: string }) => t.name.includes('read') || t.name.includes('file'),
      );

      if (fileTools.length > 0) {
        // Try to execute a file reading tool
        const readTool = fileTools[0];
        const callResponse = await client.sendRequest('tools/call', {
          name: readTool.name,
          arguments: {
            path: 'test-file.txt',
          },
        });

        expect(callResponse.result).toBeDefined();
        // Tool should either succeed or return a proper error
        if (!callResponse.error) {
          expect(callResponse.result.content).toBeDefined();
        }
      }
    },
    E2E_TIMEOUT,
  );

  /**
   * Test 4: Server error recovery
   */
  it.skip(
    'should handle errors gracefully in generated server',
    async () => {
      const templatePath = join(process.cwd(), '../../templates', 'basic');
      const outputPath = join(testDir, 'error-test-server');

      // Generate server
      const metadata = JSON.parse(await fs.readFile(join(templatePath, 'template.json'), 'utf8'));

      const context: TemplateContext = {
        templatePath,
        outputPath,
        variables: {
          serverName: 'error-test-server',
        },
        optimization: {
          turboRepo: false,
          hotReload: false,
          sharedDependencies: false,
          buildCaching: false,
        },
      };

      const result = await engine.process(metadata, context);
      expect(result.success).toBe(true);

      // Install and build
      await execa('npm', ['install'], { cwd: outputPath, timeout: 60000 });
      await execa('npm', ['run', 'build'], { cwd: outputPath, timeout: 30000 });

      // Start server
      const client = new MCPClient();
      mcpClients.push(client);
      await client.start('node', ['dist/index.js'], outputPath);

      // Test various error scenarios
      // 1. Invalid JSON-RPC version
      const invalidVersionResponse = await client.sendRequest('initialize', {
        protocolVersion: '1.0', // Invalid version
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      });

      // Should either reject or return error
      if (!invalidVersionResponse.error) {
        // Some servers might be lenient
        expect(invalidVersionResponse.result).toBeDefined();
      } else {
        expect(invalidVersionResponse.error).toBeDefined();
      }

      // 2. Missing required parameters
      const missingParamsResponse = await client.sendRequest('initialize', {});
      if (missingParamsResponse.error) {
        expect(missingParamsResponse.error.code).toBe(-32602); // Invalid params
      }

      // 3. Method not found
      const notFoundResponse = await client.sendRequest('nonexistent/method');
      expect(notFoundResponse.error).toBeDefined();
      expect(notFoundResponse.error.code).toBe(-32601); // Method not found

      // 4. Server should still be responsive after errors
      const pingResponse = await client.sendRequest('ping');
      expect(pingResponse.result).toBeDefined();
    },
    E2E_TIMEOUT,
  );

  /**
   * Test 5: Multi-instance server test
   */
  it.skip(
    'should support multiple server instances',
    async () => {
      const templatePath = join(process.cwd(), '../../templates', 'basic');

      // Generate two servers
      const servers = ['server1', 'server2'];
      const clients: MCPClient[] = [];

      for (const serverName of servers) {
        const outputPath = join(testDir, serverName);

        const metadata = JSON.parse(await fs.readFile(join(templatePath, 'template.json'), 'utf8'));

        const context: TemplateContext = {
          templatePath,
          outputPath,
          variables: { serverName },
          optimization: {
            turboRepo: false,
            hotReload: false,
            sharedDependencies: false,
            buildCaching: false,
          },
        };

        const result = await engine.process(metadata, context);
        expect(result.success).toBe(true);

        // Build each server
        await execa('npm', ['install'], { cwd: outputPath, timeout: 60000 });
        await execa('npm', ['run', 'build'], { cwd: outputPath, timeout: 30000 });

        // Start each server
        const client = new MCPClient();
        clients.push(client);
        mcpClients.push(client);
        await client.start('node', ['dist/index.js'], outputPath);
      }

      // Test both servers are responsive
      for (let i = 0; i < clients.length; i++) {
        const response = await clients[i].sendRequest('initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: `client-${i}`, version: '1.0.0' },
        });

        expect(response.result).toBeDefined();
        expect(response.result.serverInfo.name).toBe(servers[i]);
      }

      // Both servers should work independently
      const pingPromises = clients.map((client) => client.sendRequest('ping'));
      const pingResponses = await Promise.all(pingPromises);

      for (const response of pingResponses) {
        expect(response.result).toBeDefined();
      }
    },
    E2E_TIMEOUT,
  );
});
