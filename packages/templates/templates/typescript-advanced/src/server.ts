/**
 * MCP Server implementation for {{serverName}}
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';
import { progressTracker } from './notifications/progress.js';
import { registerSampling } from './sampling/index.js';
import { registerRoots } from './roots/index.js';
import { registerCompletion } from './completion/index.js';

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
        resources: {
          subscribe: true,
          listChanged: true,
        },
        prompts: {
          listChanged: true,
        },
        sampling: {},
        roots: {
          listChanged: true,
        },
        completion: {
          argumentHints: true,
        },
      },
    },
  );

  // Register tools
  await registerTools(server);

  // Register resources
  await registerResources(server);

  // Register prompts
  await registerPrompts(server);

  // Register advanced features
  await registerSampling(server);
  await registerRoots(server);
  await registerCompletion(server);

  // Initialize progress tracker
  progressTracker.initialize(server);

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}
