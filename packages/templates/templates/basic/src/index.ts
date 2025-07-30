import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * {{serverDescription}}
 */
const server = new Server(
  {
    name: '{{serverName}}',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'example-tool',
        description: 'An example tool that echoes input',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Message to echo',
            },
          },
          required: ['message'],
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'example-tool') {
    const { message } = request.params.arguments as { message: string };
    return {
      content: [
        {
          type: 'text',
          text: `Echo: ${message}`,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

/**
 * List available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: '{{serverName}}://example',
        name: 'Example Resource',
        description: 'An example resource',
        mimeType: 'text/plain',
      },
    ],
  };
});

/**
 * Read resource content
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === '{{serverName}}://example') {
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: 'text/plain',
          text: 'This is an example resource from {{serverName}}',
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${request.params.uri}`);
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('{{serverName}} MCP server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
