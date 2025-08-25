/**
 * Advanced tool implementations with annotations and metadata
 * Demonstrates modern MCP SDK 1.17.4 features
 */

import { z } from 'zod';

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { withProgress } from '../notifications/progress.js';

/**
 * Tool input schemas using Zod for runtime validation
 */
export const AnalyzeTextSchema = z.object({
  text: z.string().min(1).describe('Text to analyze'),
  options: z
    .object({
      sentiment: z.boolean().optional().describe('Include sentiment analysis'),
      entities: z.boolean().optional().describe('Extract named entities'),
      summary: z.boolean().optional().describe('Generate summary'),
      language: z.string().optional().describe('Language code (e.g., "en", "es")'),
    })
    .optional()
    .describe('Analysis options'),
});

export const TransformDataSchema = z.object({
  data: z
    .union([z.string(), z.array(z.unknown()), z.record(z.unknown())])
    .describe('Data to transform'),
  operation: z
    .enum(['format', 'filter', 'aggregate', 'sort', 'map'])
    .describe('Transformation operation'),
  config: z.record(z.unknown()).optional().describe('Operation-specific configuration'),
});

export const GenerateCodeSchema = z.object({
  language: z
    .enum(['typescript', 'javascript', 'python', 'rust', 'go'])
    .describe('Programming language'),
  template: z
    .enum(['function', 'class', 'interface', 'test', 'module'])
    .describe('Code template type'),
  specifications: z
    .object({
      name: z.string().describe('Name of the code element'),
      description: z.string().optional().describe('What the code should do'),
      inputs: z.array(z.string()).optional().describe('Input parameters'),
      outputs: z.string().optional().describe('Expected output'),
    })
    .describe('Code specifications'),
});

/**
 * Output schemas for structured responses
 */
export const AnalysisResultSchema = z.object({
  sentiment: z
    .object({
      score: z.number().min(-1).max(1),
      label: z.enum(['positive', 'neutral', 'negative']),
    })
    .optional(),
  entities: z
    .array(
      z.object({
        text: z.string(),
        type: z.string(),
        confidence: z.number().min(0).max(1),
      }),
    )
    .optional(),
  summary: z.string().optional(),
  language: z.string().optional(),
  wordCount: z.number(),
  characterCount: z.number(),
});

/**
 * Advanced tools with full annotations and metadata
 */
export const advancedTools: Tool[] = [
  {
    name: 'analyze-text',
    title: 'Text Analysis Tool',
    description:
      'Performs comprehensive text analysis including sentiment, entities, and summarization',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to analyze',
          minLength: 1,
        },
        options: {
          type: 'object',
          properties: {
            sentiment: {
              type: 'boolean',
              description: 'Include sentiment analysis',
            },
            entities: {
              type: 'boolean',
              description: 'Extract named entities',
            },
            summary: {
              type: 'boolean',
              description: 'Generate summary',
            },
            language: {
              type: 'string',
              description: 'Language code (e.g., "en", "es")',
              pattern: '^[a-z]{2}$',
            },
          },
          additionalProperties: false,
        },
      },
      required: ['text'],
      additionalProperties: false,
    },
    // Output schema for structured responses
    outputSchema: {
      type: 'object',
      properties: {
        sentiment: {
          type: 'object',
          properties: {
            score: {
              type: 'number',
              minimum: -1,
              maximum: 1,
            },
            label: {
              type: 'string',
              enum: ['positive', 'neutral', 'negative'],
            },
          },
        },
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              type: { type: 'string' },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
              },
            },
            required: ['text', 'type', 'confidence'],
          },
        },
        summary: { type: 'string' },
        language: { type: 'string' },
        wordCount: { type: 'number' },
        characterCount: { type: 'number' },
      },
      required: ['wordCount', 'characterCount'],
    },
  },
  {
    name: 'transform-data',
    title: 'Data Transformation Tool',
    description:
      'Transform data using various operations like format, filter, aggregate, sort, or map',
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          oneOf: [{ type: 'string' }, { type: 'array' }, { type: 'object' }],
          description: 'Data to transform',
        },
        operation: {
          type: 'string',
          enum: ['format', 'filter', 'aggregate', 'sort', 'map'],
          description: 'Transformation operation',
        },
        config: {
          type: 'object',
          description: 'Operation-specific configuration',
          additionalProperties: true,
        },
      },
      required: ['data', 'operation'],
      additionalProperties: false,
    },
  },
  {
    name: 'generate-code',
    title: 'Code Generator',
    description: 'Generate code snippets in various languages using templates',
    inputSchema: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          enum: ['typescript', 'javascript', 'python', 'rust', 'go'],
          description: 'Programming language',
        },
        template: {
          type: 'string',
          enum: ['function', 'class', 'interface', 'test', 'module'],
          description: 'Code template type',
        },
        specifications: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the code element',
            },
            description: {
              type: 'string',
              description: 'What the code should do',
            },
            inputs: {
              type: 'array',
              items: { type: 'string' },
              description: 'Input parameters',
            },
            outputs: {
              type: 'string',
              description: 'Expected output',
            },
          },
          required: ['name'],
          additionalProperties: false,
        },
      },
      required: ['language', 'template', 'specifications'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Generated code',
        },
        language: {
          type: 'string',
          description: 'Language of generated code',
        },
        documentation: {
          type: 'string',
          description: 'Documentation for the generated code',
        },
      },
      required: ['code', 'language'],
    },
  },
];

/**
 * Tool handler implementations
 */
export async function handleAdvancedToolCall(
  name: string,
  args: unknown,
): Promise<{ content: Array<{ type: string; text?: string; data?: unknown }> } | null> {
  switch (name) {
    case 'analyze-text': {
      const input = AnalyzeTextSchema.parse(args);
      const result: z.infer<typeof AnalysisResultSchema> = {
        wordCount: input.text.split(/\s+/).length,
        characterCount: input.text.length,
      };

      // Simulate analysis based on options
      if (input.options?.sentiment) {
        result.sentiment = {
          score: 0.5, // Placeholder
          label: 'positive',
        };
      }

      if (input.options?.entities) {
        result.entities = [
          {
            text: 'Context-Pods',
            type: 'PRODUCT',
            confidence: 0.95,
          },
        ];
      }

      if (input.options?.summary) {
        result.summary = input.text.substring(0, 100) + '...';
      }

      if (input.options?.language) {
        result.language = input.options.language;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    case 'transform-data': {
      const input = TransformDataSchema.parse(args);

      // Placeholder transformation logic
      let transformed = input.data;

      switch (input.operation) {
        case 'format':
          transformed = JSON.stringify(input.data, null, 2);
          break;
        case 'sort':
          if (Array.isArray(input.data)) {
            transformed = [...input.data].sort();
          }
          break;
        // Add more operations as needed
      }

      return {
        content: [
          {
            type: 'text',
            text: typeof transformed === 'string' ? transformed : JSON.stringify(transformed),
          },
        ],
      };
    }

    case 'generate-code': {
      const input = GenerateCodeSchema.parse(args);

      // Generate code based on template and language
      let code = '';
      const { language, template, specifications } = input;

      if (language === 'typescript' && template === 'function') {
        code = `/**
 * ${specifications.description || specifications.name}
 */
export function ${specifications.name}(${(specifications.inputs || []).join(', ')}): ${specifications.outputs || 'void'} {
  // Implementation goes here
  throw new Error('Not implemented');
}`;
      } else if (language === 'python' && template === 'function') {
        code = `def ${specifications.name}(${(specifications.inputs || []).join(', ')}):
    """${specifications.description || specifications.name}"""
    # Implementation goes here
    raise NotImplementedError()`;
      }
      // Add more templates as needed

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                code,
                language,
                documentation: `Generated ${template} in ${language}`,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    default:
      return null;
  }
}
