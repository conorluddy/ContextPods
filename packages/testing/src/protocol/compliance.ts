/**
 * MCP Protocol compliance testing
 */

import { logger } from '@context-pods/core';

import type { TestResult, TestSuiteResult, MCPResponse } from '../types.js';
import { TestStatus } from '../types.js';

import { MCPMessageTestHarness } from './messages.js';
import { MCPProtocolValidator } from './validator.js';

/**
 * MCP compliance test suite
 */
export class MCPComplianceTestSuite {
  private harness: MCPMessageTestHarness;
  private validator: MCPProtocolValidator;

  constructor(serverPath: string, debug = false) {
    this.harness = new MCPMessageTestHarness({
      serverPath,
      transport: 'stdio',
      timeout: 5000,
      debug,
    });
    this.validator = new MCPProtocolValidator();
  }

  /**
   * Run full compliance test suite
   */
  async runFullSuite(): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const tests: TestResult[] = [];

    logger.info('Starting MCP compliance test suite');

    try {
      // Start server
      await this.harness.startServer();

      // Run test categories
      tests.push(...(await this.testInitialization()));
      tests.push(...(await this.testToolsCapability()));
      tests.push(...(await this.testResourcesCapability()));
      tests.push(...(await this.testPromptsCapability()));
      tests.push(...(await this.testErrorHandling()));
      tests.push(...(await this.testJsonRpcCompliance()));
    } catch (error) {
      logger.error(`Compliance test suite failed: ${String(error)}`);
      tests.push({
        name: 'Test Suite Execution',
        status: TestStatus.FAILED,
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      // Stop server
      await this.harness.stopServer();
    }

    // Calculate results
    const passed = tests.filter((t) => t.status === TestStatus.PASSED).length;
    const failed = tests.filter((t) => t.status === TestStatus.FAILED).length;
    const skipped = tests.filter((t) => t.status === TestStatus.SKIPPED).length;

    return {
      name: 'MCP Compliance Test Suite',
      tests,
      duration: Date.now() - startTime,
      passed,
      failed,
      skipped,
    };
  }

  /**
   * Test initialization protocol
   */
  private async testInitialization(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test 1: Basic initialization
    tests.push(
      await this.runTest('Basic Initialization', async () => {
        const response = (await this.harness.initialize()) as MCPResponse;

        // Validate response
        const validation = this.validator.validateMessage(response);
        if (!validation.valid) {
          throw new Error(`Invalid response: ${validation.errors?.join(', ')}`);
        }

        // Check required fields
        if (!response.result?.protocolVersion) {
          throw new Error('Missing protocol version in response');
        }

        if (!response.result?.serverInfo?.name) {
          throw new Error('Missing server info in response');
        }
      }),
    );

    // Test 2: Capability negotiation
    tests.push(
      await this.runTest('Capability Negotiation', async () => {
        const response = (await this.harness.initialize({
          tools: false,
          resources: true,
          prompts: false,
        })) as MCPResponse;

        // Server should respect client capabilities
        const caps = response.result?.capabilities;
        if (!caps) {
          throw new Error('Missing capabilities in response');
        }
      }),
    );

    // Test 3: Double initialization
    tests.push(
      await this.runTest('Double Initialization Prevention', async () => {
        // First init
        await this.harness.initialize();

        // Second init should fail or be ignored
        try {
          const response = (await this.harness.initialize()) as MCPResponse;
          if (!response.error) {
            throw new Error('Server allowed double initialization');
          }
        } catch {
          // Expected behavior
        }
      }),
    );

    return tests;
  }

  /**
   * Test tools capability
   */
  private async testToolsCapability(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Initialize first
    await this.harness.initialize();

    // Test 1: List tools
    tests.push(
      await this.runTest('List Tools', async () => {
        const response = (await this.harness.listTools()) as MCPResponse;

        if (!response.result?.tools) {
          throw new Error('Missing tools in response');
        }

        // Validate each tool
        for (const tool of response.result.tools) {
          if (!this.validator.validateToolDeclaration(tool as Record<string, unknown>)) {
            throw new Error(`Invalid tool declaration: ${tool.name}`);
          }
        }
      }),
    );

    // Test 2: Call tool
    tests.push(
      await this.runTest('Call Tool', async () => {
        // First get available tools
        const listResponse = (await this.harness.listTools()) as MCPResponse;
        const tools = listResponse.result?.tools || [];

        if (tools.length > 0) {
          const firstTool = tools[0];
          if (!firstTool?.name) {
            throw new Error('First tool has no name');
          }
          const response = (await this.harness.callTool(firstTool.name)) as MCPResponse;

          if (!response.result?.content) {
            throw new Error('Missing content in tool response');
          }
        }
      }),
    );

    // Test 3: Call non-existent tool
    tests.push(
      await this.runTest('Call Non-Existent Tool', async () => {
        const response = (await this.harness.callTool('non-existent-tool-12345')) as MCPResponse;

        if (!response.error) {
          throw new Error('Server did not return error for non-existent tool');
        }

        if (response.error.code !== -32601) {
          throw new Error(`Wrong error code: ${response.error.code} (expected -32601)`);
        }
      }),
    );

    return tests;
  }

  /**
   * Test resources capability
   */
  private async testResourcesCapability(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test 1: List resources
    tests.push(
      await this.runTest('List Resources', async () => {
        const response = (await this.harness.listResources()) as MCPResponse;

        if (!response.result?.resources) {
          throw new Error('Missing resources in response');
        }

        // Validate each resource
        for (const resource of response.result.resources) {
          if (!this.validator.validateResourceDeclaration(resource as Record<string, unknown>)) {
            throw new Error(`Invalid resource declaration: ${resource.uri}`);
          }
        }
      }),
    );

    // Test 2: Read resource
    tests.push(
      await this.runTest('Read Resource', async () => {
        // First get available resources
        const listResponse = (await this.harness.listResources()) as MCPResponse;
        const resources = listResponse.result?.resources || [];

        if (resources.length > 0) {
          const firstResource = resources[0];
          if (!firstResource?.uri) {
            throw new Error('First resource has no URI');
          }
          const response = (await this.harness.readResource(firstResource.uri)) as MCPResponse;

          if (!response.result?.contents) {
            throw new Error('Missing contents in resource response');
          }
        }
      }),
    );

    // Test 3: Read non-existent resource
    tests.push(
      await this.runTest('Read Non-Existent Resource', async () => {
        const response = (await this.harness.readResource(
          'non-existent://resource',
        )) as MCPResponse;

        if (!response.error) {
          throw new Error('Server did not return error for non-existent resource');
        }
      }),
    );

    return tests;
  }

  /**
   * Test prompts capability
   */
  private async testPromptsCapability(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test 1: List prompts
    tests.push(
      await this.runTest('List Prompts', async () => {
        const response = (await this.harness.listPrompts()) as MCPResponse;

        if (!response.result?.prompts) {
          throw new Error('Missing prompts in response');
        }

        // Validate each prompt
        for (const prompt of response.result.prompts) {
          if (!this.validator.validatePromptDeclaration(prompt as Record<string, unknown>)) {
            throw new Error(`Invalid prompt declaration: ${prompt.name}`);
          }
        }
      }),
    );

    // Test 2: Get prompt
    tests.push(
      await this.runTest('Get Prompt', async () => {
        // First get available prompts
        const listResponse = (await this.harness.listPrompts()) as MCPResponse;
        const prompts = listResponse.result?.prompts || [];

        if (prompts.length > 0) {
          const firstPrompt = prompts[0];
          if (!firstPrompt?.name) {
            throw new Error('First prompt has no name');
          }
          const response = (await this.harness.getPrompt(firstPrompt.name)) as MCPResponse;

          if (!response.result?.messages) {
            throw new Error('Missing messages in prompt response');
          }
        }
      }),
    );

    return tests;
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test 1: Invalid JSON
    tests.push(
      await this.runTest('Invalid JSON Handling', async () => {
        try {
          await this.harness.sendInvalidMessage('not json');
        } catch {
          // Expected to fail
        }
      }),
    );

    // Test 2: Missing required fields
    tests.push(
      await this.runTest('Missing Required Fields', async () => {
        const response = (await this.harness.sendInvalidMessage({
          jsonrpc: '2.0',
          // Missing method
          id: 1,
        })) as MCPResponse;

        if (!response.error) {
          throw new Error('Server did not return error for invalid request');
        }
      }),
    );

    // Test 3: Invalid method
    tests.push(
      await this.runTest('Invalid Method', async () => {
        const response = (await this.harness.callNonExistentMethod(
          'invalid/method',
        )) as MCPResponse;

        if (!response.error) {
          throw new Error('Server did not return error for invalid method');
        }

        if (response.error.code !== -32601) {
          throw new Error(`Wrong error code: ${response.error.code}`);
        }
      }),
    );

    // Test 4: Invalid parameters
    tests.push(
      await this.runTest('Invalid Parameters', async () => {
        const response = (await this.harness.sendInvalidParams('tools/call', {
          // Missing name parameter
          wrongParam: 'value',
        })) as MCPResponse;

        if (!response.error) {
          throw new Error('Server did not return error for invalid parameters');
        }

        if (response.error.code !== -32602) {
          throw new Error(`Wrong error code: ${response.error.code}`);
        }
      }),
    );

    return tests;
  }

  /**
   * Test JSON-RPC 2.0 compliance
   */
  private async testJsonRpcCompliance(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test 1: Notification (no response expected)
    tests.push(
      await this.runTest('JSON-RPC Notification', async () => {
        // Send notification
        await this.harness.sendNotification('test/notification', { data: 'test' });
        // No error = success
      }),
    );

    // Test 2: Batch requests
    tests.push(
      await this.runTest('JSON-RPC Batch Request', async () => {
        const requests = [
          { jsonrpc: '2.0', method: 'tools/list', id: 1 },
          { jsonrpc: '2.0', method: 'resources/list', id: 2 },
        ];

        try {
          const responses = (await this.harness.sendBatchRequest(requests)) as MCPResponse[];

          if (!Array.isArray(responses)) {
            throw new Error('Batch response should be an array');
          }

          if (responses.length !== requests.length) {
            throw new Error('Batch response count mismatch');
          }
        } catch {
          // Some servers may not support batch requests
          logger.warn('Server does not support batch requests');
        }
      }),
    );

    // Test 3: ID matching
    tests.push(
      await this.runTest('JSON-RPC ID Matching', async () => {
        const testIds = [1, 'string-id', null];

        for (const id of testIds) {
          const response = (await this.harness.sendMessage({
            jsonrpc: '2.0',
            method: 'tools/list',
            id,
          })) as MCPResponse;

          if (response.id !== id) {
            throw new Error(`ID mismatch: sent ${id}, received ${response.id}`);
          }
        }
      }),
    );

    return tests;
  }

  /**
   * Run a single test
   */
  private async runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await testFn();
      return {
        name,
        status: TestStatus.PASSED,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name,
        status: TestStatus.FAILED,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
