/**
 * Tool registration for {{serverName}}
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';
import { fileTools, handleFileToolCall } from './file-tools.js';
import { dataTools, handleDataToolCall } from './data-tools.js';
import { utilityTools, handleUtilityToolCall } from './utility-tools.js';

/**
 * Register all tools with the server
 */
export async function registerTools(server: Server): Promise<void> {
  logger.info('Registering tools for {{serverName}}...');

  // Combine all tools
  const allTools = [...fileTools, ...dataTools, ...utilityTools];

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: allTools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Try each tool handler
    let result = await handleFileToolCall(name, args);
    if (result) return result;

    result = await handleDataToolCall(name, args);
    if (result) return result;

    result = await handleUtilityToolCall(name, args);
    if (result) return result;

    throw new Error(`Unknown tool: ${name}`);
  });

  logger.info('All tools registered successfully');
}
