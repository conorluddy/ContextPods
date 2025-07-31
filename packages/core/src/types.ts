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

/**
 * Codebase Analysis Types
 */

/**
 * Analysis configuration options
 */
export interface AnalysisConfig {
  maxFileSize: number;
  excludePatterns: string[];
  includeTests: boolean;
  languageSettings: Record<TemplateLanguage, LanguageConfig>;
}

/**
 * Language-specific configuration
 */
export interface LanguageConfig {
  extensions: string[];
  excludePatterns: string[];
  parsingStrategy: 'ast' | 'regex' | 'hybrid';
  complexity: {
    maxCyclomaticComplexity: number;
    maxLinesOfCode: number;
  };
}

/**
 * Function metadata extracted during analysis
 */
export interface FunctionMetadata {
  name: string;
  signature: string;
  parameters: FunctionParameter[];
  returnType?: string;
  complexity: {
    cyclomaticComplexity: number;
    linesOfCode: number;
    dependencies: number;
  };
  location: {
    filePath: string;
    startLine: number;
    endLine: number;
  };
  documentation?: string;
  isExported: boolean;
  isAsync: boolean;
}

/**
 * Function parameter metadata
 */
export interface FunctionParameter {
  name: string;
  type?: string;
  optional: boolean;
  defaultValue?: string;
}

/**
 * MCP opportunity category
 */
export type OpportunityCategory =
  | 'api-integration'
  | 'data-transformation'
  | 'file-processing'
  | 'validation'
  | 'utility'
  | 'workflow-automation';

/**
 * MCP opportunity detected in codebase
 */
export interface MCPOpportunity {
  id: string;
  functionName: string;
  filePath: string;
  language: TemplateLanguage;
  score: number;
  category: OpportunityCategory;
  description: string;
  suggestedTemplate: string;
  reasoning: string[];
  implementation: {
    toolName: string;
    toolDescription: string;
    inputSchema: Record<string, unknown>;
    outputDescription: string;
    dependencies: string[];
    complexity: 'low' | 'medium' | 'high';
    estimatedEffort: 'low' | 'medium' | 'high';
  };
  function: FunctionMetadata;
  patterns: DetectedPattern[];
}

/**
 * Pattern detected in code
 */
export interface DetectedPattern {
  type:
    | 'api-call'
    | 'file-operation'
    | 'database-query'
    | 'external-dependency'
    | 'validation-logic';
  confidence: number;
  description: string;
  evidence: string[];
}

/**
 * Template recommendation
 */
export interface TemplateRecommendation {
  templateName: string;
  confidence: number;
  reasoning: string[];
  estimatedVars: Record<string, unknown>;
}

/**
 * Analysis summary statistics
 */
export interface AnalysisSummary {
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  languageBreakdown: Record<TemplateLanguage, number>;
  analysisTime: number;
  errors: string[];
  warnings: string[];
}

/**
 * Complete codebase analysis result
 */
export interface CodebaseAnalysisResult {
  opportunities: MCPOpportunity[];
  summary: AnalysisSummary;
  recommendations: TemplateRecommendation[];
  config: AnalysisConfig;
  timestamp: number;
}

/**
 * Codebase analyzer interface
 */
export interface CodebaseAnalyzer {
  /**
   * Analyze a codebase directory
   */
  analyze(path: string, config: Partial<AnalysisConfig>): Promise<CodebaseAnalysisResult>;

  /**
   * Get default configuration
   */
  getDefaultConfig(): AnalysisConfig;

  /**
   * Validate analysis path
   */
  validatePath(path: string): Promise<boolean>;

  /**
   * Get supported languages
   */
  getSupportedLanguages(): TemplateLanguage[];
}
