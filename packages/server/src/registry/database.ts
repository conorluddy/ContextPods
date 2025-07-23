/**
 * SQLite database for MCP server registry
 */

import { Database } from 'sqlite3';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { logger } from '@context-pods/core';
import { CONFIG } from '../config/index.js';
import type {
  MCPServerMetadata,
  MCPServerRow,
  MCPServerFilters,
} from './models.js';
import {
  rowToMetadata,
  metadataToRow,
} from './models.js';

/**
 * Registry database class
 */
export class RegistryDatabase {
  private db: Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || CONFIG.registryPath;
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(dirname(this.dbPath), { recursive: true });

      // Open database connection
      this.db = await this.openDatabase();

      // Configure database settings
      await this.configureDatabaseSettings();

      // Create tables if they don't exist
      await this.createTables();

      logger.info(`Registry database initialized at: ${this.dbPath}`);
    } catch (error) {
      logger.error('Failed to initialize registry database:', error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db!.close((error) => {
          if (error) {
            logger.error('Error closing database:', error);
            reject(error);
          } else {
            logger.info('Registry database closed');
            resolve();
          }
        });
      });
    }
  }

  /**
   * Create a new MCP server record
   */
  async createServer(metadata: MCPServerMetadata): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const row = metadataToRow(metadata);
    const sql = `
      INSERT INTO mcp_servers (
        id, name, template, path, status, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db!.run(
        sql,
        [
          row.id,
          row.name,
          row.template,
          row.path,
          row.status,
          row.metadata,
          row.created_at,
          row.updated_at,
        ],
        function (error) {
          if (error) {
            logger.error('Error creating server record:', error);
            reject(error);
          } else {
            logger.info(`Created server record: ${metadata.name} (${metadata.id})`);
            resolve();
          }
        }
      );
    });
  }

  /**
   * Get a server by ID
   */
  async getServer(id: string): Promise<MCPServerMetadata | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const sql = 'SELECT * FROM mcp_servers WHERE id = ?';

    return new Promise((resolve, reject) => {
      this.db!.get(sql, [id], (error, row: MCPServerRow) => {
        if (error) {
          logger.error('Error getting server:', error);
          reject(error);
        } else if (row) {
          resolve(rowToMetadata(row));
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Update a server record
   */
  async updateServer(id: string, updates: Partial<MCPServerMetadata>): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Get current record
    const current = await this.getServer(id);
    if (!current) {
      return false;
    }

    // Merge updates
    const updated: MCPServerMetadata = {
      ...current,
      ...updates,
      metadata: {
        ...current.metadata,
        ...updates.metadata,
      },
      updatedAt: Date.now(),
    };

    const row = metadataToRow(updated);
    const sql = `
      UPDATE mcp_servers 
      SET name = ?, template = ?, path = ?, status = ?, metadata = ?, updated_at = ?
      WHERE id = ?
    `;

    return new Promise((resolve, reject) => {
      this.db!.run(
        sql,
        [row.name, row.template, row.path, row.status, row.metadata, row.updated_at, id],
        function (error) {
          if (error) {
            logger.error('Error updating server:', error);
            reject(error);
          } else {
            logger.info(`Updated server record: ${updated.name} (${id})`);
            resolve(this.changes > 0);
          }
        }
      );
    });
  }

  /**
   * Delete a server record
   */
  async deleteServer(id: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const sql = 'DELETE FROM mcp_servers WHERE id = ?';

    return new Promise((resolve, reject) => {
      this.db!.run(sql, [id], function (error) {
        if (error) {
          logger.error('Error deleting server:', error);
          reject(error);
        } else {
          logger.info(`Deleted server record: ${id}`);
          resolve(this.changes > 0);
        }
      });
    });
  }

  /**
   * List servers with optional filters
   */
  async listServers(filters?: MCPServerFilters): Promise<MCPServerMetadata[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    let sql = 'SELECT * FROM mcp_servers';
    const params: (string | number)[] = [];

    // Build WHERE clause
    const conditions: string[] = [];

    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters?.template) {
      conditions.push('template = ?');
      params.push(filters.template);
    }

    if (filters?.language) {
      conditions.push('JSON_EXTRACT(metadata, "$.language") = ?');
      params.push(filters.language);
    }

    if (filters?.search) {
      conditions.push('(name LIKE ? OR JSON_EXTRACT(metadata, "$.description") LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (error, rows: MCPServerRow[]) => {
        if (error) {
          logger.error('Error listing servers:', error);
          reject(error);
        } else {
          const servers = rows.map(rowToMetadata);
          resolve(servers);
        }
      });
    });
  }

  /**
   * Check if a server name is available
   */
  async isNameAvailable(name: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const sql = 'SELECT COUNT(*) as count FROM mcp_servers WHERE name = ?';

    return new Promise((resolve, reject) => {
      this.db!.get(sql, [name], (error, row: { count: number }) => {
        if (error) {
          logger.error('Error checking name availability:', error);
          reject(error);
        } else {
          resolve(row.count === 0);
        }
      });
    });
  }

  /**
   * Open database connection
   */
  private openDatabase(): Promise<Database> {
    return new Promise((resolve, reject) => {
      const db = new Database(this.dbPath, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(db);
        }
      });
    });
  }

  /**
   * Configure database settings
   */
  private configureDatabaseSettings(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const settings = [
      `PRAGMA busy_timeout = ${CONFIG.database.busyTimeout}`,
      `PRAGMA journal_mode = ${CONFIG.database.journalMode}`,
      `PRAGMA synchronous = ${CONFIG.database.synchronous}`,
      'PRAGMA foreign_keys = ON',
    ];

    return Promise.all(
      settings.map(
        (sql) =>
          new Promise<void>((resolve, reject) => {
            this.db!.run(sql, (error) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            });
          })
      )
    ).then(() => {
      logger.debug('Database settings configured');
    });
  }

  /**
   * Create database tables
   */
  private createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        template TEXT NOT NULL,
        path TEXT NOT NULL,
        status TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;

    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_mcp_servers_name ON mcp_servers(name)',
      'CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON mcp_servers(status)',
      'CREATE INDEX IF NOT EXISTS idx_mcp_servers_template ON mcp_servers(template)',
      'CREATE INDEX IF NOT EXISTS idx_mcp_servers_created_at ON mcp_servers(created_at)',
    ];

    return new Promise((resolve, reject) => {
      this.db!.run(createTableSQL, (error) => {
        if (error) {
          reject(error);
        } else {
          // Create indexes
          Promise.all(
            createIndexes.map(
              (sql) =>
                new Promise<void>((resolve, reject) => {
                  this.db!.run(sql, (error) => {
                    if (error) {
                      reject(error);
                    } else {
                      resolve();
                    }
                  });
                })
            )
          )
            .then(() => {
              logger.debug('Database tables and indexes created');
              resolve();
            })
            .catch(reject);
        }
      });
    });
  }
}

// Singleton instance
let registryDatabase: RegistryDatabase | null = null;

/**
 * Get the registry database instance
 */
export async function getRegistryDatabase(): Promise<RegistryDatabase> {
  if (!registryDatabase) {
    registryDatabase = new RegistryDatabase();
    await registryDatabase.initialize();
  }
  return registryDatabase;
}