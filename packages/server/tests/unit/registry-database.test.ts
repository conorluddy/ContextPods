/**
 * Unit tests for Registry Database Operations
 * Checkpoint 2.1: Registry Database Operations Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { RegistryDatabase } from '../../src/registry/database.js';
import { MCPServerStatus, type MCPServerMetadata } from '../../src/registry/models.js';

describe('Registry Database Operations', () => {
  let database: RegistryDatabase;
  let tempDbPath: string;

  beforeEach(async () => {
    // Create temporary database for each test
    tempDbPath = `/tmp/test-registry-${Date.now()}-${Math.random().toString(36).substring(7)}.db`;
    database = new RegistryDatabase(tempDbPath);
  });

  afterEach(async () => {
    // Clean up database
    await database.close();
    try {
      await fs.unlink(tempDbPath);
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Test 1: Database Initialization
   */
  describe('Database Initialization', () => {
    it('should initialize database with correct schema', async () => {
      // Action: Initialize database
      await database.initialize();

      // Assert: Database file exists and is accessible
      const stats = await fs.stat(tempDbPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should create directory if it does not exist', async () => {
      // Setup: Database path in non-existent directory
      const timestamp = Date.now();
      const nestedPath = `/tmp/nested-${timestamp}/subdir/test.db`;
      const nestedDatabase = new RegistryDatabase(nestedPath);

      try {
        // Action: Initialize database in nested path
        await nestedDatabase.initialize();

        // Assert: Database and directory created
        const stats = await fs.stat(nestedPath);
        expect(stats.isFile()).toBe(true);
      } finally {
        // Cleanup: Close database and remove files/directories
        try {
          await nestedDatabase.close();
        } catch {
          // Ignore close errors
        }

        try {
          await fs.unlink(nestedPath);
          await fs.rmdir(`/tmp/nested-${timestamp}/subdir`);
          await fs.rmdir(`/tmp/nested-${timestamp}`);
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle initialization errors gracefully', async () => {
      // Setup: Invalid database path (read-only directory)
      const invalidPath = '/dev/null/invalid.db';
      const invalidDatabase = new RegistryDatabase(invalidPath);

      // Action & Assert: Should throw error for invalid path
      await expect(invalidDatabase.initialize()).rejects.toThrow();
    });
  });

  /**
   * Test 2: Server Creation
   */
  describe('Server Creation', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    it('should create server record with all metadata', async () => {
      // Setup: Complete server metadata
      const serverMetadata: MCPServerMetadata = {
        id: 'test-server-123',
        name: 'test-server',
        template: 'typescript-advanced',
        path: '/path/to/server',
        status: MCPServerStatus.CREATED,
        metadata: {
          templateVariables: { serverName: 'TestServer' },
          language: 'typescript',
          turboOptimized: true,
          description: 'Test MCP server',
          tags: ['test', 'typescript'],
          buildCommand: 'npm run build',
          devCommand: 'npm run dev',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Action: Create server record
      await database.createServer(serverMetadata);

      // Assert: Server can be retrieved with correct data
      const retrieved = await database.getServer('test-server-123');
      expect(retrieved).toBeTruthy();
      expect(retrieved!.id).toBe('test-server-123');
      expect(retrieved!.name).toBe('test-server');
      expect(retrieved!.template).toBe('typescript-advanced');
      expect(retrieved!.status).toBe(MCPServerStatus.CREATED);
      expect(retrieved!.metadata.language).toBe('typescript');
      expect(retrieved!.metadata.turboOptimized).toBe(true);
      expect(retrieved!.metadata.tags).toEqual(['test', 'typescript']);
    });

    it('should handle duplicate server creation', async () => {
      // Setup: Server metadata
      const serverMetadata: MCPServerMetadata = {
        id: 'duplicate-server',
        name: 'duplicate-test',
        template: 'basic-nodejs',
        path: '/path/to/duplicate',
        status: MCPServerStatus.CREATED,
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Action: Create server twice
      await database.createServer(serverMetadata);

      // Assert: Second creation should fail
      await expect(database.createServer(serverMetadata)).rejects.toThrow();
    });

    it('should require database initialization before creating servers', async () => {
      // Setup: Database not initialized
      const uninitializedDb = new RegistryDatabase('/tmp/uninitialized.db');
      const serverMetadata: MCPServerMetadata = {
        id: 'test-uninit',
        name: 'test-uninit',
        template: 'basic',
        path: '/path',
        status: MCPServerStatus.CREATED,
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Action & Assert: Should throw error
      await expect(uninitializedDb.createServer(serverMetadata)).rejects.toThrow(
        'Database not initialized',
      );
    });
  });

  /**
   * Test 3: Status Updates
   */
  describe('Status Updates', () => {
    let serverId: string;

    beforeEach(async () => {
      await database.initialize();

      // Create a test server
      serverId = 'status-test-server';
      const serverMetadata: MCPServerMetadata = {
        id: serverId,
        name: 'status-test',
        template: 'typescript-basic',
        path: '/path/to/status-test',
        status: MCPServerStatus.CREATED,
        metadata: {
          lastBuildStatus: 'pending',
        },
        createdAt: Date.now(),
        updatedAt: Date.now() - 5000, // Earlier timestamp
      };
      await database.createServer(serverMetadata);
    });

    it('should update server status successfully', async () => {
      // Setup: Get initial creation time
      const initial = await database.getServer(serverId);
      const initialUpdatedAt = initial!.updatedAt;

      // Wait a moment to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Action: Update server status to BUILDING
      const success = await database.updateServer(serverId, {
        status: MCPServerStatus.BUILDING,
        metadata: {
          lastBuildStatus: 'pending',
          lastBuildTime: Date.now(),
        },
      });

      // Assert: Update successful and status changed
      expect(success).toBe(true);

      const updated = await database.getServer(serverId);
      expect(updated!.status).toBe(MCPServerStatus.BUILDING);
      expect(updated!.metadata.lastBuildStatus).toBe('pending');
      expect(updated!.updatedAt).toBeGreaterThan(initialUpdatedAt);
    });

    it('should update metadata while preserving existing fields', async () => {
      // Setup: Add initial metadata
      await database.updateServer(serverId, {
        metadata: {
          language: 'typescript',
          description: 'Initial description',
          tags: ['initial'],
        },
      });

      // Action: Update with partial metadata
      const success = await database.updateServer(serverId, {
        metadata: {
          description: 'Updated description',
          buildCommand: 'npm run build',
        },
      });

      // Assert: Metadata merged correctly
      expect(success).toBe(true);

      const updated = await database.getServer(serverId);
      expect(updated!.metadata.language).toBe('typescript'); // Preserved
      expect(updated!.metadata.description).toBe('Updated description'); // Updated
      expect(updated!.metadata.buildCommand).toBe('npm run build'); // Added
      expect(updated!.metadata.tags).toEqual(['initial']); // Preserved
    });

    it('should return false when updating non-existent server', async () => {
      // Action: Update non-existent server
      const success = await database.updateServer('non-existent-id', {
        status: MCPServerStatus.READY,
      });

      // Assert: Update unsuccessful
      expect(success).toBe(false);
    });

    it('should handle multiple concurrent status updates', async () => {
      // Action: Multiple simultaneous updates
      const updates = Array.from({ length: 5 }, (_, i) =>
        database.updateServer(serverId, {
          metadata: {
            updateIndex: i,
            timestamp: Date.now() + i,
          },
        }),
      );

      // Assert: All updates complete successfully
      const results = await Promise.all(updates);
      expect(results.every((success) => success === true)).toBe(true);

      // Verify final state is consistent
      const final = await database.getServer(serverId);
      expect(final).toBeTruthy();
      expect(final!.metadata.updateIndex).toBeGreaterThanOrEqual(0);
      expect(final!.metadata.updateIndex).toBeLessThan(5);
    });
  });

  /**
   * Test 4: Filtered Listing
   */
  describe('Filtered Listing', () => {
    beforeEach(async () => {
      await database.initialize();

      // Create multiple test servers with different characteristics
      const servers: MCPServerMetadata[] = [
        {
          id: 'ts-server-1',
          name: 'typescript-server-1',
          template: 'typescript-advanced',
          path: '/path/ts1',
          status: MCPServerStatus.READY,
          metadata: {
            language: 'typescript',
            description: 'Advanced TypeScript server',
            tags: ['typescript', 'advanced'],
          },
          createdAt: Date.now() - 3000,
          updatedAt: Date.now() - 2000,
        },
        {
          id: 'ts-server-2',
          name: 'typescript-server-2',
          template: 'typescript-basic',
          path: '/path/ts2',
          status: MCPServerStatus.BUILDING,
          metadata: {
            language: 'typescript',
            description: 'Basic TypeScript server',
            tags: ['typescript', 'basic'],
          },
          createdAt: Date.now() - 2000,
          updatedAt: Date.now() - 1000,
        },
        {
          id: 'py-server-1',
          name: 'python-server-1',
          template: 'python-basic',
          path: '/path/py1',
          status: MCPServerStatus.READY,
          metadata: {
            language: 'python',
            description: 'Python MCP server',
            tags: ['python', 'basic'],
          },
          createdAt: Date.now() - 1000,
          updatedAt: Date.now(),
        },
      ];

      for (const server of servers) {
        await database.createServer(server);
      }
    });

    it('should filter servers by status', async () => {
      // Action: Get servers with READY status
      const readyServers = await database.listServers({ status: MCPServerStatus.READY });

      // Assert: Only READY servers returned
      expect(readyServers).toHaveLength(2);
      expect(readyServers.every((s) => s.status === MCPServerStatus.READY)).toBe(true);
      expect(readyServers.map((s) => s.name)).toContain('typescript-server-1');
      expect(readyServers.map((s) => s.name)).toContain('python-server-1');
    });

    it('should filter servers by template', async () => {
      // Action: Get servers using typescript-advanced template
      const advancedServers = await database.listServers({ template: 'typescript-advanced' });

      // Assert: Only advanced template servers returned
      expect(advancedServers).toHaveLength(1);
      expect(advancedServers[0].template).toBe('typescript-advanced');
      expect(advancedServers[0].name).toBe('typescript-server-1');
    });

    it('should filter servers by language in metadata', async () => {
      // Action: Get TypeScript servers
      const tsServers = await database.listServers({ language: 'typescript' });

      // Assert: Only TypeScript servers returned
      expect(tsServers).toHaveLength(2);
      expect(tsServers.every((s) => s.metadata.language === 'typescript')).toBe(true);
    });

    it('should search servers by name and description', async () => {
      // Action: Search for "Advanced" in name or description
      const searchResults = await database.listServers({ search: 'Advanced' });

      // Assert: Servers matching search term returned
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].metadata.description).toContain('Advanced');
    });

    it('should combine multiple filters', async () => {
      // Action: Get TypeScript servers with READY status
      const filteredServers = await database.listServers({
        status: MCPServerStatus.READY,
        language: 'typescript',
      });

      // Assert: Only servers matching all criteria returned
      expect(filteredServers).toHaveLength(1);
      expect(filteredServers[0].name).toBe('typescript-server-1');
      expect(filteredServers[0].status).toBe(MCPServerStatus.READY);
      expect(filteredServers[0].metadata.language).toBe('typescript');
    });

    it('should return servers ordered by creation date (newest first)', async () => {
      // Action: Get all servers
      const allServers = await database.listServers();

      // Assert: Servers ordered by creation date descending
      expect(allServers).toHaveLength(3);
      expect(allServers[0].name).toBe('python-server-1'); // Most recent
      expect(allServers[1].name).toBe('typescript-server-2'); // Middle
      expect(allServers[2].name).toBe('typescript-server-1'); // Oldest
    });

    it('should return empty array when no servers match filters', async () => {
      // Action: Filter with non-existent criteria
      const noMatches = await database.listServers({
        status: MCPServerStatus.ERROR,
        language: 'rust',
      });

      // Assert: Empty array returned
      expect(noMatches).toHaveLength(0);
    });
  });

  /**
   * Test 5: Concurrent Operations
   */
  describe('Concurrent Operations', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    it('should handle concurrent server creation', async () => {
      // Setup: Multiple servers to create concurrently
      const serverPromises = Array.from({ length: 5 }, (_, i) => {
        const metadata: MCPServerMetadata = {
          id: `concurrent-server-${i}`,
          name: `concurrent-test-${i}`,
          template: 'basic-nodejs',
          path: `/path/concurrent/${i}`,
          status: MCPServerStatus.CREATED,
          metadata: { index: i },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return database.createServer(metadata);
      });

      // Action: Create all servers concurrently
      await Promise.all(serverPromises);

      // Assert: All servers created successfully
      const allServers = await database.listServers();
      expect(allServers).toHaveLength(5);

      const serverNames = allServers.map((s) => s.name).sort();
      const expectedNames = Array.from({ length: 5 }, (_, i) => `concurrent-test-${i}`).sort();
      expect(serverNames).toEqual(expectedNames);
    });

    it('should handle concurrent read/write operations', async () => {
      // Setup: Create initial server
      const serverId = 'concurrent-rw-test';
      const initialMetadata: MCPServerMetadata = {
        id: serverId,
        name: 'concurrent-rw',
        template: 'typescript-basic',
        path: '/path/rw',
        status: MCPServerStatus.CREATED,
        metadata: { counter: 0 },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await database.createServer(initialMetadata);

      // Action: Concurrent reads and writes
      const operations = [
        // Reads
        database.getServer(serverId),
        database.getServer(serverId),
        database.listServers(),
        // Writes
        database.updateServer(serverId, {
          metadata: { counter: 1, operation: 'update-1' },
        }),
        database.updateServer(serverId, {
          metadata: { counter: 2, operation: 'update-2' },
        }),
        // More reads
        database.getServer(serverId),
        database.isNameAvailable('new-name-check'),
      ];

      // Assert: All operations complete without errors
      const results = await Promise.all(operations);
      expect(results).toHaveLength(7);

      // Verify reads succeeded
      expect(results[0]).toBeTruthy(); // getServer
      expect(results[1]).toBeTruthy(); // getServer
      expect(Array.isArray(results[2])).toBe(true); // listServers

      // Verify writes succeeded
      expect(results[3]).toBe(true); // updateServer
      expect(results[4]).toBe(true); // updateServer

      // Verify final read
      expect(results[5]).toBeTruthy(); // getServer
      expect(results[6]).toBe(true); // isNameAvailable
    });

    it('should maintain data consistency under concurrent updates', async () => {
      // Setup: Create server for concurrent updates
      const serverId = 'consistency-test';
      const initialMetadata: MCPServerMetadata = {
        id: serverId,
        name: 'consistency-server',
        template: 'typescript-basic',
        path: '/path/consistency',
        status: MCPServerStatus.CREATED,
        metadata: { updateCount: 0 },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await database.createServer(initialMetadata);

      // Action: Multiple concurrent status updates
      const statusUpdates = [
        MCPServerStatus.BUILDING,
        MCPServerStatus.READY,
        MCPServerStatus.ERROR,
        MCPServerStatus.BUILDING,
        MCPServerStatus.READY,
      ];

      const updatePromises = statusUpdates.map((status, index) =>
        database.updateServer(serverId, {
          status,
          metadata: {
            updateCount: index + 1,
            lastUpdate: Date.now() + index,
          },
        }),
      );

      // Assert: All updates complete
      const updateResults = await Promise.all(updatePromises);
      expect(updateResults.every((success) => success === true)).toBe(true);

      // Verify final state is consistent
      const finalServer = await database.getServer(serverId);
      expect(finalServer).toBeTruthy();
      expect(Object.values(MCPServerStatus)).toContain(finalServer!.status);
      expect(finalServer!.metadata.updateCount).toBeGreaterThan(0);
      expect(finalServer!.metadata.updateCount).toBeLessThanOrEqual(5);
    });
  });
});
