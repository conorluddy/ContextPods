/**
 * Registry database models and types
 */

/**
 * MCP server status enumeration
 */
export enum MCPServerStatus {
  CREATED = 'created',
  BUILDING = 'building',
  READY = 'ready',
  ERROR = 'error',
  ARCHIVED = 'archived',
}

/**
 * MCP server metadata interface
 */
export interface MCPServerMetadata {
  /** Server ID (unique identifier) */
  id: string;
  
  /** Human-readable server name */
  name: string;
  
  /** Template used to generate this server */
  template: string;
  
  /** File system path to the server */
  path: string;
  
  /** Current server status */
  status: MCPServerStatus;
  
  /** Additional metadata */
  metadata: {
    /** Template variables used during generation */
    templateVariables?: Record<string, unknown>;
    
    /** Language of the server */
    language?: string;
    
    /** Whether TurboRepo optimization is enabled */
    turboOptimized?: boolean;
    
    /** Server description */
    description?: string;
    
    /** Tags for categorization */
    tags?: string[];
    
    /** Build command */
    buildCommand?: string;
    
    /** Development command */
    devCommand?: string;
    
    /** Last build status */
    lastBuildStatus?: 'success' | 'failure' | 'pending';
    
    /** Last build timestamp */
    lastBuildTime?: number;
    
    /** Error message if status is ERROR */
    errorMessage?: string;
  };
  
  /** Creation timestamp */
  createdAt: number;
  
  /** Last update timestamp */
  updatedAt: number;
}

/**
 * Database row interface (raw SQLite data)
 */
export interface MCPServerRow {
  id: string;
  name: string;
  template: string;
  path: string;
  status: string;
  metadata: string; // JSON string
  created_at: number;
  updated_at: number;
}

/**
 * Server creation input
 */
export interface CreateMCPServerInput {
  name: string;
  template: string;
  path: string;
  templateVariables?: Record<string, unknown>;
  description?: string;
  tags?: string[];
}

/**
 * Server update input
 */
export interface UpdateMCPServerInput {
  status?: MCPServerStatus;
  metadata?: Partial<MCPServerMetadata['metadata']>;
  errorMessage?: string;
}

/**
 * Server query filters
 */
export interface MCPServerFilters {
  status?: MCPServerStatus;
  template?: string;
  language?: string;
  tags?: string[];
  search?: string; // Search in name or description
}

/**
 * Convert database row to metadata object
 */
export function rowToMetadata(row: MCPServerRow): MCPServerMetadata {
  return {
    id: row.id,
    name: row.name,
    template: row.template,
    path: row.path,
    status: row.status as MCPServerStatus,
    metadata: JSON.parse(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert metadata object to database row
 */
export function metadataToRow(metadata: MCPServerMetadata): MCPServerRow {
  return {
    id: metadata.id,
    name: metadata.name,
    template: metadata.template,
    path: metadata.path,
    status: metadata.status,
    metadata: JSON.stringify(metadata.metadata),
    created_at: metadata.createdAt,
    updated_at: metadata.updatedAt,
  };
}