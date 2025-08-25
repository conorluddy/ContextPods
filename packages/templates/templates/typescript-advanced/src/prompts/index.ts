/**
 * Prompt management system for {{serverName}}
 * Implements MCP prompt templates with dynamic arguments
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Prompt,
  PromptMessage,
} from '@modelcontextprotocol/sdk/types.js';

import { logger } from '../utils/logger.js';

/**
 * Prompt templates available in this server
 */
const promptTemplates: Prompt[] = [
  {
    name: 'code-review',
    title: 'Code Review Assistant',
    description: 'Analyze code for quality, bugs, and improvements',
    arguments: [
      {
        name: 'code',
        description: 'The code to review',
        required: true,
      },
      {
        name: 'language',
        description: 'Programming language (e.g., typescript, python)',
        required: false,
      },
      {
        name: 'focus',
        description: 'Specific aspect to focus on (security, performance, style)',
        required: false,
      },
    ],
  },
  {
    name: 'data-analysis',
    title: 'Data Analysis Helper',
    description: 'Analyze and visualize data patterns',
    arguments: [
      {
        name: 'data',
        description: 'The data to analyze (JSON, CSV, or description)',
        required: true,
      },
      {
        name: 'analysis_type',
        description: 'Type of analysis (statistical, trend, correlation)',
        required: false,
      },
      {
        name: 'output_format',
        description: 'Desired output format (summary, detailed, visual)',
        required: false,
      },
    ],
  },
  {
    name: 'api-design',
    title: 'API Design Assistant',
    description: 'Help design RESTful APIs with best practices',
    arguments: [
      {
        name: 'resource',
        description: 'The resource or entity to design API for',
        required: true,
      },
      {
        name: 'operations',
        description: 'CRUD operations needed (create, read, update, delete)',
        required: false,
      },
      {
        name: 'authentication',
        description: 'Authentication method (jwt, oauth, api-key)',
        required: false,
      },
    ],
  },
  {
    name: 'error-diagnosis',
    title: 'Error Diagnosis Helper',
    description: 'Diagnose and suggest fixes for errors',
    arguments: [
      {
        name: 'error_message',
        description: 'The error message or stack trace',
        required: true,
      },
      {
        name: 'context',
        description: 'Code context where error occurred',
        required: false,
      },
      {
        name: 'environment',
        description: 'Environment details (OS, runtime version, dependencies)',
        required: false,
      },
    ],
  },
  {
    name: 'documentation',
    title: 'Documentation Generator',
    description: 'Generate comprehensive documentation',
    arguments: [
      {
        name: 'code',
        description: 'Code to document',
        required: true,
      },
      {
        name: 'style',
        description: 'Documentation style (jsdoc, markdown, restructured)',
        required: false,
      },
      {
        name: 'detail_level',
        description: 'Level of detail (basic, detailed, comprehensive)',
        required: false,
      },
    ],
  },
];

/**
 * Generate prompt messages based on template and arguments
 */
function generatePromptMessages(template: Prompt, args: Record<string, string>): PromptMessage[] {
  const messages: PromptMessage[] = [];

  // System message setting up the context
  messages.push({
    role: 'system',
    content: {
      type: 'text',
      text: `You are a helpful assistant specialized in: ${template.description}`,
    },
  });

  // Build user message from arguments
  let userMessage = '';

  switch (template.name) {
    case 'code-review':
      userMessage = `Please review the following ${args.language || 'code'}:\n\n\`\`\`${args.language || ''}\n${args.code}\n\`\`\``;
      if (args.focus) {
        userMessage += `\n\nPlease focus particularly on: ${args.focus}`;
      }
      break;

    case 'data-analysis':
      userMessage = `Please analyze the following data:\n\n${args.data}`;
      if (args.analysis_type) {
        userMessage += `\n\nPerform ${args.analysis_type} analysis.`;
      }
      if (args.output_format) {
        userMessage += `\n\nProvide output in ${args.output_format} format.`;
      }
      break;

    case 'api-design':
      userMessage = `Design a RESTful API for the following resource: ${args.resource}`;
      if (args.operations) {
        userMessage += `\n\nInclude these operations: ${args.operations}`;
      }
      if (args.authentication) {
        userMessage += `\n\nUse ${args.authentication} for authentication.`;
      }
      break;

    case 'error-diagnosis':
      userMessage = `Help diagnose this error:\n\n${args.error_message}`;
      if (args.context) {
        userMessage += `\n\nContext:\n\`\`\`\n${args.context}\n\`\`\``;
      }
      if (args.environment) {
        userMessage += `\n\nEnvironment: ${args.environment}`;
      }
      break;

    case 'documentation':
      userMessage = `Generate ${args.style || 'comprehensive'} documentation for:\n\n\`\`\`\n${args.code}\n\`\`\``;
      if (args.detail_level) {
        userMessage += `\n\nDetail level: ${args.detail_level}`;
      }
      break;

    default:
      userMessage = 'Please help with: ' + JSON.stringify(args);
  }

  messages.push({
    role: 'user',
    content: {
      type: 'text',
      text: userMessage,
    },
  });

  // Add assistant message placeholder for expected format
  messages.push({
    role: 'assistant',
    content: {
      type: 'text',
      text: "I'll help you with that. Let me analyze the information provided...",
    },
  });

  return messages;
}

/**
 * Register prompt handlers with the server
 */
export async function registerPrompts(server: Server): Promise<void> {
  logger.info('Registering prompts for {{serverName}}...');

  // List available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: promptTemplates,
    };
  });

  // Get a specific prompt with arguments filled in
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    const template = promptTemplates.find((p) => p.name === name);
    if (!template) {
      throw new Error(`Unknown prompt: ${name}`);
    }

    // Validate required arguments
    for (const arg of template.arguments || []) {
      if (arg.required && !args[arg.name]) {
        throw new Error(`Missing required argument: ${arg.name}`);
      }
    }

    // Generate messages from template and arguments
    const messages = generatePromptMessages(template, args);

    return {
      description: template.description,
      messages,
    };
  });

  logger.info('All prompts registered successfully');
}

/**
 * Dynamic prompt creation utility
 */
export function createDynamicPrompt(
  name: string,
  title: string,
  description: string,
  messageGenerator: (args: Record<string, string>) => PromptMessage[],
): Prompt {
  const dynamicPrompt: Prompt = {
    name,
    title,
    description,
    arguments: [],
  };

  // Add to available prompts
  promptTemplates.push(dynamicPrompt);

  // Store the custom message generator
  const originalGenerator = generatePromptMessages;
  (generatePromptMessages as any).customGenerators =
    (generatePromptMessages as any).customGenerators || {};
  (generatePromptMessages as any).customGenerators[name] = messageGenerator;

  return dynamicPrompt;
}

/**
 * Prompt statistics and usage tracking
 */
class PromptUsageTracker {
  private usageStats: Map<string, { count: number; lastUsed: Date }> = new Map();

  track(promptName: string): void {
    const stats = this.usageStats.get(promptName) || { count: 0, lastUsed: new Date() };
    stats.count++;
    stats.lastUsed = new Date();
    this.usageStats.set(promptName, stats);
  }

  getStats(): Record<string, { count: number; lastUsed: string }> {
    const result: Record<string, { count: number; lastUsed: string }> = {};
    for (const [name, stats] of this.usageStats.entries()) {
      result[name] = {
        count: stats.count,
        lastUsed: stats.lastUsed.toISOString(),
      };
    }
    return result;
  }

  getMostUsed(): string | null {
    let maxCount = 0;
    let mostUsed: string | null = null;

    for (const [name, stats] of this.usageStats.entries()) {
      if (stats.count > maxCount) {
        maxCount = stats.count;
        mostUsed = name;
      }
    }

    return mostUsed;
  }
}

export const promptUsageTracker = new PromptUsageTracker();
