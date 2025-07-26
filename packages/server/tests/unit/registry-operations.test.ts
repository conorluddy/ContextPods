/**
 * Unit tests for Registry Operations Layer
 * Checkpoint 2.2: Registry Operations Layer Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RegistryOperations } from '../../src/registry/operations.js';
import { RegistryDatabase } from '../../src/registry/database.js';
import {
  MCPServerStatus,
  type CreateMCPServerInput,
  type MCPServerMetadata,
} from '../../src/registry/models.js';

// Mock the database singleton to use separate instances per test
vi.mock('../../src/registry/database.js', async () => {
  const actual = await vi.importActual('../../src/registry/database.js');
  return {
    ...actual,
    getRegistryDatabase: vi.fn(),
  };
});

describe('Registry Operations Layer', () => {
  let operations: RegistryOperations;
  let mockDatabase: RegistryDatabase;
  let tempDbPath: string;

  beforeEach(async () => {
    // Create unique database for each test
    tempDbPath = `/tmp/test-operations-registry-${Date.now()}-${Math.random().toString(36).substring(7)}.db`;
    mockDatabase = new RegistryDatabase(tempDbPath);
    await mockDatabase.initialize();

    // Mock the singleton to return our test database
    const { getRegistryDatabase } = await import('../../src/registry/database.js');
    vi.mocked(getRegistryDatabase).mockResolvedValue(mockDatabase);

    operations = new RegistryOperations();
    await operations.initialize();
  });

  afterEach(async () => {
    // Clean up database
    await mockDatabase.close();
    try {
      const fs = await import('fs/promises');
      await fs.unlink(tempDbPath);
    } catch {
      // Ignore cleanup errors
    }
    vi.resetAllMocks();
  });

  /**
   * Test 1: Server Registration
   */
  describe('Server Registration', () => {
    it('should register new server with complete metadata', async () => {
      // Setup: Server registration input
      const serverInput: CreateMCPServerInput = {
        name: 'test-typescript-server',
        template: 'typescript-advanced',
        path: '/projects/test-server',
        templateVariables: {
          serverName: 'TestServer',
          description: 'A test TypeScript MCP server',
          author: 'Test Author',
        },
        description: 'Advanced TypeScript server for testing',
        tags: ['typescript', 'test', 'advanced'],
      };

      // Action: Register the server
      const registeredServer = await operations.registerServer(serverInput);

      // Assert: Server registered with correct metadata
      expect(registeredServer).toBeTruthy();
      expect(registeredServer.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      ); // UUID format
      expect(registeredServer.name).toBe('test-typescript-server');
      expect(registeredServer.template).toBe('typescript-advanced');
      expect(registeredServer.path).toBe('/projects/test-server');
      expect(registeredServer.status).toBe(MCPServerStatus.CREATED);

      // Verify metadata structure
      expect(registeredServer.metadata.templateVariables).toEqual({
        serverName: 'TestServer',
        description: 'A test TypeScript MCP server',
        author: 'Test Author',
      });
      expect(registeredServer.metadata.description).toBe('Advanced TypeScript server for testing');
      expect(registeredServer.metadata.tags).toEqual(['typescript', 'test', 'advanced']);

      // Verify timestamps
      expect(registeredServer.createdAt).toBeLessThanOrEqual(Date.now());
      expect(registeredServer.updatedAt).toBe(registeredServer.createdAt);
    });

    it('should prevent duplicate server names', async () => {
      // Setup: Register first server
      const firstServerInput: CreateMCPServerInput = {
        name: 'duplicate-name-test',
        template: 'basic-nodejs',
        path: '/projects/first-server',
      };
      await operations.registerServer(firstServerInput);

      // Setup: Try to register second server with same name
      const duplicateServerInput: CreateMCPServerInput = {
        name: 'duplicate-name-test',
        template: 'python-basic',
        path: '/projects/second-server',
      };

      // Action & Assert: Should throw error for duplicate name
      await expect(operations.registerServer(duplicateServerInput)).rejects.toThrow(
        "Server name 'duplicate-name-test' is already taken",
      );
    });

    it('should handle minimal server registration', async () => {
      // Setup: Minimal server input (only required fields)
      const minimalInput: CreateMCPServerInput = {
        name: 'minimal-server',
        template: 'basic-template',
        path: '/minimal/path',
      };

      // Action: Register minimal server
      const registeredServer = await operations.registerServer(minimalInput);

      // Assert: Server registered with defaults
      expect(registeredServer.name).toBe('minimal-server');
      expect(registeredServer.template).toBe('basic-template');
      expect(registeredServer.path).toBe('/minimal/path');
      expect(registeredServer.status).toBe(MCPServerStatus.CREATED);
      expect(registeredServer.metadata.templateVariables).toEqual({});
      expect(registeredServer.metadata.tags).toEqual([]);
      expect(registeredServer.metadata.description).toBeUndefined();
    });
  });

  /**
   * Test 2: Operations Lifecycle
   */
  describe('Operations Lifecycle', () => {
    let serverId: string;

    beforeEach(async () => {
      // Register a test server for lifecycle operations
      const serverInput: CreateMCPServerInput = {
        name: 'lifecycle-test-server',
        template: 'typescript-advanced',
        path: '/projects/lifecycle-test',
        description: 'Server for testing lifecycle operations',
      };
      const registered = await operations.registerServer(serverInput);
      serverId = registered.id;
    });

    it('should handle complete server lifecycle', async () => {
      // Phase 1: Mark server as building
      const buildingSuccess = await operations.markServerBuilding(serverId);
      expect(buildingSuccess).toBe(true);

      let server = await operations.getServer(serverId);
      expect(server!.status).toBe(MCPServerStatus.BUILDING);
      expect(server!.metadata.lastBuildStatus).toBe('pending');
      expect(server!.metadata.lastBuildTime).toBeGreaterThan(0);

      // Phase 2: Mark server as ready
      const readySuccess = await operations.markServerReady(
        serverId,
        'npm run build',
        'npm run dev',
      );
      expect(readySuccess).toBe(true);

      server = await operations.getServer(serverId);
      expect(server!.status).toBe(MCPServerStatus.READY);
      expect(server!.metadata.lastBuildStatus).toBe('success');
      expect(server!.metadata.buildCommand).toBe('npm run build');
      expect(server!.metadata.devCommand).toBe('npm run dev');

      // Phase 3: Mark server as error
      const errorSuccess = await operations.markServerError(
        serverId,
        'Build failed: TypeScript compilation error',
      );
      expect(errorSuccess).toBe(true);

      server = await operations.getServer(serverId);
      expect(server!.status).toBe(MCPServerStatus.ERROR);
      expect(server!.metadata.lastBuildStatus).toBe('failure');
      expect(server!.metadata.errorMessage).toBe('Build failed: TypeScript compilation error');
    });

    it('should update server status with custom metadata', async () => {
      // Action: Update server status with custom metadata
      const customUpdateSuccess = await operations.updateServer(serverId, {
        status: MCPServerStatus.BUILDING,
        metadata: {
          buildStartTime: Date.now(),
          buildVersion: '1.2.3',
          buildEnvironment: 'production',
        },
      });

      // Assert: Update successful with custom metadata
      expect(customUpdateSuccess).toBe(true);

      const updatedServer = await operations.getServer(serverId);
      expect(updatedServer!.status).toBe(MCPServerStatus.BUILDING);
      expect(updatedServer!.metadata.buildStartTime).toBeGreaterThan(0);
      expect(updatedServer!.metadata.buildVersion).toBe('1.2.3');
      expect(updatedServer!.metadata.buildEnvironment).toBe('production');
    });

    it('should handle status updates for non-existent servers', async () => {
      // Action: Try to update non-existent server
      const nonExistentSuccess = await operations.updateServerStatus(
        'non-existent-id',
        MCPServerStatus.READY,
      );

      // Assert: Update should fail gracefully
      expect(nonExistentSuccess).toBe(false);
    });
  });

  /**
   * Test 3: Name Validation
   */
  describe('Name Validation', () => {
    beforeEach(async () => {
      // Register some test servers for name validation testing
      const servers = [
        { name: 'existing-server-1', template: 'typescript-basic', path: '/path/1' },
        { name: 'existing-server-2', template: 'python-basic', path: '/path/2' },
        { name: 'existing-server-3', template: 'nodejs-basic', path: '/path/3' },
      ];

      for (const serverData of servers) {
        await operations.registerServer(serverData);
      }
    });

    it('should check name availability correctly', async () => {
      // Test existing names
      expect(await operations.isNameAvailable('existing-server-1')).toBe(false);
      expect(await operations.isNameAvailable('existing-server-2')).toBe(false);
      expect(await operations.isNameAvailable('existing-server-3')).toBe(false);

      // Test available names
      expect(await operations.isNameAvailable('new-server-name')).toBe(true);
      expect(await operations.isNameAvailable('available-name')).toBe(true);
      expect(await operations.isNameAvailable('unique-server')).toBe(true);
    });

    it('should enforce name uniqueness during registration', async () => {
      // Action: Try to register servers with existing names
      const duplicateAttempts = [
        { name: 'existing-server-1', template: 'new-template', path: '/new/path' },
        { name: 'existing-server-2', template: 'another-template', path: '/another/path' },
      ];

      // Assert: All attempts should fail
      for (const attempt of duplicateAttempts) {
        await expect(operations.registerServer(attempt)).rejects.toThrow(
          `Server name '${attempt.name}' is already taken`,
        );
      }
    });

    it('should allow registration of servers with unique names', async () => {
      // Action: Register servers with unique names
      const uniqueServers = [
        { name: 'unique-server-1', template: 'typescript-advanced', path: '/unique/1' },
        { name: 'unique-server-2', template: 'python-advanced', path: '/unique/2' },
      ];

      // Assert: All registrations should succeed
      for (const serverData of uniqueServers) {
        const registered = await operations.registerServer(serverData);
        expect(registered.name).toBe(serverData.name);
        expect(registered.status).toBe(MCPServerStatus.CREATED);
      }
    });
  });

  /**
   * Test 4: Server Queries
   */
  describe('Server Queries', () => {
    let registeredServers: MCPServerMetadata[];

    beforeEach(async () => {
      // Register multiple servers with different characteristics for query testing
      const serverInputs: CreateMCPServerInput[] = [
        {
          name: 'typescript-query-server',
          template: 'typescript-advanced',
          path: '/query/typescript',
          description: 'TypeScript server for query testing',
          tags: ['typescript', 'advanced', 'query-test'],
        },
        {
          name: 'python-query-server',
          template: 'python-basic',
          path: '/query/python',
          description: 'Python server for query testing',
          tags: ['python', 'basic', 'query-test'],
        },
        {
          name: 'nodejs-query-server',
          template: 'nodejs-basic',
          path: '/query/nodejs',
          description: 'Node.js server for query testing',
          tags: ['nodejs', 'basic', 'query-test'],
        },
      ];

      registeredServers = [];
      for (const input of serverInputs) {
        const registered = await operations.registerServer(input);
        registeredServers.push(registered);
      }

      // Update some servers to different statuses for filtering tests
      await operations.markServerReady(registeredServers[0].id);
      await operations.markServerBuilding(registeredServers[1].id);
      // Keep the third server in CREATED status
    });

    it('should retrieve servers by ID', async () => {
      // Action: Get servers by their IDs
      for (const server of registeredServers) {
        const retrieved = await operations.getServer(server.id);

        // Assert: Retrieved server matches registered server
        expect(retrieved).toBeTruthy();
        expect(retrieved!.id).toBe(server.id);
        expect(retrieved!.name).toBe(server.name);
        expect(retrieved!.template).toBe(server.template);
        expect(retrieved!.path).toBe(server.path);
      }

      // Test non-existent ID
      const nonExistent = await operations.getServer('non-existent-id');
      expect(nonExistent).toBeNull();
    });

    it('should retrieve servers by name', async () => {
      // Action: Get servers by their names
      const typeScriptServer = await operations.getServerByName('typescript-query-server');
      const pythonServer = await operations.getServerByName('python-query-server');
      const nodejsServer = await operations.getServerByName('nodejs-query-server');

      // Assert: Retrieved servers match expected servers
      expect(typeScriptServer).toBeTruthy();
      expect(typeScriptServer!.name).toBe('typescript-query-server');
      expect(typeScriptServer!.template).toBe('typescript-advanced');

      expect(pythonServer).toBeTruthy();
      expect(pythonServer!.name).toBe('python-query-server');
      expect(pythonServer!.template).toBe('python-basic');

      expect(nodejsServer).toBeTruthy();
      expect(nodejsServer!.name).toBe('nodejs-query-server');
      expect(nodejsServer!.template).toBe('nodejs-basic');

      // Test non-existent name
      const nonExistent = await operations.getServerByName('non-existent-server');
      expect(nonExistent).toBeNull();
    });

    it('should filter servers by status', async () => {
      // Action: Get servers by different statuses
      const readyServers = await operations.getServersByStatus(MCPServerStatus.READY);
      const buildingServers = await operations.getServersByStatus(MCPServerStatus.BUILDING);
      const createdServers = await operations.getServersByStatus(MCPServerStatus.CREATED);

      // Assert: Correct servers returned for each status
      expect(readyServers).toHaveLength(1);
      expect(readyServers[0].name).toBe('typescript-query-server');

      expect(buildingServers).toHaveLength(1);
      expect(buildingServers[0].name).toBe('python-query-server');

      expect(createdServers).toHaveLength(1);
      expect(createdServers[0].name).toBe('nodejs-query-server');
    });

    it('should filter servers by template', async () => {
      // Action: Get servers by template
      const advancedServers = await operations.getServersByTemplate('typescript-advanced');
      const basicServers = await operations.getServersByTemplate('python-basic');

      // Assert: Correct servers returned for each template
      expect(advancedServers).toHaveLength(1);
      expect(advancedServers[0].template).toBe('typescript-advanced');
      expect(advancedServers[0].name).toBe('typescript-query-server');

      expect(basicServers).toHaveLength(1);
      expect(basicServers[0].template).toBe('python-basic');
      expect(basicServers[0].name).toBe('python-query-server');
    });

    it('should list servers with complex filters', async () => {
      // Action: List servers with combined filters
      const complexFilters = {
        status: MCPServerStatus.CREATED,
        template: 'nodejs-basic',
        search: 'Node.js',
      };

      const filteredServers = await operations.listServers(complexFilters);

      // Assert: Only matching servers returned
      expect(filteredServers).toHaveLength(1);
      expect(filteredServers[0].name).toBe('nodejs-query-server');
      expect(filteredServers[0].status).toBe(MCPServerStatus.CREATED);
      expect(filteredServers[0].template).toBe('nodejs-basic');
    });
  });

  /**
   * Test 5: Statistics
   */
  describe('Statistics', () => {
    beforeEach(async () => {
      // Register servers with different characteristics for statistics testing
      const serverInputs: CreateMCPServerInput[] = [
        // TypeScript servers
        { name: 'ts-server-1', template: 'typescript-advanced', path: '/stats/ts1' },
        { name: 'ts-server-2', template: 'typescript-basic', path: '/stats/ts2' },
        { name: 'ts-server-3', template: 'typescript-advanced', path: '/stats/ts3' },

        // Python servers
        { name: 'py-server-1', template: 'python-basic', path: '/stats/py1' },
        { name: 'py-server-2', template: 'python-advanced', path: '/stats/py2' },

        // Node.js servers
        { name: 'node-server-1', template: 'nodejs-basic', path: '/stats/node1' },
        { name: 'node-server-2', template: 'nodejs-basic', path: '/stats/node2' },
      ];

      const registeredServers = [];
      for (const input of serverInputs) {
        const registered = await operations.registerServer(input);
        registeredServers.push(registered);
      }

      // Set different statuses for statistical diversity
      await operations.markServerReady(registeredServers[0].id); // ts-server-1
      await operations.markServerReady(registeredServers[1].id); // ts-server-2
      await operations.markServerBuilding(registeredServers[2].id); // ts-server-3
      await operations.markServerReady(registeredServers[3].id); // py-server-1
      await operations.markServerError(registeredServers[4].id, 'Build failed'); // py-server-2
      // node servers remain in CREATED status
    });

    it('should calculate comprehensive server statistics', async () => {
      // Action: Get statistics
      const stats = await operations.getStatistics();

      // Assert: Total count is correct
      expect(stats.total).toBe(7);

      // Assert: Status distribution is correct
      expect(stats.byStatus[MCPServerStatus.CREATED]).toBe(2); // node servers
      expect(stats.byStatus[MCPServerStatus.BUILDING]).toBe(1); // ts-server-3
      expect(stats.byStatus[MCPServerStatus.READY]).toBe(3); // ts-server-1, ts-server-2, py-server-1
      expect(stats.byStatus[MCPServerStatus.ERROR]).toBe(1); // py-server-2
      expect(stats.byStatus[MCPServerStatus.ARCHIVED]).toBe(0); // none

      // Assert: Template distribution is correct
      expect(stats.byTemplate['typescript-advanced']).toBe(2);
      expect(stats.byTemplate['typescript-basic']).toBe(1);
      expect(stats.byTemplate['python-basic']).toBe(1);
      expect(stats.byTemplate['python-advanced']).toBe(1);
      expect(stats.byTemplate['nodejs-basic']).toBe(2);

      // Assert: Recently created count (all servers created within last 24 hours)
      expect(stats.recentlyCreated).toBe(7);
    });

    it('should handle statistics for empty registry', async () => {
      // Setup: Delete all servers first
      const allServers = await operations.listServers();
      for (const server of allServers) {
        await operations.deleteServer(server.id);
      }

      // Action: Get statistics for empty registry
      const emptyStats = await operations.getStatistics();

      // Assert: All counts should be zero
      expect(emptyStats.total).toBe(0);
      expect(emptyStats.recentlyCreated).toBe(0);

      // All status counts should be zero
      Object.values(MCPServerStatus).forEach((status) => {
        expect(emptyStats.byStatus[status]).toBe(0);
      });

      // Template counts should be empty object
      expect(Object.keys(emptyStats.byTemplate)).toHaveLength(0);
    });

    it('should track recently created servers correctly', async () => {
      // Setup: Create additional server and verify it's counted as recent
      const recentServerInput: CreateMCPServerInput = {
        name: 'recent-server',
        template: 'test-template',
        path: '/recent/server',
      };

      await operations.registerServer(recentServerInput);

      // Action: Get updated statistics
      const updatedStats = await operations.getStatistics();

      // Assert: Total increased and recent count includes new server
      expect(updatedStats.total).toBe(8); // 7 + 1 new server
      expect(updatedStats.recentlyCreated).toBe(8); // All created recently
      expect(updatedStats.byTemplate['test-template']).toBe(1);
    });
  });
});
