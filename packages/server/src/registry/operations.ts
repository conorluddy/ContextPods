/**
 * High-level registry operations
 */

import { randomUUID } from 'crypto';
import { logger } from '@context-pods/core';
import { getRegistryDatabase, RegistryDatabase } from './database.js';
import type {
  MCPServerMetadata,
  CreateMCPServerInput,
  UpdateMCPServerInput,
  MCPServerFilters,
} from './models.js';
import { MCPServerStatus } from './models.js';

/**
 * Registry operations class
 */
export class RegistryOperations {
  private database: ReturnType<typeof getRegistryDatabase> | null = null;

  /**
   * Initialize operations
   */
  async initialize(): Promise<void> {
    this.database = getRegistryDatabase();
    await this.database;
  }

  /**
   * Register a new MCP server
   */
  async registerServer(input: CreateMCPServerInput): Promise<MCPServerMetadata> {
    const db = await this.ensureDatabase();

    // Check name availability
    const isAvailable = await db.isNameAvailable(input.name);
    if (!isAvailable) {
      throw new Error(`Server name '${input.name}' is already taken`);
    }

    // Create server metadata
    const now = Date.now();
    const metadata: MCPServerMetadata = {
      id: randomUUID(),
      name: input.name,
      template: input.template,
      path: input.path,
      status: MCPServerStatus.CREATED,
      metadata: {
        templateVariables: input.templateVariables || {},
        description: input.description,
        tags: input.tags || [],
      },
      createdAt: now,
      updatedAt: now,
    };

    // Save to database
    await db.createServer(metadata);

    logger.info(`Registered new MCP server: ${input.name} (${metadata.id})`);
    return metadata;
  }

  /**
   * Get server by ID
   */
  async getServer(id: string): Promise<MCPServerMetadata | null> {
    const db = await this.ensureDatabase();
    return await db.getServer(id);
  }

  /**
   * Get server by name
   */
  async getServerByName(name: string): Promise<MCPServerMetadata | null> {
    const db = await this.ensureDatabase();
    const servers = await db.listServers({ search: name });
    return servers.find((server: MCPServerMetadata) => server.name === name) || null;
  }

  /**
   * Update server
   */
  async updateServer(id: string, updates: UpdateMCPServerInput): Promise<boolean> {
    const db = await this.ensureDatabase();

    const updateData: Partial<MCPServerMetadata> = {};

    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }

    if (updates.metadata) {
      updateData.metadata = updates.metadata;
    }

    // Add error message to metadata if provided
    if (updates.errorMessage) {
      updateData.metadata = {
        ...updateData.metadata,
        errorMessage: updates.errorMessage,
      };
    }

    const success = await db.updateServer(id, updateData);
    if (success) {
      logger.info(`Updated server: ${id}`);
    } else {
      logger.warn(`Failed to update server (not found): ${id}`);
    }

    return success;
  }

  /**
   * Update server status
   */
  async updateServerStatus(
    id: string,
    status: MCPServerStatus,
    errorMessage?: string
  ): Promise<boolean> {
    return await this.updateServer(id, { status, errorMessage });
  }

  /**
   * Mark server as building
   */
  async markServerBuilding(id: string): Promise<boolean> {
    return await this.updateServer(id, {
      status: MCPServerStatus.BUILDING,
      metadata: {
        lastBuildStatus: 'pending',
        lastBuildTime: Date.now(),
      },
    });
  }

  /**
   * Mark server as ready
   */
  async markServerReady(
    id: string,
    buildCommand?: string,
    devCommand?: string
  ): Promise<boolean> {
    return await this.updateServer(id, {
      status: MCPServerStatus.READY,
      metadata: {
        lastBuildStatus: 'success',
        lastBuildTime: Date.now(),
        buildCommand,
        devCommand,
      },
    });
  }

  /**
   * Mark server as error
   */
  async markServerError(id: string, errorMessage: string): Promise<boolean> {
    return await this.updateServer(id, {
      status: MCPServerStatus.ERROR,
      metadata: {
        lastBuildStatus: 'failure',
        lastBuildTime: Date.now(),
      },
      errorMessage,
    });
  }

  /**
   * Delete server
   */
  async deleteServer(id: string): Promise<boolean> {
    const db = await this.ensureDatabase();
    
    const server = await db.getServer(id);
    if (server) {
      logger.info(`Deleting server: ${server.name} (${id})`);
    }

    return await db.deleteServer(id);
  }

  /**
   * List servers with filters
   */
  async listServers(filters?: MCPServerFilters): Promise<MCPServerMetadata[]> {
    const db = await this.ensureDatabase();
    return await db.listServers(filters);
  }

  /**
   * Get servers by status
   */
  async getServersByStatus(status: MCPServerStatus): Promise<MCPServerMetadata[]> {
    return await this.listServers({ status });
  }

  /**
   * Get servers by template
   */
  async getServersByTemplate(template: string): Promise<MCPServerMetadata[]> {
    return await this.listServers({ template });
  }

  /**
   * Check if server name is available
   */
  async isNameAvailable(name: string): Promise<boolean> {
    const db = await this.ensureDatabase();
    return await db.isNameAvailable(name);
  }

  /**
   * Get server statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<MCPServerStatus, number>;
    byTemplate: Record<string, number>;
    recentlyCreated: number; // Last 24 hours
  }> {
    const servers = await this.listServers();
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const statistics = {
      total: servers.length,
      byStatus: {} as Record<MCPServerStatus, number>,
      byTemplate: {} as Record<string, number>,
      recentlyCreated: 0,
    };

    // Initialize status counts
    Object.values(MCPServerStatus).forEach(status => {
      statistics.byStatus[status] = 0;
    });

    // Count servers
    servers.forEach(server => {
      // Count by status
      statistics.byStatus[server.status]++;

      // Count by template
      statistics.byTemplate[server.template] = (statistics.byTemplate[server.template] || 0) + 1;

      // Count recently created
      if (server.createdAt > oneDayAgo) {
        statistics.recentlyCreated++;
      }
    });

    return statistics;
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDatabase(): Promise<RegistryDatabase> {
    if (!this.database) {
      await this.initialize();
    }
    return await this.database!;
  }
}

// Singleton instance
let registryOperations: RegistryOperations | null = null;

/**
 * Get the registry operations instance
 */
export async function getRegistryOperations(): Promise<RegistryOperations> {
  if (!registryOperations) {
    registryOperations = new RegistryOperations();
    await registryOperations.initialize();
  }
  return registryOperations;
}