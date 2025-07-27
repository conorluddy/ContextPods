/**
 * Core types for Context-Pods
 */

/**
 * Template language types
 */
export enum TemplateLanguage {
  NODEJS = 'nodejs',
  TYPESCRIPT = 'typescript',
  PYTHON = 'python',
  RUST = 'rust',
  SHELL = 'shell',
}

/**
 * Template optimization capabilities
 */
export interface TemplateOptimization {
  turboRepo: boolean;
  hotReload: boolean;
  sharedDependencies: boolean;
  buildCaching: boolean;
}

/**
 * Template variable definition
 */
export interface TemplateVariable {
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: unknown;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[];
  };
}

/**
 * Template file definition
 */
export interface TemplateFile {
  path: string;
  template: boolean;
  executable?: boolean;
  encoding?: 'utf8' | 'binary';
}

/**
 * MCP configuration for Claude Desktop
 */
export interface MCPConfig {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

/**
 * MCP configuration generation options
 */
export interface MCPConfigOptions {
  generateConfig: boolean;
  configName?: string;
  configPath?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * Metadata for a pod template
 */
export interface TemplateMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;
  tags?: string[];
  language: TemplateLanguage;
  optimization: TemplateOptimization;
  variables: Record<string, TemplateVariable>;
  files: TemplateFile[];
  dependencies?: {
    core?: string[];
    dev?: string[];
    peer?: string[];
  };
  scripts?: Record<string, string>;
  mcpConfig?: {
    defaultCommand?: string;
    defaultArgs?: string[];
    defaultEnv?: Record<string, string>;
    generateByDefault?: boolean;
  };
}

/**
 * Configuration for a pod
 */
export interface PodConfig {
  name: string;
  description: string;
  template: string;
  outputPath?: string;
  variables?: Record<string, unknown>;
}

/**
 * Status of a pod
 */
export enum PodStatus {
  CREATED = 'created',
  BUILDING = 'building',
  READY = 'ready',
  ERROR = 'error',
}

/**
 * Information about a generated pod
 */
export interface PodInfo {
  id: string;
  name: string;
  description: string;
  template: string;
  path: string;
  status: PodStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MCP server tool definition
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * MCP server resource definition
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP server prompt definition
 */
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * Template processing context
 */
export interface TemplateContext {
  variables: Record<string, unknown>;
  outputPath: string;
  templatePath: string;
  optimization: TemplateOptimization;
  mcpConfig?: MCPConfigOptions;
}

/**
 * Template processing result
 */
export interface TemplateProcessingResult {
  success: boolean;
  outputPath: string;
  generatedFiles: string[];
  errors?: string[];
  warnings?: string[];
  buildCommand?: string;
  devCommand?: string;
  mcpConfigPath?: string;
}

/**
 * Template validation error details
 */
export interface TemplateValidationError {
  field: string;
  message: string;
  currentValue: unknown;
  expectedType: string;
  pattern?: string;
}

/**
 * Template validation result with detailed errors
 */
export interface TemplateValidationResult {
  isValid: boolean;
  errors: TemplateValidationError[];
}

/**
 * Template engine interface
 */
export interface TemplateEngine {
  /**
   * Process a template with given context
   */
  process(metadata: TemplateMetadata, context: TemplateContext): Promise<TemplateProcessingResult>;

  /**
   * Validate template variables
   */
  validateVariables(
    metadata: TemplateMetadata,
    variables: Record<string, unknown>,
  ): Promise<TemplateValidationResult>;

  /**
   * Get supported languages
   */
  getSupportedLanguages(): TemplateLanguage[];

  /**
   * Detect language from file extension or content
   */
  detectLanguage(filePath: string, content?: string): Promise<TemplateLanguage | null>;
}
