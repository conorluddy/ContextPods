/**
 * Unit tests for MCP Protocol Compliance Testing
 * Tests the functionality of the MCP compliance test suite
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { MCPComplianceTestSuite } from '../../src/protocol/compliance.js';
import { MCPMessageTestHarness } from '../../src/protocol/messages.js';
import { MCPProtocolValidator } from '../../src/protocol/validator.js';
import { TestStatus } from '../../src/types.js';

// Mock dependencies
vi.mock('../../src/protocol/messages.js', () => ({
  MCPMessageTestHarness: vi.fn(),
}));

vi.mock('../../src/protocol/validator.js', () => ({
  MCPProtocolValidator: vi.fn(),
}));

vi.mock('@context-pods/core', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('MCPComplianceTestSuite', () => {
  let complianceSuite: MCPComplianceTestSuite;
  let mockHarness: {
    startServer: Mock;
    stopServer: Mock;
    initialize: Mock;
    listTools: Mock;
    callTool: Mock;
    listResources: Mock;
    readResource: Mock;
    listPrompts: Mock;
    getPrompt: Mock;
    sendInvalidMessage: Mock;
    callNonExistentMethod: Mock;
    sendInvalidParams: Mock;
    sendNotification: Mock;
    sendBatchRequest: Mock;
    sendMessage: Mock;
  };
  let mockValidator: {
    validateMessage: Mock;
    validateToolDeclaration: Mock;
    validateResourceDeclaration: Mock;
    validatePromptDeclaration: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock harness
    mockHarness = {
      startServer: vi.fn(),
      stopServer: vi.fn(),
      initialize: vi.fn(),
      listTools: vi.fn(),
      callTool: vi.fn(),
      listResources: vi.fn(),
      readResource: vi.fn(),
      listPrompts: vi.fn(),
      getPrompt: vi.fn(),
      sendInvalidMessage: vi.fn(),
      callNonExistentMethod: vi.fn(),
      sendInvalidParams: vi.fn(),
      sendNotification: vi.fn(),
      sendBatchRequest: vi.fn(),
      sendMessage: vi.fn(),
    };

    // Create mock validator
    mockValidator = {
      validateMessage: vi.fn(),
      validateToolDeclaration: vi.fn(),
      validateResourceDeclaration: vi.fn(),
      validatePromptDeclaration: vi.fn(),
    };

    // Mock constructors
    vi.mocked(MCPMessageTestHarness).mockImplementation(() => mockHarness as any);
    vi.mocked(MCPProtocolValidator).mockImplementation(() => mockValidator as any);

    // Set up default successful responses
    mockValidator.validateMessage.mockReturnValue({ valid: true });
    mockValidator.validateToolDeclaration.mockReturnValue(true);
    mockValidator.validateResourceDeclaration.mockReturnValue(true);
    mockValidator.validatePromptDeclaration.mockReturnValue(true);

    // Create compliance suite instance
    complianceSuite = new MCPComplianceTestSuite('/path/to/server', false);
  });

  describe('Constructor', () => {
    it('should create harness with correct configuration', () => {
      expect(MCPMessageTestHarness).toHaveBeenCalledWith({
        serverPath: '/path/to/server',
        transport: 'stdio',
        timeout: 5000,
        debug: false,
      });
    });

    it('should create harness with debug enabled', () => {
      new MCPComplianceTestSuite('/path/to/debug-server', true);

      expect(MCPMessageTestHarness).toHaveBeenCalledWith({
        serverPath: '/path/to/debug-server',
        transport: 'stdio',
        timeout: 5000,
        debug: true,
      });
    });

    it('should create protocol validator', () => {
      expect(MCPProtocolValidator).toHaveBeenCalled();
    });
  });

  describe('Full Test Suite', () => {
    it('should run complete test suite successfully', async () => {
      // Set up successful initialization
      mockHarness.initialize.mockResolvedValue({
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'Test Server', version: '1.0.0' },
          capabilities: { tools: {}, resources: {}, prompts: {} },
        },
      });

      // Set up successful tool listing
      mockHarness.listTools.mockResolvedValue({
        result: {
          tools: [
            { name: 'test-tool', description: 'A test tool', inputSchema: {} },
          ],
        },
      });

      // Set up successful tool call
      mockHarness.callTool.mockResolvedValue({
        result: {
          content: [{ type: 'text', text: 'Tool result' }],
        },
      });

      // Set up successful resource listing
      mockHarness.listResources.mockResolvedValue({
        result: {
          resources: [
            { uri: 'test://resource', name: 'Test Resource', mimeType: 'text/plain' },
          ],
        },
      });

      // Set up successful resource reading
      mockHarness.readResource.mockResolvedValue({
        result: {
          contents: [{ uri: 'test://resource', mimeType: 'text/plain', text: 'Resource content' }],
        },
      });

      // Set up successful prompt listing
      mockHarness.listPrompts.mockResolvedValue({
        result: {
          prompts: [
            { name: 'test-prompt', description: 'A test prompt' },
          ],
        },
      });

      // Set up successful prompt getting
      mockHarness.getPrompt.mockResolvedValue({
        result: {
          messages: [{ role: 'user', content: { type: 'text', text: 'Test prompt' } }],
        },
      });

      // Set up error responses for error handling tests
      mockHarness.callTool.mockResolvedValueOnce({
        result: { content: [{ type: 'text', text: 'Tool result' }] },
      }).mockResolvedValueOnce({
        error: { code: -32601, message: 'Method not found' },
      });

      mockHarness.readResource.mockResolvedValueOnce({
        result: { contents: [{ uri: 'test://resource', mimeType: 'text/plain', text: 'Content' }] },
      }).mockResolvedValueOnce({
        error: { code: -32000, message: 'Resource not found' },
      });

      mockHarness.sendInvalidMessage.mockResolvedValue({
        error: { code: -32700, message: 'Parse error' },
      });

      mockHarness.callNonExistentMethod.mockResolvedValue({
        error: { code: -32601, message: 'Method not found' },
      });

      mockHarness.sendInvalidParams.mockResolvedValue({
        error: { code: -32602, message: 'Invalid params' },
      });

      mockHarness.sendBatchRequest.mockResolvedValue([
        { id: 1, result: { tools: [] } },
        { id: 2, result: { resources: [] } },
      ]);

      mockHarness.sendMessage.mockResolvedValue({
        id: 1,
        result: { tools: [] },
      });

      const result = await complianceSuite.runFullSuite();

      expect(result.name).toBe('MCP Compliance Test Suite');
      expect(result.tests.length).toBeGreaterThan(0);
      expect(result.passed).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);

      // Verify server lifecycle
      expect(mockHarness.startServer).toHaveBeenCalled();
      expect(mockHarness.stopServer).toHaveBeenCalled();
    });

    it('should handle server startup failure', async () => {
      mockHarness.startServer.mockRejectedValue(new Error('Server failed to start'));

      const result = await complianceSuite.runFullSuite();

      expect(result.failed).toBeGreaterThan(0);
      expect(result.tests.some(t => t.error === 'Server failed to start')).toBe(true);
      expect(mockHarness.stopServer).toHaveBeenCalled();
    });

    it('should handle test execution errors gracefully', async () => {
      mockHarness.initialize.mockRejectedValue(new Error('Initialization failed'));

      const result = await complianceSuite.runFullSuite();

      expect(result.tests.length).toBeGreaterThan(0);
      expect(result.failed).toBeGreaterThan(0);
    });
  });

  describe('Initialization Tests', () => {
    beforeEach(() => {
      mockHarness.startServer.mockResolvedValue(undefined);
    });

    it('should test basic initialization successfully', async () => {
      mockHarness.initialize.mockResolvedValue({
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'Test Server', version: '1.0.0' },
          capabilities: {},
        },
      });

      const result = await complianceSuite.runFullSuite();
      const initTest = result.tests.find(t => t.name === 'Basic Initialization');

      expect(initTest?.status).toBe(TestStatus.PASSED);
    });

    it('should fail when protocol version is missing', async () => {
      mockHarness.initialize.mockResolvedValue({
        result: {
          serverInfo: { name: 'Test Server' },
        },
      });

      const result = await complianceSuite.runFullSuite();
      const initTest = result.tests.find(t => t.name === 'Basic Initialization');

      expect(initTest?.status).toBe(TestStatus.FAILED);
      expect(initTest?.error).toContain('Missing protocol version');
    });

    it('should test capability negotiation', async () => {
      mockHarness.initialize.mockResolvedValue({
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'Test Server' },
          capabilities: { tools: {} },
        },
      });

      const result = await complianceSuite.runFullSuite();
      const capTest = result.tests.find(t => t.name === 'Capability Negotiation');

      expect(capTest?.status).toBe(TestStatus.PASSED);
      expect(mockHarness.initialize).toHaveBeenCalledWith({
        tools: false,
        resources: true,
        prompts: false,
      });
    });

    it('should test double initialization prevention', async () => {
      mockHarness.initialize
        .mockResolvedValueOnce({
          result: { protocolVersion: '2024-11-05', serverInfo: { name: 'Test' } },
        })
        .mockResolvedValueOnce({
          result: { protocolVersion: '2024-11-05', serverInfo: { name: 'Test' } },
        })
        .mockResolvedValueOnce({
          error: { code: -32000, message: 'Already initialized' },
        });

      const result = await complianceSuite.runFullSuite();
      const doubleInitTest = result.tests.find(t => t.name === 'Double Initialization Prevention');

      expect(doubleInitTest?.status).toBe(TestStatus.PASSED);
    });
  });

  describe('Tools Capability Tests', () => {
    beforeEach(() => {
      mockHarness.startServer.mockResolvedValue(undefined);
      mockHarness.initialize.mockResolvedValue({
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'Test Server' },
          capabilities: { tools: {} },
        },
      });
    });

    it('should test tool listing successfully', async () => {
      mockHarness.listTools.mockResolvedValue({
        result: {
          tools: [
            { name: 'test-tool', description: 'A test tool', inputSchema: {} },
          ],
        },
      });

      const result = await complianceSuite.runFullSuite();
      const listTest = result.tests.find(t => t.name === 'List Tools');

      expect(listTest?.status).toBe(TestStatus.PASSED);
      expect(mockValidator.validateToolDeclaration).toHaveBeenCalled();
    });

    it('should fail when tools response is invalid', async () => {
      mockHarness.listTools.mockResolvedValue({
        result: {}, // Missing tools array
      });

      const result = await complianceSuite.runFullSuite();
      const listTest = result.tests.find(t => t.name === 'List Tools');

      expect(listTest?.status).toBe(TestStatus.FAILED);
      expect(listTest?.error).toContain('Missing tools');
    });

    it('should test tool calling with valid tool', async () => {
      mockHarness.listTools.mockResolvedValue({
        result: {
          tools: [{ name: 'test-tool', description: 'Test', inputSchema: {} }],
        },
      });

      mockHarness.callTool.mockResolvedValue({
        result: {
          content: [{ type: 'text', text: 'Tool executed' }],
        },
      });

      const result = await complianceSuite.runFullSuite();
      const callTest = result.tests.find(t => t.name === 'Call Tool');

      expect(callTest?.status).toBe(TestStatus.PASSED);
      expect(mockHarness.callTool).toHaveBeenCalledWith('test-tool');
    });

    it('should test non-existent tool call error handling', async () => {
      mockHarness.listTools.mockResolvedValue({ result: { tools: [] } });
      mockHarness.callTool.mockResolvedValue({
        error: { code: -32601, message: 'Method not found' },
      });

      const result = await complianceSuite.runFullSuite();
      const errorTest = result.tests.find(t => t.name === 'Call Non-Existent Tool');

      expect(errorTest?.status).toBe(TestStatus.PASSED);
    });
  });

  describe('Resources Capability Tests', () => {
    beforeEach(() => {
      mockHarness.startServer.mockResolvedValue(undefined);
      mockHarness.initialize.mockResolvedValue({
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'Test Server' },
          capabilities: { resources: {} },
        },
      });
    });

    it('should test resource listing successfully', async () => {
      mockHarness.listResources.mockResolvedValue({
        result: {
          resources: [
            { uri: 'test://resource', name: 'Test Resource', mimeType: 'text/plain' },
          ],
        },
      });

      const result = await complianceSuite.runFullSuite();
      const listTest = result.tests.find(t => t.name === 'List Resources');

      expect(listTest?.status).toBe(TestStatus.PASSED);
      expect(mockValidator.validateResourceDeclaration).toHaveBeenCalled();
    });

    it('should test resource reading with valid resource', async () => {
      mockHarness.listResources.mockResolvedValue({
        result: {
          resources: [{ uri: 'test://resource', name: 'Test', mimeType: 'text/plain' }],
        },
      });

      mockHarness.readResource.mockResolvedValue({
        result: {
          contents: [{ uri: 'test://resource', mimeType: 'text/plain', text: 'Content' }],
        },
      });

      const result = await complianceSuite.runFullSuite();
      const readTest = result.tests.find(t => t.name === 'Read Resource');

      expect(readTest?.status).toBe(TestStatus.PASSED);
      expect(mockHarness.readResource).toHaveBeenCalledWith('test://resource');
    });

    it('should test non-existent resource error handling', async () => {
      mockHarness.listResources.mockResolvedValue({ result: { resources: [] } });
      mockHarness.readResource.mockResolvedValue({
        error: { code: -32000, message: 'Resource not found' },
      });

      const result = await complianceSuite.runFullSuite();
      const errorTest = result.tests.find(t => t.name === 'Read Non-Existent Resource');

      expect(errorTest?.status).toBe(TestStatus.PASSED);
    });
  });

  describe('Prompts Capability Tests', () => {
    beforeEach(() => {
      mockHarness.startServer.mockResolvedValue(undefined);
      mockHarness.initialize.mockResolvedValue({
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'Test Server' },
          capabilities: { prompts: {} },
        },
      });
    });

    it('should test prompt listing successfully', async () => {
      mockHarness.listPrompts.mockResolvedValue({
        result: {
          prompts: [
            { name: 'test-prompt', description: 'A test prompt' },
          ],
        },
      });

      const result = await complianceSuite.runFullSuite();
      const listTest = result.tests.find(t => t.name === 'List Prompts');

      expect(listTest?.status).toBe(TestStatus.PASSED);
      expect(mockValidator.validatePromptDeclaration).toHaveBeenCalled();
    });

    it('should test prompt getting with valid prompt', async () => {
      mockHarness.listPrompts.mockResolvedValue({
        result: {
          prompts: [{ name: 'test-prompt', description: 'Test' }],
        },
      });

      mockHarness.getPrompt.mockResolvedValue({
        result: {
          messages: [{ role: 'user', content: { type: 'text', text: 'Prompt content' } }],
        },
      });

      const result = await complianceSuite.runFullSuite();
      const getTest = result.tests.find(t => t.name === 'Get Prompt');

      expect(getTest?.status).toBe(TestStatus.PASSED);
      expect(mockHarness.getPrompt).toHaveBeenCalledWith('test-prompt');
    });
  });

  describe('Error Handling Tests', () => {
    beforeEach(() => {
      mockHarness.startServer.mockResolvedValue(undefined);
      mockHarness.initialize.mockResolvedValue({
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'Test Server' },
          capabilities: {},
        },
      });
    });

    it('should test invalid JSON handling', async () => {
      mockHarness.sendInvalidMessage.mockRejectedValue(new Error('Parse error'));

      const result = await complianceSuite.runFullSuite();
      const jsonTest = result.tests.find(t => t.name === 'Invalid JSON Handling');

      expect(jsonTest?.status).toBe(TestStatus.PASSED);
    });

    it('should test missing required fields', async () => {
      mockHarness.sendInvalidMessage.mockResolvedValue({
        error: { code: -32600, message: 'Invalid request' },
      });

      const result = await complianceSuite.runFullSuite();
      const fieldsTest = result.tests.find(t => t.name === 'Missing Required Fields');

      expect(fieldsTest?.status).toBe(TestStatus.PASSED);
    });

    it('should test invalid method error', async () => {
      mockHarness.callNonExistentMethod.mockResolvedValue({
        error: { code: -32601, message: 'Method not found' },
      });

      const result = await complianceSuite.runFullSuite();
      const methodTest = result.tests.find(t => t.name === 'Invalid Method');

      expect(methodTest?.status).toBe(TestStatus.PASSED);
    });

    it('should test invalid parameters error', async () => {
      mockHarness.sendInvalidParams.mockResolvedValue({
        error: { code: -32602, message: 'Invalid params' },
      });

      const result = await complianceSuite.runFullSuite();
      const paramsTest = result.tests.find(t => t.name === 'Invalid Parameters');

      expect(paramsTest?.status).toBe(TestStatus.PASSED);
    });
  });

  describe('JSON-RPC Compliance Tests', () => {
    beforeEach(() => {
      mockHarness.startServer.mockResolvedValue(undefined);
      mockHarness.initialize.mockResolvedValue({
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'Test Server' },
          capabilities: {},
        },
      });
    });

    it('should test notification handling', async () => {
      mockHarness.sendNotification.mockResolvedValue(undefined);

      const result = await complianceSuite.runFullSuite();
      const notificationTest = result.tests.find(t => t.name === 'JSON-RPC Notification');

      expect(notificationTest?.status).toBe(TestStatus.PASSED);
      expect(mockHarness.sendNotification).toHaveBeenCalledWith('test/notification', { data: 'test' });
    });

    it('should test batch request handling', async () => {
      mockHarness.sendBatchRequest.mockResolvedValue([
        { id: 1, result: { tools: [] } },
        { id: 2, result: { resources: [] } },
      ]);

      const result = await complianceSuite.runFullSuite();
      const batchTest = result.tests.find(t => t.name === 'JSON-RPC Batch Request');

      expect(batchTest?.status).toBe(TestStatus.PASSED);
    });

    it('should test ID matching for different ID types', async () => {
      mockHarness.sendMessage
        .mockResolvedValueOnce({ id: 1, result: { tools: [] } })
        .mockResolvedValueOnce({ id: 'string-id', result: { tools: [] } })
        .mockResolvedValueOnce({ id: null, result: { tools: [] } });

      const result = await complianceSuite.runFullSuite();
      const idTest = result.tests.find(t => t.name === 'JSON-RPC ID Matching');

      expect(idTest?.status).toBe(TestStatus.PASSED);
      expect(mockHarness.sendMessage).toHaveBeenCalledTimes(3 + 2); // +2 for other tests
    });

    it('should fail ID matching when IDs dont match', async () => {
      mockHarness.sendMessage.mockResolvedValue({ id: 999, result: { tools: [] } });

      const result = await complianceSuite.runFullSuite();
      const idTest = result.tests.find(t => t.name === 'JSON-RPC ID Matching');

      expect(idTest?.status).toBe(TestStatus.FAILED);
      expect(idTest?.error).toContain('ID mismatch');
    });
  });

  describe('Test Suite Statistics', () => {
    it('should calculate test statistics correctly', async () => {
      // Set up mixed results
      mockHarness.startServer.mockResolvedValue(undefined);
      mockHarness.initialize
        .mockResolvedValueOnce({
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'Test Server' },
            capabilities: {},
          },
        })
        .mockRejectedValueOnce(new Error('Capability test failed'))
        .mockResolvedValueOnce({
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'Test Server' },
            capabilities: {},
          },
        });

      mockHarness.listTools.mockResolvedValue({ result: {} }); // Will fail
      mockHarness.listResources.mockResolvedValue({ result: { resources: [] } });
      mockHarness.listPrompts.mockResolvedValue({ result: { prompts: [] } });

      const result = await complianceSuite.runFullSuite();

      expect(result.passed + result.failed + result.skipped).toBe(result.tests.length);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle all tests failing', async () => {
      mockHarness.startServer.mockRejectedValue(new Error('Complete failure'));

      const result = await complianceSuite.runFullSuite();

      expect(result.failed).toBeGreaterThan(0);
      expect(result.passed).toBe(0);
      expect(result.tests.some(t => t.status === TestStatus.FAILED)).toBe(true);
    });
  });
});