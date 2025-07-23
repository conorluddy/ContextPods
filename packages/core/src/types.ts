/**
 * Core types for Context-Pods
 */

/**
 * Metadata for a pod template
 */
export interface TemplateMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;
  tags?: string[];
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