import { z } from 'zod';

/**
 * Schema for template language
 */
export const TemplateLanguageSchema = z.enum(['nodejs', 'typescript', 'python', 'rust', 'shell']);

/**
 * Schema for template optimization
 */
export const TemplateOptimizationSchema = z.object({
  turboRepo: z.boolean(),
  hotReload: z.boolean(),
  sharedDependencies: z.boolean(),
  buildCaching: z.boolean(),
});

/**
 * Schema for template variable validation
 */
export const TemplateVariableValidationSchema = z.object({
  pattern: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  options: z.array(z.string()).optional(),
});

/**
 * Schema for template variable
 */
export const TemplateVariableSchema = z.object({
  description: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  required: z.boolean(),
  default: z.unknown().optional(),
  validation: TemplateVariableValidationSchema.optional(),
});

/**
 * Schema for template file
 */
export const TemplateFileSchema = z.object({
  path: z.string().min(1),
  template: z.boolean(),
  executable: z.boolean().optional(),
  encoding: z.enum(['utf8', 'binary']).optional(),
});

/**
 * Schema for template metadata
 */
export const TemplateMetadataSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  language: TemplateLanguageSchema,
  optimization: TemplateOptimizationSchema,
  variables: z.record(TemplateVariableSchema),
  files: z.array(TemplateFileSchema),
  dependencies: z
    .object({
      core: z.array(z.string()).optional(),
      dev: z.array(z.string()).optional(),
      peer: z.array(z.string()).optional(),
    })
    .optional(),
  scripts: z.record(z.string()).optional(),
});

/**
 * Schema for pod configuration
 */
export const PodConfigSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().min(1),
  template: z.string().min(1),
  outputPath: z.string().optional(),
  variables: z.record(z.unknown()).optional(),
});

/**
 * Schema for MCP tool definition
 */
export const MCPToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  inputSchema: z.record(z.unknown()),
});

/**
 * Schema for MCP resource definition
 */
export const MCPResourceSchema = z.object({
  uri: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});

/**
 * Schema for MCP prompt argument
 */
export const MCPPromptArgumentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().optional(),
});

/**
 * Schema for MCP prompt definition
 */
export const MCPPromptSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  arguments: z.array(MCPPromptArgumentSchema).optional(),
});

/**
 * Schema for a complete MCP server manifest
 */
export const MCPServerManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1),
  tools: z.array(MCPToolSchema).optional(),
  resources: z.array(MCPResourceSchema).optional(),
  prompts: z.array(MCPPromptSchema).optional(),
});

/**
 * Schema for template processing context
 */
export const TemplateContextSchema = z.object({
  variables: z.record(z.unknown()),
  outputPath: z.string().min(1),
  templatePath: z.string().min(1),
  optimization: TemplateOptimizationSchema,
});

/**
 * Schema for template processing result
 */
export const TemplateProcessingResultSchema = z.object({
  success: z.boolean(),
  outputPath: z.string().min(1),
  generatedFiles: z.array(z.string()),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  buildCommand: z.string().optional(),
  devCommand: z.string().optional(),
});
