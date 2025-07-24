/**
 * CLI-specific types and interfaces for Context-Pods
 */

import { z } from 'zod';

/**
 * Global CLI configuration schema
 */
export const CLIConfigSchema = z.object({
  // Global settings
  templatesPath: z.string().default('./templates'),
  outputPath: z.string().default('./generated'),
  cacheDir: z.string().default('~/.context-pods/cache'),

  // TurboRepo settings
  turbo: z.object({
    enabled: z.boolean().default(true),
    tasks: z.array(z.string()).default(['build', 'test', 'lint']),
    caching: z.boolean().default(true),
  }),

  // Registry integration
  registry: z.object({
    enabled: z.boolean().default(true),
    path: z.string().default('~/.context-pods/registry.db'),
  }),

  // Development settings
  dev: z.object({
    hotReload: z.boolean().default(true),
    watchPatterns: z.array(z.string()).default(['**/*.ts', '**/*.js']),
    port: z.number().default(3001),
  }),
});

export type CLIConfig = z.infer<typeof CLIConfigSchema>;

/**
 * Project-specific configuration schema
 */
export const ProjectConfigSchema = z.object({
  name: z.string(),
  version: z.string().default('1.0.0'),
  description: z.string().optional(),

  // Template preferences
  templates: z.object({
    preferred: z.string().optional(),
    fallback: z.string().default('basic'),
  }),

  // Output configuration
  output: z.object({
    directory: z.string().default('./generated'),
    clean: z.boolean().default(false),
  }),

  // Build configuration
  build: z.object({
    target: z.string().default('node18'),
    sourcemap: z.boolean().default(true),
    minify: z.boolean().default(false),
  }),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

/**
 * Command execution context
 */
export interface CommandContext {
  config: CLIConfig;
  projectConfig?: ProjectConfig;
  workingDir: string;
  templatePaths: string[];
  outputPath: string;
  verbose: boolean;
}

/**
 * CLI command result
 */
export interface CommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: Error;
}

/**
 * Wrap command options
 */
export interface WrapOptions {
  script: string;
  template?: string;
  output?: string;
  name?: string;
  description?: string;
  force?: boolean;
  variables?: Record<string, any>;
}

/**
 * Generate command options
 */
export interface GenerateOptions {
  template?: string;
  output?: string;
  name: string;
  description?: string;
  variables?: Record<string, any>;
  force?: boolean;
}

/**
 * Development command options
 */
export interface DevOptions {
  target?: string;
  port?: number;
  open?: boolean;
  hotReload?: boolean;
}

/**
 * Build command options
 */
export interface BuildOptions {
  target?: string;
  clean?: boolean;
  sourcemap?: boolean;
  minify?: boolean;
}

/**
 * Test command options
 */
export interface TestOptions {
  target?: string;
  coverage?: boolean;
  watch?: boolean;
}

/**
 * Template info for listing
 */
export interface TemplateInfo {
  name: string;
  path: string;
  language: string;
  description?: string;
  version?: string;
  optimized?: boolean;
}

/**
 * MCP info for listing
 */
export interface MCPInfo {
  name: string;
  path: string;
  status: 'active' | 'inactive' | 'error';
  template?: string;
  createdAt: Date;
  lastModified: Date;
}

/**
 * Server command options
 */
export interface ServerOptions {
  daemon?: boolean;
  dev?: boolean;
  debug?: boolean;
  verbose?: boolean;
  port?: number;
}

/**
 * Meta-MCP Server status
 */
export interface ServerStatus {
  running: boolean;
  built: boolean;
  configured: boolean;
  pid?: number;
  uptime?: number;
  version: string;
}
