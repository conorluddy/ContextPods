/**
 * MCP Server implementation for {{serverName}}
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from '@context-pods/core';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';

/**
 * Create and configure the MCP server
 */
export async function createServer(): Promise<Server> {
  const server = new Server(
    {
      name: '{{serverName}}',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    },
  );

  // Register tools
  await registerTools(server);

  // Register resources
  await registerResources(server);

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}
