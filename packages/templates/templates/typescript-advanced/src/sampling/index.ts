/**
 * Sampling and LLM integration for {{serverName}}
 * Implements MCP sampling pattern for AI model interactions
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CreateMessageRequestSchema,
  SamplingRequestSchema,
  SamplingMessage,
  CreateMessageRequest,
} from '@modelcontextprotocol/sdk/types.js';

import { logger } from '../utils/logger.js';

/**
 * Sampling configuration
 */
interface SamplingConfig {
  /**
   * Model to use for sampling
   */
  model?: string;

  /**
   * Maximum tokens to generate
   */
  maxTokens?: number;

  /**
   * Temperature for sampling (0.0 to 1.0)
   */
  temperature?: number;

  /**
   * Top-p sampling parameter
   */
  topP?: number;

  /**
   * Stop sequences
   */
  stopSequences?: string[];

  /**
   * Include thinking process in response
   */
  includeThinking?: boolean;
}

/**
 * Default sampling configuration
 */
const defaultSamplingConfig: Required<SamplingConfig> = {
  model: 'claude-3-haiku-20240307',
  maxTokens: 1000,
  temperature: 0.7,
  topP: 0.9,
  stopSequences: [],
  includeThinking: false,
};

/**
 * Sampling service for LLM interactions
 */
export class SamplingService {
  private config: Required<SamplingConfig>;

  constructor(config: Partial<SamplingConfig> = {}) {
    this.config = { ...defaultSamplingConfig, ...config };
    logger.info('Sampling service initialized', { config: this.config });
  }

  /**
   * Update sampling configuration
   */
  updateConfig(config: Partial<SamplingConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Sampling config updated', { config: this.config });
  }

  /**
   * Create a sampling request from messages
   */
  createSamplingRequest(messages: SamplingMessage[]): CreateMessageRequest {
    return {
      method: 'sampling/createMessage',
      params: {
        messages,
        modelPreferences: {
          hints: [
            {
              name: this.config.model,
            },
          ],
          costPriority: 0.5,
          speedPriority: 0.5,
          intelligencePriority: 0.7,
        },
        systemPrompt: 'You are a helpful assistant integrated with an MCP server.',
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        topP: this.config.topP,
        stopSequences: this.config.stopSequences,
        metadata: {
          includeThinking: this.config.includeThinking,
        },
      },
    };
  }

  /**
   * Process sampling response and extract content
   */
  processSamplingResponse(response: any): {
    content: string;
    thinking?: string;
    usage?: { inputTokens: number; outputTokens: number };
  } {
    const result = {
      content: '',
      thinking: undefined as string | undefined,
      usage: undefined as { inputTokens: number; outputTokens: number } | undefined,
    };

    if (response.content) {
      if (Array.isArray(response.content)) {
        // Handle array of content blocks
        for (const block of response.content) {
          if (block.type === 'text') {
            result.content += block.text;
          }
        }
      } else if (typeof response.content === 'string') {
        result.content = response.content;
      }
    }

    // Extract thinking if present
    if (response.thinking && typeof response.thinking === 'string') {
      result.thinking = response.thinking;
    }

    // Extract usage statistics
    if (response.usage) {
      result.usage = {
        inputTokens: response.usage.inputTokens || 0,
        outputTokens: response.usage.outputTokens || 0,
      };
    }

    return result;
  }
}

// Global sampling service instance
export const samplingService = new SamplingService();

/**
 * Register sampling capabilities with the server
 */
export async function registerSampling(server: Server): Promise<void> {
  logger.info('Registering sampling capabilities for {{serverName}}...');

  // Handle sampling/createMessage requests
  server.setRequestHandler(CreateMessageRequestSchema, async (request) => {
    const { messages, modelPreferences, systemPrompt, ...params } = request.params;

    logger.info('Processing sampling request', {
      messageCount: messages.length,
      model: modelPreferences?.hints?.[0]?.name,
    });

    // Create the sampling request
    const samplingRequest = samplingService.createSamplingRequest(messages);

    // Apply any custom parameters
    if (systemPrompt) {
      samplingRequest.params.systemPrompt = systemPrompt;
    }
    if (modelPreferences) {
      samplingRequest.params.modelPreferences = modelPreferences;
    }
    Object.assign(samplingRequest.params, params);

    // Return the request for the client to process
    return {
      model:
        samplingRequest.params.modelPreferences?.hints?.[0]?.name || samplingService.config.model,
      role: 'assistant',
      content: {
        type: 'text',
        text: 'This request should be handled by the MCP client with sampling capabilities.',
      },
      stopReason: 'stop_sequence',
    };
  });

  logger.info('Sampling capabilities registered successfully');
}

/**
 * Helper function to create messages for common patterns
 */
export function createSamplingMessages(
  systemPrompt: string,
  userMessage: string,
  assistantContext?: string,
): SamplingMessage[] {
  const messages: SamplingMessage[] = [
    {
      role: 'system',
      content: {
        type: 'text',
        text: systemPrompt,
      },
    },
    {
      role: 'user',
      content: {
        type: 'text',
        text: userMessage,
      },
    },
  ];

  if (assistantContext) {
    messages.push({
      role: 'assistant',
      content: {
        type: 'text',
        text: assistantContext,
      },
    });
  }

  return messages;
}

/**
 * Example sampling tools that leverage LLM capabilities
 */
export const samplingTools = [
  {
    name: 'analyze-with-llm',
    title: 'LLM Analysis Tool',
    description: 'Analyze content using large language model capabilities',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Content to analyze',
        },
        analysisType: {
          type: 'string',
          description: 'Type of analysis to perform',
          enum: ['sentiment', 'summary', 'keywords', 'classification'],
          default: 'summary',
        },
        model: {
          type: 'string',
          description: 'Specific model to use for analysis',
        },
      },
      required: ['content'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        result: {
          type: 'string',
          description: 'Analysis result',
        },
        confidence: {
          type: 'number',
          description: 'Confidence score (0-1)',
        },
        metadata: {
          type: 'object',
          properties: {
            model: { type: 'string' },
            tokenUsage: {
              type: 'object',
              properties: {
                input: { type: 'number' },
                output: { type: 'number' },
              },
            },
          },
        },
      },
      required: ['result'],
    },
  },
  {
    name: 'generate-content',
    title: 'Content Generation Tool',
    description: 'Generate content using LLM sampling',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Generation prompt',
        },
        contentType: {
          type: 'string',
          description: 'Type of content to generate',
          enum: ['text', 'code', 'documentation', 'email', 'story'],
          default: 'text',
        },
        style: {
          type: 'string',
          description: 'Writing style or tone',
        },
        maxLength: {
          type: 'number',
          description: 'Maximum length in tokens',
          minimum: 1,
          maximum: 4000,
          default: 500,
        },
      },
      required: ['prompt'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        generatedContent: {
          type: 'string',
          description: 'Generated content',
        },
        metadata: {
          type: 'object',
          properties: {
            model: { type: 'string' },
            actualLength: { type: 'number' },
            temperature: { type: 'number' },
          },
        },
      },
      required: ['generatedContent'],
    },
  },
];
