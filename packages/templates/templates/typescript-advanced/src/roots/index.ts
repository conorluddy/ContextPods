/**
 * Root listing capability for {{serverName}}
 * Implements MCP roots pattern for exposing directory structures and file systems
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListRootsRequestSchema, Root } from '@modelcontextprotocol/sdk/types.js';
import { readdir, stat } from 'fs/promises';
import { join, resolve, basename, dirname } from 'path';
import { logger } from '../utils/logger.js';

/**
 * Root configuration
 */
interface RootConfig {
  /**
   * Root URI identifier
   */
  uri: string;

  /**
   * Display name for the root
   */
  name: string;

  /**
   * Local file system path
   */
  path: string;

  /**
   * Whether this root is readable
   */
  readable?: boolean;

  /**
   * Whether this root is writable
   */
  writable?: boolean;

  /**
   * File/directory patterns to include
   */
  include?: string[];

  /**
   * File/directory patterns to exclude
   */
  exclude?: string[];

  /**
   * Maximum depth for directory traversal
   */
  maxDepth?: number;

  /**
   * Whether to show hidden files/directories
   */
  showHidden?: boolean;
}

/**
 * File system entry
 */
interface FileSystemEntry {
  name: string;
  path: string;
  uri: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
  permissions?: {
    readable: boolean;
    writable: boolean;
    executable: boolean;
  };
}

/**
 * Root manager for handling multiple root configurations
 */
export class RootManager {
  private roots: Map<string, RootConfig> = new Map();

  constructor() {
    // Add default roots
    this.addDefaultRoots();
  }

  /**
   * Add default root configurations
   */
  private addDefaultRoots(): void {
    // Current working directory
    this.addRoot({
      uri: '{{serverName}}://cwd',
      name: 'Current Directory',
      path: process.cwd(),
      readable: true,
      writable: false,
      maxDepth: 3,
      exclude: ['node_modules', '.git', 'dist', 'build'],
    });

    // Home directory (read-only)
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (homeDir) {
      this.addRoot({
        uri: '{{serverName}}://home',
        name: 'Home Directory',
        path: homeDir,
        readable: true,
        writable: false,
        maxDepth: 2,
        exclude: ['.*', 'Library', 'System', 'Applications'],
        showHidden: false,
      });
    }

    // Temporary directory
    const tempDir = process.env.TMPDIR || process.env.TEMP || '/tmp';
    this.addRoot({
      uri: '{{serverName}}://temp',
      name: 'Temporary Directory',
      path: tempDir,
      readable: true,
      writable: true,
      maxDepth: 2,
    });
  }

  /**
   * Add a new root configuration
   */
  addRoot(config: RootConfig): void {
    this.roots.set(config.uri, {
      readable: true,
      writable: false,
      maxDepth: 5,
      showHidden: false,
      include: [],
      exclude: [],
      ...config,
    });
    logger.info(`Added root: ${config.name} (${config.uri})`);
  }

  /**
   * Remove a root configuration
   */
  removeRoot(uri: string): boolean {
    const removed = this.roots.delete(uri);
    if (removed) {
      logger.info(`Removed root: ${uri}`);
    }
    return removed;
  }

  /**
   * Get all root configurations
   */
  getRoots(): Root[] {
    return Array.from(this.roots.values()).map((config) => ({
      uri: config.uri,
      name: config.name,
    }));
  }

  /**
   * Get a specific root configuration
   */
  getRoot(uri: string): RootConfig | undefined {
    return this.roots.get(uri);
  }

  /**
   * List directory contents for a root
   */
  async listDirectory(
    rootUri: string,
    relativePath: string = '',
    depth: number = 0,
  ): Promise<FileSystemEntry[]> {
    const rootConfig = this.roots.get(rootUri);
    if (!rootConfig) {
      throw new Error(`Root not found: ${rootUri}`);
    }

    if (!rootConfig.readable) {
      throw new Error(`Root is not readable: ${rootUri}`);
    }

    if (depth > (rootConfig.maxDepth || 5)) {
      throw new Error(`Maximum depth exceeded: ${depth}`);
    }

    const fullPath = resolve(rootConfig.path, relativePath);

    // Security check: ensure path is within root
    if (!fullPath.startsWith(resolve(rootConfig.path))) {
      throw new Error(`Path outside root: ${relativePath}`);
    }

    try {
      const entries = await readdir(fullPath);
      const results: FileSystemEntry[] = [];

      for (const entry of entries) {
        const entryPath = join(fullPath, entry);
        const entryRelativePath = join(relativePath, entry);

        // Check if entry should be excluded
        if (this.shouldExclude(entry, rootConfig)) {
          continue;
        }

        try {
          const stats = await stat(entryPath);
          const entryUri = `${rootUri}/${entryRelativePath.replace(/\\/g, '/')}`;

          const fileEntry: FileSystemEntry = {
            name: entry,
            path: entryRelativePath,
            uri: entryUri,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.isFile() ? stats.size : undefined,
            modified: stats.mtime,
            permissions: {
              readable: true, // Simplified - could check actual permissions
              writable: rootConfig.writable || false,
              executable: false,
            },
          };

          results.push(fileEntry);
        } catch (error) {
          // Skip entries we can't stat (permissions, etc.)
          logger.debug(`Skipping entry ${entry}: ${error}`);
        }
      }

      // Sort results: directories first, then files
      results.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return results;
    } catch (error) {
      logger.error(`Failed to list directory ${fullPath}:`, error);
      throw new Error(`Failed to list directory: ${relativePath}`);
    }
  }

  /**
   * Check if an entry should be excluded based on root configuration
   */
  private shouldExclude(entryName: string, config: RootConfig): boolean {
    // Hidden files
    if (!config.showHidden && entryName.startsWith('.')) {
      return true;
    }

    // Explicit exclusions
    if (
      config.exclude &&
      config.exclude.some((pattern) => this.matchesPattern(entryName, pattern))
    ) {
      return true;
    }

    // Explicit inclusions (if specified, only include matching patterns)
    if (config.include && config.include.length > 0) {
      return !config.include.some((pattern) => this.matchesPattern(entryName, pattern));
    }

    return false;
  }

  /**
   * Simple pattern matching (supports wildcards)
   */
  private matchesPattern(name: string, pattern: string): boolean {
    if (pattern === name) {
      return true;
    }

    // Convert glob pattern to regex
    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(name);
  }

  /**
   * Get statistics about all roots
   */
  getStats(): {
    totalRoots: number;
    readableRoots: number;
    writableRoots: number;
    rootUris: string[];
  } {
    const rootConfigs = Array.from(this.roots.values());

    return {
      totalRoots: rootConfigs.length,
      readableRoots: rootConfigs.filter((r) => r.readable).length,
      writableRoots: rootConfigs.filter((r) => r.writable).length,
      rootUris: rootConfigs.map((r) => r.uri),
    };
  }
}

// Global root manager instance
export const rootManager = new RootManager();

/**
 * Register root listing capabilities with the server
 */
export async function registerRoots(server: Server): Promise<void> {
  logger.info('Registering root listing capabilities for {{serverName}}...');

  // Handle list roots requests
  server.setRequestHandler(ListRootsRequestSchema, async () => {
    const roots = rootManager.getRoots();
    logger.info(`Returning ${roots.length} available roots`);

    return { roots };
  });

  logger.info('Root listing capabilities registered successfully');
}

/**
 * Root management tools
 */
export const rootTools = [
  {
    name: 'list-root-directory',
    title: 'List Root Directory',
    description: 'List contents of a directory within a configured root',
    inputSchema: {
      type: 'object',
      properties: {
        rootUri: {
          type: 'string',
          description: 'URI of the root to list',
        },
        path: {
          type: 'string',
          description: 'Relative path within the root (empty for root directory)',
          default: '',
        },
        depth: {
          type: 'number',
          description: 'Current traversal depth',
          default: 0,
          minimum: 0,
        },
      },
      required: ['rootUri'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        entries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              path: { type: 'string' },
              uri: { type: 'string' },
              type: { type: 'string', enum: ['file', 'directory'] },
              size: { type: 'number' },
              modified: { type: 'string' },
              permissions: {
                type: 'object',
                properties: {
                  readable: { type: 'boolean' },
                  writable: { type: 'boolean' },
                  executable: { type: 'boolean' },
                },
              },
            },
          },
        },
        totalCount: {
          type: 'number',
          description: 'Total number of entries',
        },
        directoryCount: {
          type: 'number',
          description: 'Number of directories',
        },
        fileCount: {
          type: 'number',
          description: 'Number of files',
        },
      },
      required: ['entries', 'totalCount'],
    },
  },
  {
    name: 'get-root-info',
    title: 'Get Root Information',
    description: 'Get detailed information about a specific root',
    inputSchema: {
      type: 'object',
      properties: {
        rootUri: {
          type: 'string',
          description: 'URI of the root to get information about',
        },
      },
      required: ['rootUri'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        uri: { type: 'string' },
        name: { type: 'string' },
        path: { type: 'string' },
        readable: { type: 'boolean' },
        writable: { type: 'boolean' },
        maxDepth: { type: 'number' },
        showHidden: { type: 'boolean' },
        include: {
          type: 'array',
          items: { type: 'string' },
        },
        exclude: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['uri', 'name', 'path'],
    },
  },
];
