/**
 * Test data builders for Context-Pods tests
 */

import type { TemplateMetadata, TemplateVariable } from '@context-pods/core';

interface TemplateOverrides {
  name?: string;
  description?: string;
  language?: string;
  variables?: TemplateVariable[];
  optimization?: {
    turboRepo?: boolean;
    hotReload?: boolean;
  };
}

interface MetadataOverrides {
  name?: string;
  description?: string;
  version?: string;
  language?: string;
  variables?: TemplateVariable[];
  optimization?: {
    turboRepo?: boolean;
    hotReload?: boolean;
  };
  files?: string[];
}

interface VariableOverrides {
  name?: string;
  description?: string;
  type?: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: unknown;
  pattern?: string;
  enum?: string[];
}

interface ServerConfig {
  name: string;
  description: string;
  path: string;
  status: 'building' | 'ready' | 'failed';
  language: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ServerConfigOverrides {
  name?: string;
  description?: string;
  path?: string;
  status?: 'building' | 'ready' | 'failed';
  language?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Builder for template test data
 */
export const templateBuilder = {
  /**
   * Create a basic template with optional overrides
   */
  basic: (overrides: TemplateOverrides = {}): TemplateMetadata => ({
    name: overrides.name ?? 'test-template',
    description: overrides.description ?? 'Test template for unit tests',
    version: '1.0.0',
    language: overrides.language ?? 'typescript',
    variables: overrides.variables ?? [],
    optimization: overrides.optimization ?? {
      turboRepo: false,
      hotReload: false,
    },
    files: [],
  }),

  /**
   * Create a template with variables
   */
  withVariables: (variables: TemplateVariable[]): TemplateMetadata => ({
    name: 'test-template-with-vars',
    description: 'Test template with variables',
    version: '1.0.0',
    language: 'typescript',
    variables,
    optimization: {
      turboRepo: false,
      hotReload: false,
    },
    files: [],
  }),

  /**
   * Create a TypeScript template optimized for TurboRepo
   */
  typescriptOptimized: (): TemplateMetadata => ({
    name: 'typescript-advanced',
    description: 'Advanced TypeScript template with TurboRepo optimization',
    version: '1.0.0',
    language: 'typescript',
    variables: [
      {
        name: 'serverName',
        description: 'The name of your MCP server',
        type: 'string',
        required: true,
        pattern: '^[a-z][a-z0-9-]*$',
      },
      {
        name: 'serverDescription',
        description: 'A brief description of your server',
        type: 'string',
        required: true,
      },
    ],
    optimization: {
      turboRepo: true,
      hotReload: true,
    },
    files: ['package.json.mustache', 'src/index.ts.mustache', 'tsconfig.json.mustache'],
  }),

  /**
   * Create a Python template
   */
  python: (): TemplateMetadata => ({
    name: 'python-basic',
    description: 'Basic Python MCP server template',
    version: '1.0.0',
    language: 'python',
    variables: [
      {
        name: 'serverName',
        description: 'The name of your MCP server',
        type: 'string',
        required: true,
      },
    ],
    optimization: {
      turboRepo: false,
      hotReload: false,
    },
    files: ['main.py.mustache', 'requirements.txt.mustache'],
  }),
};

/**
 * Builder for template metadata test data
 */
export const metadataBuilder = {
  /**
   * Create basic metadata with optional overrides
   */
  basic: (overrides: MetadataOverrides = {}): TemplateMetadata => ({
    name: overrides.name ?? 'test-metadata',
    description: overrides.description ?? 'Test metadata',
    version: overrides.version ?? '1.0.0',
    language: overrides.language ?? 'typescript',
    variables: overrides.variables ?? [],
    optimization: overrides.optimization ?? {
      turboRepo: false,
      hotReload: false,
    },
    files: overrides.files ?? [],
  }),
};

/**
 * Builder for template variable test data
 */
export const variableBuilder = {
  /**
   * Create a basic string variable
   */
  string: (overrides: VariableOverrides = {}): TemplateVariable => ({
    name: overrides.name ?? 'testVar',
    description: overrides.description ?? 'Test variable',
    type: 'string',
    required: overrides.required ?? false,
    default: overrides.default ?? undefined,
    pattern: overrides.pattern,
    enum: overrides.enum,
  }),

  /**
   * Create a required variable
   */
  required: (name: string, description: string): TemplateVariable => ({
    name,
    description,
    type: 'string',
    required: true,
  }),

  /**
   * Create a variable with enum values
   */
  enum: (name: string, values: string[]): TemplateVariable => ({
    name,
    description: `Select one of: ${values.join(', ')}`,
    type: 'string',
    required: true,
    enum: values,
  }),
};

/**
 * Builder for server configuration test data
 */
export const serverConfigBuilder = {
  /**
   * Create a basic server configuration
   */
  basic: (overrides: ServerConfigOverrides = {}): ServerConfig => ({
    name: overrides.name ?? 'test-server',
    description: overrides.description ?? 'Test MCP server',
    path: overrides.path ?? '/path/to/test-server',
    status: overrides.status ?? 'ready',
    language: overrides.language ?? 'typescript',
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  }),

  /**
   * Create a server in building status
   */
  building: (name: string): ServerConfig => ({
    name,
    description: 'MCP server being built',
    path: `/generated/${name}`,
    status: 'building' as const,
    language: 'typescript',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  /**
   * Create a failed server
   */
  failed: (name: string, error: string): ServerConfig => ({
    name,
    description: 'Failed MCP server',
    path: `/generated/${name}`,
    status: 'failed' as const,
    language: 'typescript',
    error,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
};
