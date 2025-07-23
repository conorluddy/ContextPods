import { z } from 'zod';

/**
 * Schema for template metadata
 */
export const TemplateMetadataSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Schema for pod configuration
 */
export const PodConfigSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/),
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