/**
 * MCP Protocol Compliance Tests
 * Validates that server responses conform to MCP protocol standards
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  type CallToolRequest,
  type ListToolsRequest,
  type ListResourcesRequest,
  type ReadResourceRequest,
  type CallToolResult,
  type ListToolsResult,
  type ListResourcesResult,
  type ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Response Validation Schemas
 */
const MCPTextContentSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

const MCPImageContentSchema = z.object({
  type: z.literal('image'),
  data: z.string(),
  mimeType: z.string(),
});

const MCPContentSchema = z.union([MCPTextContentSchema, MCPImageContentSchema]);

const CallToolResultSchema = z.object({
  content: z.array(MCPContentSchema).min(1),
  isError: z.boolean().optional(),
});

const ToolDefinitionSchema = z.object({
  name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/),
  description: z.string().optional(),
  inputSchema: z
    .object({
      type: z.literal('object'),
      properties: z.record(z.any()).optional(),
      required: z.array(z.string()).optional(),
      additionalProperties: z.boolean().optional(),
    })
    .optional(),
});

const ListToolsResultSchema = z.object({
  tools: z.array(ToolDefinitionSchema),
});

const ResourceDefinitionSchema = z.object({
  uri: z
    .string()
    .url()
    .or(z.string().regex(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/.+/)),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});

const ListResourcesResultSchema = z.object({
  resources: z.array(ResourceDefinitionSchema),
});

const ReadResourceResultSchema = z.object({
  contents: z.array(MCPContentSchema).min(1),
});

const MCPErrorSchema = z.object({
  code: z.nativeEnum(ErrorCode),
  message: z.string(),
  data: z.any().optional(),
});

describe('MCP Protocol Compliance', () => {
  describe('Request Schema Validation', () => {
    it('should validate ListToolsRequest structure', () => {
      const validRequest: ListToolsRequest = {
        method: 'tools/list',
      };

      const result = ListToolsRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate CallToolRequest structure', () => {
      const validRequest: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: { input: 'test' },
        },
      };

      const result = CallToolRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate ListResourcesRequest structure', () => {
      const validRequest: ListResourcesRequest = {
        method: 'resources/list',
      };

      const result = ListResourcesRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate ReadResourceRequest structure', () => {
      const validRequest: ReadResourceRequest = {
        method: 'resources/read',
        params: {
          uri: 'test://resource',
        },
      };

      const result = ReadResourceRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('Response Schema Validation', () => {
    describe('CallToolResult', () => {
      it('should validate successful tool response with text content', () => {
        const response: CallToolResult = {
          content: [
            {
              type: 'text',
              text: 'Tool executed successfully',
            },
          ],
        };

        const result = CallToolResultSchema.safeParse(response);
        expect(result.success).toBe(true);
      });

      it('should validate tool response with multiple content items', () => {
        const response: CallToolResult = {
          content: [
            {
              type: 'text',
              text: 'Processing started',
            },
            {
              type: 'text',
              text: 'Result: success',
            },
          ],
        };

        const result = CallToolResultSchema.safeParse(response);
        expect(result.success).toBe(true);
      });

      it('should validate tool response with image content', () => {
        const response: CallToolResult = {
          content: [
            {
              type: 'image',
              data: 'base64encodeddata',
              mimeType: 'image/png',
            },
          ],
        };

        const result = CallToolResultSchema.safeParse(response);
        expect(result.success).toBe(true);
      });

      it('should validate error tool response', () => {
        const response: CallToolResult = {
          content: [
            {
              type: 'text',
              text: 'Error: Tool execution failed',
            },
          ],
          isError: true,
        };

        const result = CallToolResultSchema.safeParse(response);
        expect(result.success).toBe(true);
      });

      it('should reject empty content array', () => {
        const response = {
          content: [],
        };

        const result = CallToolResultSchema.safeParse(response);
        expect(result.success).toBe(false);
      });

      it('should reject invalid content type', () => {
        const response = {
          content: [
            {
              type: 'invalid',
              data: 'test',
            },
          ],
        };

        const result = CallToolResultSchema.safeParse(response);
        expect(result.success).toBe(false);
      });
    });

    describe('ListToolsResult', () => {
      it('should validate tools list with complete tool definitions', () => {
        const response: ListToolsResult = {
          tools: [
            {
              name: 'create-file',
              description: 'Creates a new file',
              inputSchema: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  content: { type: 'string' },
                },
                required: ['path', 'content'],
              },
            },
            {
              name: 'read_file',
              description: 'Reads a file',
              inputSchema: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                },
                required: ['path'],
              },
            },
          ],
        };

        const result = ListToolsResultSchema.safeParse(response);
        expect(result.success).toBe(true);
      });

      it('should validate minimal tool definition', () => {
        const response: ListToolsResult = {
          tools: [
            {
              name: 'simple-tool',
            },
          ],
        };

        const result = ListToolsResultSchema.safeParse(response);
        expect(result.success).toBe(true);
      });

      it('should validate empty tools array', () => {
        const response: ListToolsResult = {
          tools: [],
        };

        const result = ListToolsResultSchema.safeParse(response);
        expect(result.success).toBe(true);
      });

      it('should reject invalid tool names', () => {
        const response = {
          tools: [
            {
              name: '123-invalid', // Must start with letter
            },
          ],
        };

        const result = ListToolsResultSchema.safeParse(response);
        expect(result.success).toBe(false);
      });

      it('should reject invalid input schema type', () => {
        const response = {
          tools: [
            {
              name: 'test-tool',
              inputSchema: {
                type: 'array', // Must be 'object'
              },
            },
          ],
        };

        const result = ListToolsResultSchema.safeParse(response);
        expect(result.success).toBe(false);
      });
    });

    describe('ListResourcesResult', () => {
      it('should validate resources list with complete definitions', () => {
        const response: ListResourcesResult = {
          resources: [
            {
              uri: 'file://config.json',
              name: 'Configuration',
              description: 'Application configuration',
              mimeType: 'application/json',
            },
            {
              uri: 'https://api.example.com/data',
              name: 'API Data',
              description: 'External API data',
              mimeType: 'application/json',
            },
          ],
        };

        const result = ListResourcesResultSchema.safeParse(response);
        expect(result.success).toBe(true);
      });

      it('should validate custom URI schemes', () => {
        const response: ListResourcesResult = {
          resources: [
            {
              uri: 'context-pods://registry',
              name: 'Registry',
            },
            {
              uri: 'mcp+test://resource',
              name: 'Test Resource',
            },
          ],
        };

        const result = ListResourcesResultSchema.safeParse(response);
        expect(result.success).toBe(true);
      });

      it('should validate minimal resource definition', () => {
        const response: ListResourcesResult = {
          resources: [
            {
              uri: 'test://minimal',
              name: 'Minimal Resource',
            },
          ],
        };

        const result = ListResourcesResultSchema.safeParse(response);
        expect(result.success).toBe(true);
      });

      it('should reject invalid URI format', () => {
        const response = {
          resources: [
            {
              uri: 'not a valid uri',
              name: 'Invalid',
            },
          ],
        };

        const result = ListResourcesResultSchema.safeParse(response);
        expect(result.success).toBe(false);
      });
    });

    describe('ReadResourceResult', () => {
      it('should validate resource content with text', () => {
        const response: ReadResourceResult = {
          contents: [
            {
              type: 'text',
              text: '{"config": "value"}',
            },
          ],
        };

        const result = ReadResourceResultSchema.safeParse(response);
        expect(result.success).toBe(true);
      });

      it('should validate resource content with multiple items', () => {
        const response: ReadResourceResult = {
          contents: [
            {
              type: 'text',
              text: 'Part 1',
            },
            {
              type: 'text',
              text: 'Part 2',
            },
          ],
        };

        const result = ReadResourceResultSchema.safeParse(response);
        expect(result.success).toBe(true);
      });

      it('should reject empty contents array', () => {
        const response = {
          contents: [],
        };

        const result = ReadResourceResultSchema.safeParse(response);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Error Response Validation', () => {
    it('should validate MCP error with all fields', () => {
      const error = {
        code: ErrorCode.MethodNotFound,
        message: 'Unknown method: test/invalid',
        data: { method: 'test/invalid' },
      };

      const result = MCPErrorSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it('should validate minimal MCP error', () => {
      const error = {
        code: ErrorCode.InvalidRequest,
        message: 'Missing required parameter',
      };

      const result = MCPErrorSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it('should validate all error codes', () => {
      const errorCodes = [
        ErrorCode.ParseError,
        ErrorCode.InvalidRequest,
        ErrorCode.MethodNotFound,
        ErrorCode.InvalidParams,
        ErrorCode.InternalError,
      ];

      errorCodes.forEach((code) => {
        const error = {
          code,
          message: 'Test error',
        };

        const result = MCPErrorSchema.safeParse(error);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Protocol Constraints', () => {
    it('should enforce tool name constraints', () => {
      const validNames = ['tool', 'tool-name', 'tool_name', 'toolName123', 'T001'];

      const invalidNames = [
        '123tool', // Starts with number
        '_tool', // Starts with underscore
        '-tool', // Starts with hyphen
        'tool name', // Contains space
        'tool@name', // Contains invalid character
        '', // Empty string
      ];

      validNames.forEach((name) => {
        const tool = { name };
        const result = ToolDefinitionSchema.safeParse(tool);
        expect(result.success).toBe(true);
      });

      invalidNames.forEach((name) => {
        const tool = { name };
        const result = ToolDefinitionSchema.safeParse(tool);
        expect(result.success).toBe(false);
      });
    });

    it('should enforce content type constraints', () => {
      const validContent = [
        { type: 'text', text: 'Hello' },
        { type: 'image', data: 'base64', mimeType: 'image/png' },
      ];

      const invalidContent = [
        { type: 'video', data: 'test' }, // Invalid type
        { type: 'text' }, // Missing required text field
        { type: 'image', data: 'test' }, // Missing mimeType
        { type: 'image', mimeType: 'image/png' }, // Missing data
      ];

      validContent.forEach((content) => {
        const result = MCPContentSchema.safeParse(content);
        expect(result.success).toBe(true);
      });

      invalidContent.forEach((content) => {
        const result = MCPContentSchema.safeParse(content);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should validate complete tool workflow', () => {
      // 1. List tools request/response
      const listRequest: ListToolsRequest = { method: 'tools/list' };
      expect(ListToolsRequestSchema.safeParse(listRequest).success).toBe(true);

      const listResponse: ListToolsResult = {
        tools: [
          {
            name: 'process-data',
            description: 'Processes input data',
            inputSchema: {
              type: 'object',
              properties: {
                data: { type: 'string' },
              },
              required: ['data'],
            },
          },
        ],
      };
      expect(ListToolsResultSchema.safeParse(listResponse).success).toBe(true);

      // 2. Call tool request/response
      const callRequest: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'process-data',
          arguments: { data: 'test input' },
        },
      };
      expect(CallToolRequestSchema.safeParse(callRequest).success).toBe(true);

      const callResponse: CallToolResult = {
        content: [
          {
            type: 'text',
            text: 'Processed: test input',
          },
        ],
      };
      expect(CallToolResultSchema.safeParse(callResponse).success).toBe(true);
    });

    it('should validate complete resource workflow', () => {
      // 1. List resources request/response
      const listRequest: ListResourcesRequest = { method: 'resources/list' };
      expect(ListResourcesRequestSchema.safeParse(listRequest).success).toBe(true);

      const listResponse: ListResourcesResult = {
        resources: [
          {
            uri: 'file://data.json',
            name: 'Data File',
            mimeType: 'application/json',
          },
        ],
      };
      expect(ListResourcesResultSchema.safeParse(listResponse).success).toBe(true);

      // 2. Read resource request/response
      const readRequest: ReadResourceRequest = {
        method: 'resources/read',
        params: {
          uri: 'file://data.json',
        },
      };
      expect(ReadResourceRequestSchema.safeParse(readRequest).success).toBe(true);

      const readResponse: ReadResourceResult = {
        contents: [
          {
            type: 'text',
            text: '{"key": "value"}',
          },
        ],
      };
      expect(ReadResourceResultSchema.safeParse(readResponse).success).toBe(true);
    });
  });
});
