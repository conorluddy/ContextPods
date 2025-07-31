/**
 * Unit tests for BaseTool class
 * Tests the foundation class for all MCP server tools
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { BaseTool, type ToolResult, type MCPToolResponse } from '../../../src/tools/base-tool.js';
import { logger } from '@context-pods/core';

// Mock the logger
vi.mock('@context-pods/core', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

/**
 * Test implementation of BaseTool
 */
class TestTool extends BaseTool {
  private mockExecute: Mock;
  private mockValidate: Mock | null;

  constructor(
    name = 'test-tool',
    mockExecute?: Mock,
    mockValidate?: Mock
  ) {
    super(name);
    this.mockExecute = mockExecute || vi.fn().mockResolvedValue({ success: true });
    this.mockValidate = mockValidate || null;
  }

  protected async execute(args: unknown): Promise<ToolResult> {
    return this.mockExecute(args);
  }

  protected async validateArguments(args: unknown): Promise<string | null> {
    if (this.mockValidate) {
      return this.mockValidate(args);
    }
    return super.validateArguments(args);
  }
}

describe('BaseTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should set tool name correctly', () => {
      const tool = new TestTool('my-custom-tool');
      expect(tool['toolName']).toBe('my-custom-tool');
    });
  });

  describe('safeExecute', () => {
    it('should execute successfully with valid arguments', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        success: true,
        data: 'Tool executed successfully',
      });
      const tool = new TestTool('test-tool', mockExecute);

      const result = await tool.safeExecute({ input: 'test' });

      expect(mockExecute).toHaveBeenCalledWith({ input: 'test' });
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Tool executed successfully');
      expect(logger.info).toHaveBeenCalledWith('Executing tool: test-tool', { args: { input: 'test' } });
    });

    it('should handle validation errors', async () => {
      const mockValidate = vi.fn().mockResolvedValue('Invalid input format');
      const mockExecute = vi.fn();
      const tool = new TestTool('test-tool', mockExecute, mockValidate);

      const result = await tool.safeExecute({ input: 'test' });

      expect(mockExecute).not.toHaveBeenCalled();
      expect(result.content[0].text).toBe('❌ Error in test-tool: Invalid arguments: Invalid input format');
    });

    it('should handle execution errors', async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error('Execution failed'));
      const tool = new TestTool('test-tool', mockExecute);

      const result = await tool.safeExecute({ input: 'test' });

      expect(result.content[0].text).toBe('❌ Error in test-tool: Execution failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Tool execution failed: test-tool',
        expect.objectContaining({
          error: 'Execution failed',
          args: { input: 'test' },
        })
      );
    });

    it('should handle non-Error exceptions', async () => {
      const mockExecute = vi.fn().mockRejectedValue('String error');
      const tool = new TestTool('test-tool', mockExecute);

      const result = await tool.safeExecute({ input: 'test' });

      expect(result.content[0].text).toBe('❌ Error in test-tool: String error');
    });

    it('should measure execution duration', async () => {
      const mockExecute = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );
      const tool = new TestTool('test-tool', mockExecute);

      await tool.safeExecute({});

      expect(logger.info).toHaveBeenCalledWith(
        'Tool executed successfully: test-tool',
        expect.objectContaining({
          duration: expect.any(Number),
        })
      );
    });
  });

  describe('formatResponse', () => {
    it('should format successful response with string data', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        success: true,
        data: 'Operation completed',
      });
      const tool = new TestTool('test-tool', mockExecute);

      const result = await tool.safeExecute({});

      expect(result.content[0].text).toBe('Operation completed');
    });

    it('should format successful response with object data', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        success: true,
        data: { status: 'ready', count: 42 },
      });
      const tool = new TestTool('test-tool', mockExecute);

      const result = await tool.safeExecute({});

      expect(result.content[0].text).toContain('"status": "ready"');
      expect(result.content[0].text).toContain('"count": 42');
    });

    it('should format successful response without data', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        success: true,
      });
      const tool = new TestTool('test-tool', mockExecute);

      const result = await tool.safeExecute({});

      expect(result.content[0].text).toBe('✅ test-tool completed successfully');
    });

    it('should include warnings in response', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        success: true,
        data: 'Operation completed',
        warnings: ['File already exists', 'Using default configuration'],
      });
      const tool = new TestTool('test-tool', mockExecute);

      const result = await tool.safeExecute({});

      expect(result.content[0].text).toContain('Operation completed');
      expect(result.content[0].text).toContain('⚠️ Warnings:');
      expect(result.content[0].text).toContain('- File already exists');
      expect(result.content[0].text).toContain('- Using default configuration');
    });

    it('should handle unsuccessful result', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        success: false,
        error: 'Permission denied',
      });
      const tool = new TestTool('test-tool', mockExecute);

      const result = await tool.safeExecute({});

      expect(result.content[0].text).toBe('❌ Error in test-tool: Permission denied');
    });

    it('should handle unsuccessful result without error message', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        success: false,
      });
      const tool = new TestTool('test-tool', mockExecute);

      const result = await tool.safeExecute({});

      expect(result.content[0].text).toBe('❌ Error in test-tool: Tool execution failed');
    });
  });

  describe('validateArgument', () => {
    class ValidationTestTool extends TestTool {
      async testValidateArgument(
        args: Record<string, unknown>,
        name: string,
        type: 'string' | 'number' | 'boolean' | 'object',
        required = true
      ): Promise<string | null> {
        return this.validateArgument(args, name, type, required);
      }
    }

    it('should validate required string argument', () => {
      const tool = new ValidationTestTool();

      expect(tool.testValidateArgument({ name: 'test' }, 'name', 'string')).resolves.toBeNull();
      expect(tool.testValidateArgument({}, 'name', 'string')).resolves.toBe('Missing required argument: name');
      expect(tool.testValidateArgument({ name: 123 }, 'name', 'string')).resolves.toBe("Argument 'name' must be a string, got number");
    });

    it('should validate optional arguments', () => {
      const tool = new ValidationTestTool();

      expect(tool.testValidateArgument({}, 'optional', 'string', false)).resolves.toBeNull();
      expect(tool.testValidateArgument({ optional: null }, 'optional', 'string', false)).resolves.toBeNull();
    });

    it('should validate number arguments', () => {
      const tool = new ValidationTestTool();

      expect(tool.testValidateArgument({ count: 42 }, 'count', 'number')).resolves.toBeNull();
      expect(tool.testValidateArgument({ count: '42' }, 'count', 'number')).resolves.toBe("Argument 'count' must be a number, got string");
    });

    it('should validate boolean arguments', () => {
      const tool = new ValidationTestTool();

      expect(tool.testValidateArgument({ enabled: true }, 'enabled', 'boolean')).resolves.toBeNull();
      expect(tool.testValidateArgument({ enabled: 'true' }, 'enabled', 'boolean')).resolves.toBe("Argument 'enabled' must be a boolean, got string");
    });

    it('should validate object arguments', () => {
      const tool = new ValidationTestTool();

      expect(tool.testValidateArgument({ config: {} }, 'config', 'object')).resolves.toBeNull();
      expect(tool.testValidateArgument({ config: [] }, 'config', 'object')).resolves.toBe("Argument 'config' must be an object, got array");
      expect(tool.testValidateArgument({ config: 'invalid' }, 'config', 'object')).resolves.toBe("Argument 'config' must be an object, got string");
    });
  });

  describe('validateStringArgument', () => {
    class StringValidationTestTool extends TestTool {
      async testValidateStringArgument(
        args: Record<string, unknown>,
        name: string,
        required = true,
        minLength = 0,
        maxLength = Infinity
      ): Promise<string | null> {
        return this.validateStringArgument(args, name, required, minLength, maxLength);
      }
    }

    it('should validate string with length constraints', () => {
      const tool = new StringValidationTestTool();

      expect(tool.testValidateStringArgument({ name: 'test' }, 'name', true, 3, 10)).resolves.toBeNull();
      expect(tool.testValidateStringArgument({ name: 'ab' }, 'name', true, 3, 10)).resolves.toBe("Argument 'name' must be at least 3 characters long");
      expect(tool.testValidateStringArgument({ name: 'this is too long' }, 'name', true, 3, 10)).resolves.toBe("Argument 'name' must be at most 10 characters long");
    });

    it('should handle non-string values by converting', () => {
      const tool = new StringValidationTestTool();

      // Numbers get converted to strings
      expect(tool.testValidateStringArgument({ name: 123 }, 'name')).resolves.toBe("Argument 'name' must be a string, got number");
    });
  });

  describe('Helper response methods', () => {
    class HelperTestTool extends TestTool {
      testCreateSuccessResponse(text: string): MCPToolResponse {
        return this.createSuccessResponse(text);
      }

      testCreateInfoResponse(text: string): MCPToolResponse {
        return this.createInfoResponse(text);
      }

      testCreateErrorResponse(error: string): MCPToolResponse {
        return this.createErrorResponse(error);
      }
    }

    it('should create success response', () => {
      const tool = new HelperTestTool();
      const response = tool.testCreateSuccessResponse('Operation completed');

      expect(response.content[0].text).toBe('✅ Operation completed');
    });

    it('should create info response', () => {
      const tool = new HelperTestTool();
      const response = tool.testCreateInfoResponse('Processing started');

      expect(response.content[0].text).toBe('Processing started');
    });

    it('should create error response', () => {
      const tool = new HelperTestTool();
      const response = tool.testCreateErrorResponse('File not found');

      expect(response.content[0].text).toBe('❌ Error in test-tool: File not found');
    });
  });

  describe('Abstract method implementation', () => {
    it('should require execute method implementation', () => {
      // This is tested implicitly by TestTool implementation
      const tool = new TestTool();
      expect(tool['execute']).toBeDefined();
      expect(typeof tool['execute']).toBe('function');
    });
  });

  describe('Edge cases', () => {
    it('should handle null arguments', async () => {
      const tool = new TestTool();
      const result = await tool.safeExecute(null);

      expect(result.content[0].text).toContain('✅');
    });

    it('should handle undefined arguments', async () => {
      const tool = new TestTool();
      const result = await tool.safeExecute(undefined);

      expect(result.content[0].text).toContain('✅');
    });

    it('should handle circular reference in data', async () => {
      const circularObj: any = { a: 1 };
      circularObj.self = circularObj;

      const mockExecute = vi.fn().mockResolvedValue({
        success: true,
        data: circularObj,
      });
      const tool = new TestTool('test-tool', mockExecute);

      const result = await tool.safeExecute({});

      // Should not throw, but will have an error response due to JSON.stringify failing
      expect(result.content[0].text).toContain('❌');
    });
  });
});