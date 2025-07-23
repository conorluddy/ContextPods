/**
 * Utility tools for {{serverName}}
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { logger } from '@context-pods/core';
import { z } from 'zod';

/**
 * Schema for utility tool arguments
 */
const UtilityArgsSchema = z.object({
  input: z.string().min(1, 'Input is required'),
});

/**
 * Utility tools available in this server
 */
export const utilityTools = [
  {
    name: 'echo',
    description: 'Echo the input text',
    inputSchema: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'Text to echo',
        },
      },
      required: ['input'],
    },
  },
];

/**
 * Handle utility tool calls
 */
export async function handleUtilityToolCall(name: string, args: unknown) {
  if (name === 'echo') {
    const { input } = UtilityArgsSchema.parse(args);

    return {
      content: [
        {
          type: 'text',
          text: `Echo: ${input}`,
        },
      ],
    };
  }

  return null;
}

/**
 * Register utility tools
 */
export async function registerUtilityTools(server: Server): Promise<void> {
  logger.info('Registering utility tools...');
}
