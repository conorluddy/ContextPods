/**
 * Resource registration for {{serverName}}
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from '@context-pods/core';

/**
 * Available resources
 */
const resources = [
  {
    uri: '{{serverName}}://config',
    name: 'Server Configuration',
    description: 'Configuration settings for {{serverName}}',
    mimeType: 'application/json',
  },
  {
    uri: '{{serverName}}://status',
    name: 'Server Status',
    description: 'Current status of {{serverName}}',
    mimeType: 'application/json',
  },
];

/**
 * Register all resources with the server
 */
export async function registerResources(server: Server): Promise<void> {
  logger.info('Registering resources for {{serverName}}...');

  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources };
  });

  // Read resource content
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === '{{serverName}}://config') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                name: '{{serverName}}',
                version: '0.1.0',
                description: '{{serverDescription}}',
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    if (uri === '{{serverName}}://status') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                status: 'running',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  });

  logger.info('All resources registered successfully');
}
