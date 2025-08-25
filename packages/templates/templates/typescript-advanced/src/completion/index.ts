/**
 * Completion providers for {{serverName}}
 * Implements MCP completion pattern for auto-complete and suggestions
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CompleteRequestSchema, Completion } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';

/**
 * Completion context information
 */
interface CompletionContext {
  /**
   * Text before the cursor
   */
  prefix: string;

  /**
   * Text after the cursor
   */
  suffix: string;

  /**
   * Current line number (if applicable)
   */
  line?: number;

  /**
   * Current column number (if applicable)
   */
  column?: number;

  /**
   * File path or URI being edited
   */
  uri?: string;

  /**
   * Language or content type
   */
  language?: string;

  /**
   * Additional context metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Completion suggestion
 */
interface CompletionSuggestion {
  /**
   * Text to insert
   */
  text: string;

  /**
   * Label to display in completion list
   */
  label?: string;

  /**
   * Detailed description
   */
  description?: string;

  /**
   * Completion type/kind
   */
  kind?:
    | 'text'
    | 'method'
    | 'function'
    | 'constructor'
    | 'field'
    | 'variable'
    | 'class'
    | 'interface'
    | 'module'
    | 'property'
    | 'unit'
    | 'value'
    | 'enum'
    | 'keyword'
    | 'snippet'
    | 'color'
    | 'file'
    | 'reference';

  /**
   * Priority/ranking for sorting
   */
  sortText?: string;

  /**
   * Filter text for matching
   */
  filterText?: string;

  /**
   * Insert format
   */
  insertTextFormat?: 'plainText' | 'snippet';

  /**
   * Additional edit operations
   */
  additionalTextEdits?: Array<{
    range: { start: number; end: number };
    text: string;
  }>;
}

/**
 * Completion provider interface
 */
interface CompletionProvider {
  /**
   * Provider name
   */
  name: string;

  /**
   * Languages/contexts this provider supports
   */
  triggers: string[];

  /**
   * Trigger characters for auto-completion
   */
  triggerCharacters?: string[];

  /**
   * Provide completions for the given context
   */
  provideCompletions(context: CompletionContext): Promise<CompletionSuggestion[]>;
}

/**
 * Basic keyword completion provider
 */
class KeywordCompletionProvider implements CompletionProvider {
  name = 'keywords';
  triggers = ['javascript', 'typescript', 'python', 'json'];

  private keywordsByLanguage: Record<string, string[]> = {
    javascript: [
      'function',
      'const',
      'let',
      'var',
      'if',
      'else',
      'for',
      'while',
      'return',
      'import',
      'export',
      'class',
      'extends',
      'async',
      'await',
      'try',
      'catch',
      'finally',
      'throw',
      'new',
      'this',
      'super',
    ],
    typescript: [
      'interface',
      'type',
      'enum',
      'namespace',
      'public',
      'private',
      'protected',
      'readonly',
      'static',
      'abstract',
      'implements',
      'generic',
      'any',
      'unknown',
      'never',
      'void',
      'string',
      'number',
      'boolean',
      'object',
    ],
    python: [
      'def',
      'class',
      'if',
      'elif',
      'else',
      'for',
      'while',
      'try',
      'except',
      'finally',
      'with',
      'as',
      'import',
      'from',
      'return',
      'yield',
      'lambda',
      'global',
      'nonlocal',
      'pass',
      'break',
      'continue',
      'and',
      'or',
      'not',
    ],
    json: ['true', 'false', 'null'],
  };

  async provideCompletions(context: CompletionContext): Promise<CompletionSuggestion[]> {
    const language = context.language || 'javascript';
    const keywords = this.keywordsByLanguage[language] || [];

    // Extract the current word being typed
    const match = context.prefix.match(/\b(\w*)$/);
    const currentWord = match ? match[1] : '';

    if (currentWord.length === 0) {
      return [];
    }

    // Filter keywords that match the current input
    const matches = keywords.filter((keyword) =>
      keyword.toLowerCase().startsWith(currentWord.toLowerCase()),
    );

    return matches.map((keyword, index) => ({
      text: keyword,
      label: keyword,
      kind: 'keyword',
      sortText: String(index).padStart(3, '0'),
      filterText: keyword,
      insertTextFormat: 'plainText',
    }));
  }
}

/**
 * File path completion provider
 */
class FilePathCompletionProvider implements CompletionProvider {
  name = 'filepaths';
  triggers = ['*']; // All contexts
  triggerCharacters = ['/', '.'];

  async provideCompletions(context: CompletionContext): Promise<CompletionSuggestion[]> {
    // Look for file path patterns in the prefix
    const pathMatch = context.prefix.match(/(["']?)([^"']*[/\\])([^"'/\\]*)$/);

    if (!pathMatch) {
      return [];
    }

    const [, quote, dirPath, partial] = pathMatch;

    try {
      // In a real implementation, you would use fs.readdir here
      // For now, return some example completions
      const suggestions: CompletionSuggestion[] = [
        {
          text: `${partial}index.js`,
          label: 'index.js',
          kind: 'file',
          description: 'JavaScript index file',
        },
        {
          text: `${partial}package.json`,
          label: 'package.json',
          kind: 'file',
          description: 'NPM package configuration',
        },
        {
          text: `${partial}src/`,
          label: 'src/',
          kind: 'file',
          description: 'Source directory',
        },
      ];

      return suggestions.filter((s) => s.label?.toLowerCase().startsWith(partial.toLowerCase()));
    } catch (error) {
      logger.debug('File path completion failed:', error);
      return [];
    }
  }
}

/**
 * Snippet completion provider
 */
class SnippetCompletionProvider implements CompletionProvider {
  name = 'snippets';
  triggers = ['javascript', 'typescript', 'python'];

  private snippets: Record<
    string,
    Array<{
      prefix: string;
      body: string;
      description: string;
    }>
  > = {
    javascript: [
      {
        prefix: 'fn',
        body: 'function ${1:name}(${2:params}) {\n\t${3:// body}\n}',
        description: 'Function declaration',
      },
      {
        prefix: 'afn',
        body: 'async function ${1:name}(${2:params}) {\n\t${3:// body}\n}',
        description: 'Async function declaration',
      },
      {
        prefix: 'cl',
        body: 'console.log(${1:value});',
        description: 'Console log statement',
      },
    ],
    typescript: [
      {
        prefix: 'int',
        body: 'interface ${1:Name} {\n\t${2:property}: ${3:type};\n}',
        description: 'Interface declaration',
      },
      {
        prefix: 'type',
        body: 'type ${1:Name} = ${2:type};',
        description: 'Type alias',
      },
    ],
    python: [
      {
        prefix: 'def',
        body: 'def ${1:name}(${2:params}):\n\t"""${3:description}"""\n\t${4:pass}',
        description: 'Function definition',
      },
      {
        prefix: 'class',
        body: 'class ${1:Name}:\n\t"""${2:description}"""\n\t\n\tdef __init__(self${3:, params}):\n\t\t${4:pass}',
        description: 'Class definition',
      },
    ],
  };

  async provideCompletions(context: CompletionContext): Promise<CompletionSuggestion[]> {
    const language = context.language || 'javascript';
    const snippets = this.snippets[language] || [];

    // Extract the current word
    const match = context.prefix.match(/\b(\w*)$/);
    const currentWord = match ? match[1] : '';

    if (currentWord.length === 0) {
      return [];
    }

    // Filter snippets that match
    const matches = snippets.filter((snippet) =>
      snippet.prefix.toLowerCase().startsWith(currentWord.toLowerCase()),
    );

    return matches.map((snippet, index) => ({
      text: snippet.body,
      label: snippet.prefix,
      description: snippet.description,
      kind: 'snippet',
      sortText: `snippet_${String(index).padStart(3, '0')}`,
      insertTextFormat: 'snippet',
    }));
  }
}

/**
 * Completion manager that coordinates multiple providers
 */
export class CompletionManager {
  private providers: Map<string, CompletionProvider> = new Map();

  constructor() {
    // Register default providers
    this.registerProvider(new KeywordCompletionProvider());
    this.registerProvider(new FilePathCompletionProvider());
    this.registerProvider(new SnippetCompletionProvider());
  }

  /**
   * Register a completion provider
   */
  registerProvider(provider: CompletionProvider): void {
    this.providers.set(provider.name, provider);
    logger.info(`Registered completion provider: ${provider.name}`);
  }

  /**
   * Remove a completion provider
   */
  removeProvider(name: string): boolean {
    const removed = this.providers.delete(name);
    if (removed) {
      logger.info(`Removed completion provider: ${name}`);
    }
    return removed;
  }

  /**
   * Get completions from all applicable providers
   */
  async getCompletions(context: CompletionContext): Promise<Completion[]> {
    const allSuggestions: CompletionSuggestion[] = [];
    const applicableProviders = Array.from(this.providers.values()).filter((provider) =>
      this.isProviderApplicable(provider, context),
    );

    // Collect completions from all providers
    for (const provider of applicableProviders) {
      try {
        const suggestions = await provider.provideCompletions(context);
        allSuggestions.push(...suggestions);
      } catch (error) {
        logger.error(`Provider ${provider.name} failed:`, error);
      }
    }

    // Sort suggestions by priority
    allSuggestions.sort((a, b) => {
      const sortA = a.sortText || a.label || a.text;
      const sortB = b.sortText || b.label || b.text;
      return sortA.localeCompare(sortB);
    });

    // Convert to MCP Completion format
    return allSuggestions.map((suggestion, index) => ({
      values: [suggestion.text],
      label: suggestion.label,
      description: suggestion.description,
    }));
  }

  /**
   * Check if a provider is applicable to the given context
   */
  private isProviderApplicable(provider: CompletionProvider, context: CompletionContext): boolean {
    // Check language/context triggers
    if (provider.triggers.includes('*')) {
      return true;
    }

    if (context.language && provider.triggers.includes(context.language)) {
      return true;
    }

    if (context.uri) {
      const ext = context.uri.split('.').pop()?.toLowerCase();
      if (ext && provider.triggers.includes(ext)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get statistics about registered providers
   */
  getStats(): {
    totalProviders: number;
    providerNames: string[];
  } {
    return {
      totalProviders: this.providers.size,
      providerNames: Array.from(this.providers.keys()),
    };
  }
}

// Global completion manager instance
export const completionManager = new CompletionManager();

/**
 * Register completion capabilities with the server
 */
export async function registerCompletion(server: Server): Promise<void> {
  logger.info('Registering completion capabilities for {{serverName}}...');

  // Handle completion requests
  server.setRequestHandler(CompleteRequestSchema, async (request) => {
    const { ref, argument } = request.params;

    // Parse the completion context from the reference and argument
    const context: CompletionContext = {
      prefix: argument?.prefix || '',
      suffix: argument?.suffix || '',
      uri: ref?.uri,
      language: ref?.name, // Assuming ref.name contains language info
      metadata: argument,
    };

    logger.debug('Processing completion request', {
      prefix: context.prefix.slice(-20), // Last 20 chars for debugging
      language: context.language,
      uri: context.uri,
    });

    const completions = await completionManager.getCompletions(context);

    logger.info(`Generated ${completions.length} completions`);

    return {
      completion: {
        values: completions.length > 0 ? completions[0].values : [''],
        total: completions.length,
      },
    };
  });

  logger.info('Completion capabilities registered successfully');
}

/**
 * Completion tools for manual testing and debugging
 */
export const completionTools = [
  {
    name: 'test-completion',
    title: 'Test Completion Provider',
    description: 'Test completion suggestions for given context',
    inputSchema: {
      type: 'object',
      properties: {
        prefix: {
          type: 'string',
          description: 'Text before cursor position',
        },
        suffix: {
          type: 'string',
          description: 'Text after cursor position',
          default: '',
        },
        language: {
          type: 'string',
          description: 'Programming language or context',
          enum: ['javascript', 'typescript', 'python', 'json'],
        },
        uri: {
          type: 'string',
          description: 'File URI or path',
        },
      },
      required: ['prefix'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        completions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              label: { type: 'string' },
              description: { type: 'string' },
              kind: { type: 'string' },
            },
          },
        },
        totalCount: {
          type: 'number',
          description: 'Total number of suggestions',
        },
        providers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Active providers for this context',
        },
      },
      required: ['completions', 'totalCount'],
    },
  },
];
