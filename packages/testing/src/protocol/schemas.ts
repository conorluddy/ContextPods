/**
 * MCP Protocol schemas for validation
 */

import { z } from 'zod';

/**
 * JSON-RPC 2.0 base schemas
 */
export const JsonRpcIdSchema = z.union([z.string(), z.number(), z.null()]);

export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string(),
  params: z.unknown().optional(),
  id: JsonRpcIdSchema,
});

export const JsonRpcResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  result: z.unknown().optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
      data: z.unknown().optional(),
    })
    .optional(),
  id: JsonRpcIdSchema,
});

export const JsonRpcNotificationSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string(),
  params: z.unknown().optional(),
});

/**
 * MCP Protocol message schemas
 */
export const InitializeRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('initialize'),
  params: z.object({
    protocolVersion: z.string(),
    capabilities: z
      .object({
        tools: z.boolean().optional(),
        resources: z.boolean().optional(),
        prompts: z.boolean().optional(),
        logging: z.boolean().optional(),
      })
      .optional(),
    clientInfo: z
      .object({
        name: z.string(),
        version: z.string().optional(),
      })
      .optional(),
  }),
  id: JsonRpcIdSchema,
});

export const InitializeResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  result: z.object({
    protocolVersion: z.string(),
    capabilities: z.object({
      tools: z
        .object({
          listTools: z.boolean().optional(),
          callTool: z.boolean().optional(),
        })
        .optional(),
      resources: z
        .object({
          listResources: z.boolean().optional(),
          readResource: z.boolean().optional(),
          subscribeResource: z.boolean().optional(),
        })
        .optional(),
      prompts: z
        .object({
          listPrompts: z.boolean().optional(),
          getPrompt: z.boolean().optional(),
        })
        .optional(),
      logging: z
        .object({
          setLevel: z.boolean().optional(),
        })
        .optional(),
    }),
    serverInfo: z.object({
      name: z.string(),
      version: z.string().optional(),
    }),
  }),
  id: JsonRpcIdSchema,
});

export const ListToolsRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('tools/list'),
  params: z.object({}).optional(),
  id: JsonRpcIdSchema,
});

export const ListToolsResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  result: z.object({
    tools: z.array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        inputSchema: z.object({
          type: z.literal('object'),
          properties: z.record(z.unknown()).optional(),
          required: z.array(z.string()).optional(),
          additionalProperties: z.boolean().optional(),
        }),
      }),
    ),
  }),
  id: JsonRpcIdSchema,
});

export const CallToolRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('tools/call'),
  params: z.object({
    name: z.string(),
    arguments: z.record(z.unknown()).optional(),
  }),
  id: JsonRpcIdSchema,
});

export const CallToolResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  result: z.object({
    content: z.array(
      z.object({
        type: z.enum(['text', 'image', 'resource']),
        text: z.string().optional(),
        data: z.string().optional(),
        mimeType: z.string().optional(),
        resource: z
          .object({
            uri: z.string(),
            text: z.string().optional(),
            mimeType: z.string().optional(),
          })
          .optional(),
      }),
    ),
    isError: z.boolean().optional(),
  }),
  id: JsonRpcIdSchema,
});

export const ListResourcesRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('resources/list'),
  params: z.object({}).optional(),
  id: JsonRpcIdSchema,
});

export const ListResourcesResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  result: z.object({
    resources: z.array(
      z.object({
        uri: z.string(),
        name: z.string(),
        description: z.string().optional(),
        mimeType: z.string().optional(),
      }),
    ),
  }),
  id: JsonRpcIdSchema,
});

export const ReadResourceRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('resources/read'),
  params: z.object({
    uri: z.string(),
  }),
  id: JsonRpcIdSchema,
});

export const ReadResourceResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  result: z.object({
    contents: z.array(
      z.object({
        uri: z.string(),
        mimeType: z.string().optional(),
        text: z.string().optional(),
        blob: z.string().optional(),
      }),
    ),
  }),
  id: JsonRpcIdSchema,
});

export const ListPromptsRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('prompts/list'),
  params: z.object({}).optional(),
  id: JsonRpcIdSchema,
});

export const ListPromptsResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  result: z.object({
    prompts: z.array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        arguments: z
          .array(
            z.object({
              name: z.string(),
              description: z.string().optional(),
              required: z.boolean().optional(),
            }),
          )
          .optional(),
      }),
    ),
  }),
  id: JsonRpcIdSchema,
});

export const GetPromptRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('prompts/get'),
  params: z.object({
    name: z.string(),
    arguments: z.record(z.string()).optional(),
  }),
  id: JsonRpcIdSchema,
});

export const GetPromptResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  result: z.object({
    description: z.string().optional(),
    messages: z.array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.object({
          type: z.literal('text'),
          text: z.string(),
        }),
      }),
    ),
  }),
  id: JsonRpcIdSchema,
});

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
  }),
  id: JsonRpcIdSchema,
});

/**
 * Complete message type union
 */
export const MCPMessageSchema = z.union([
  InitializeRequestSchema,
  InitializeResponseSchema,
  ListToolsRequestSchema,
  ListToolsResponseSchema,
  CallToolRequestSchema,
  CallToolResponseSchema,
  ListResourcesRequestSchema,
  ListResourcesResponseSchema,
  ReadResourceRequestSchema,
  ReadResourceResponseSchema,
  ListPromptsRequestSchema,
  ListPromptsResponseSchema,
  GetPromptRequestSchema,
  GetPromptResponseSchema,
  ErrorResponseSchema,
  JsonRpcNotificationSchema,
]);