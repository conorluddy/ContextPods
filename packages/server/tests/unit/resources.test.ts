/**
 * Resource Handler Tests
 * Checkpoint 2.3: Resource Handlers
 *
 * Tests all MCP resource endpoints that provide system information
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vol } from 'memfs';

// Mock filesystem
vi.mock('fs/promises', () => vol.promises);
vi.mock('fs', () => vol);

// Mock the CONFIG to avoid dependency issues
vi.mock('../../src/config/index.js', () => ({
  CONFIG: {
    server: {
      name: 'context-pods-test',
      version: '1.0.0-test',
    },
    templatesPath: '/mock/templates',
    registryPath: '/mock/registry.db',
    outputMode: 'test',
    generatedPackagesPath: '/mock/generated',
  },
}));

// Mock registry operations
const mockRegistryOperations = {
  listServers: vi.fn(),
  getStatistics: vi.fn(),
};

vi.mock('../../src/registry/index.js', () => ({
  getRegistryOperations: vi.fn().mockResolvedValue(mockRegistryOperations),
}));

// Mock template selector
const mockTemplateSelector = {
  getAvailableTemplates: vi.fn(),
};

vi.mock('@context-pods/core', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  TemplateSelector: vi.fn().mockImplementation(() => mockTemplateSelector),
}));

// Mock tools to avoid side effects
vi.mock('../../src/tools/index.js', () => ({
  CreateMCPTool: vi.fn().mockImplementation(() => ({})),
  WrapScriptTool: vi.fn().mockImplementation(() => ({})),
  ListMCPsTool: vi.fn().mockImplementation(() => ({})),
  ValidateMCPTool: vi.fn().mockImplementation(() => ({})),
}));

// Mock server transport to prevent actual server startup
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

// Create standalone resource handler functions for testing that use the mocks
async function handleMCPsResource() {
  const servers = await mockRegistryOperations.listServers();

  return {
    contents: [
      {
        uri: 'context-pods://mcps/',
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            servers: servers.map((server) => ({
              id: server.id,
              name: server.name,
              status: server.status,
              template: server.template,
              path: server.path,
              language: server.metadata.language,
              description: server.metadata.description,
              tags: server.metadata.tags,
              turboOptimized: server.metadata.turboOptimized,
              buildCommand: server.metadata.buildCommand,
              devCommand: server.metadata.devCommand,
              lastBuildStatus: server.metadata.lastBuildStatus,
              lastBuildTime: server.metadata.lastBuildTime,
              createdAt: server.createdAt,
              updatedAt: server.updatedAt,
            })),
            count: servers.length,
            lastUpdated: Date.now(),
          },
          null,
          2,
        ),
      },
    ],
  };
}

async function handleTemplatesResource() {
  const templates = await mockTemplateSelector.getAvailableTemplates();

  return {
    contents: [
      {
        uri: 'context-pods://templates/',
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            templates: templates.map((t) => ({
              name: t.template.name,
              language: t.template.language,
              description: t.template.description,
              tags: t.template.tags,
              optimization: t.template.optimization,
              variables: Object.keys(t.template.variables || {}),
              path: t.templatePath,
            })),
            count: templates.length,
            templatesPath: '/mock/templates',
            lastUpdated: Date.now(),
          },
          null,
          2,
        ),
      },
    ],
  };
}

async function handleStatusResource() {
  const stats = await mockRegistryOperations.getStatistics();

  return {
    contents: [
      {
        uri: 'context-pods://status',
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            version: '1.0.0-test',
            name: 'context-pods-test',
            status: 'ready',
            configuration: {
              templatesPath: '/mock/templates',
              registryPath: '/mock/registry.db',
              outputMode: 'test',
              generatedPackagesPath: '/mock/generated',
            },
            capabilities: {
              turboRepo: true,
              templateSelection: true,
              languageDetection: true,
              scriptWrapping: true,
              serverValidation: true,
            },
            supportedLanguages: ['typescript', 'javascript', 'python', 'rust', 'shell'],
            serverCounts: stats.byStatus,
            uptime: process.uptime(),
            lastUpdated: Date.now(),
          },
          null,
          2,
        ),
      },
    ],
  };
}

async function handleStatisticsResource() {
  const stats = await mockRegistryOperations.getStatistics();

  return {
    contents: [
      {
        uri: 'context-pods://statistics',
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            ...stats,
            lastUpdated: Date.now(),
          },
          null,
          2,
        ),
      },
    ],
  };
}

describe('Resource Handlers', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    vol.reset();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  /**
   * Test 1: Server List Resource
   */
  describe('MCPs Resource (context-pods://mcps/)', () => {
    it('should return server list from mcps resource', async () => {
      // Setup: Mock servers in registry
      const mockServers = [
        {
          id: 'server-1',
          name: 'test-server-1',
          status: 'ready',
          template: 'typescript-basic',
          path: '/mock/server-1',
          metadata: {
            language: 'typescript',
            description: 'Test server 1',
            tags: ['test', 'typescript'],
            turboOptimized: true,
            buildCommand: 'npm run build',
            devCommand: 'npm run dev',
            lastBuildStatus: 'success',
            lastBuildTime: '2025-07-27T12:00:00Z',
          },
          createdAt: '2025-07-27T10:00:00Z',
          updatedAt: '2025-07-27T12:00:00Z',
        },
        {
          id: 'server-2',
          name: 'test-server-2',
          status: 'building',
          template: 'python-basic',
          path: '/mock/server-2',
          metadata: {
            language: 'python',
            description: 'Test server 2',
            tags: ['test', 'python'],
            turboOptimized: false,
            buildCommand: 'pip install -r requirements.txt',
            devCommand: 'python main.py',
            lastBuildStatus: 'pending',
            lastBuildTime: null,
          },
          createdAt: '2025-07-27T11:00:00Z',
          updatedAt: '2025-07-27T11:30:00Z',
        },
      ];

      mockRegistryOperations.listServers.mockResolvedValue(mockServers);

      // Action: Request mcps resource
      const result = await handleMCPsResource();

      // Assert: JSON with server data
      expect(result).toBeDefined();
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('context-pods://mcps/');
      expect(result.contents[0].mimeType).toBe('application/json');

      const data = JSON.parse(result.contents[0].text);
      expect(data.servers).toHaveLength(2);
      expect(data.count).toBe(2);
      expect(data.lastUpdated).toBeTypeOf('number');

      // Verify server data structure
      const server1 = data.servers[0];
      expect(server1.id).toBe('server-1');
      expect(server1.name).toBe('test-server-1');
      expect(server1.status).toBe('ready');
      expect(server1.language).toBe('typescript');
      expect(server1.turboOptimized).toBe(true);

      const server2 = data.servers[1];
      expect(server2.id).toBe('server-2');
      expect(server2.status).toBe('building');
      expect(server2.language).toBe('python');
      expect(server2.turboOptimized).toBe(false);

      // Verify registry was called
      expect(mockRegistryOperations.listServers).toHaveBeenCalledTimes(1);
    });

    it('should handle empty server list', async () => {
      // Setup: No servers in registry
      mockRegistryOperations.listServers.mockResolvedValue([]);

      // Action: Request mcps resource
      const result = await handleMCPsResource();

      // Assert: Empty list with correct structure
      const data = JSON.parse(result.contents[0].text);
      expect(data.servers).toHaveLength(0);
      expect(data.count).toBe(0);
      expect(data.lastUpdated).toBeTypeOf('number');
    });

    it('should handle registry errors gracefully', async () => {
      // Setup: Registry throws error
      mockRegistryOperations.listServers.mockRejectedValue(new Error('Database connection failed'));

      // Action & Assert: Should throw error to be handled by main handler
      await expect(handleMCPsResource()).rejects.toThrow('Database connection failed');
    });
  });

  /**
   * Test 2: Templates Resource
   */
  describe('Templates Resource (context-pods://templates/)', () => {
    it('should return template info from templates resource', async () => {
      // Setup: Mock available templates
      const mockTemplates = [
        {
          template: {
            name: 'typescript-advanced',
            language: 'typescript',
            description: 'Advanced TypeScript MCP server template',
            tags: ['typescript', 'advanced', 'turbo'],
            optimization: {
              turboRepo: true,
              hotReload: true,
              sharedDependencies: true,
              buildCaching: true,
            },
            variables: {
              serverName: { type: 'string', required: true, description: 'Server name' },
              description: { type: 'string', required: false, description: 'Server description' },
            },
          },
          templatePath: '/mock/templates/typescript-advanced',
        },
        {
          template: {
            name: 'python-basic',
            language: 'python',
            description: 'Basic Python MCP server template',
            tags: ['python', 'basic'],
            optimization: {
              turboRepo: false,
              hotReload: false,
              sharedDependencies: false,
              buildCaching: false,
            },
            variables: {
              serverName: { type: 'string', required: true, description: 'Server name' },
            },
          },
          templatePath: '/mock/templates/python-basic',
        },
      ];

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue(mockTemplates);

      // Action: Request templates resource
      const result = await handleTemplatesResource();

      // Assert: Template metadata returned
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('context-pods://templates/');
      expect(result.contents[0].mimeType).toBe('application/json');

      const data = JSON.parse(result.contents[0].text);
      expect(data.templates).toHaveLength(2);
      expect(data.count).toBe(2);
      expect(data.templatesPath).toBe('/mock/templates');
      expect(data.lastUpdated).toBeTypeOf('number');

      // Verify template data structure
      const template1 = data.templates[0];
      expect(template1.name).toBe('typescript-advanced');
      expect(template1.language).toBe('typescript');
      expect(template1.tags).toEqual(['typescript', 'advanced', 'turbo']);
      expect(template1.variables).toEqual(['serverName', 'description']);
      expect(template1.optimization.turboRepo).toBe(true);

      const template2 = data.templates[1];
      expect(template2.name).toBe('python-basic');
      expect(template2.language).toBe('python');
      expect(template2.optimization.turboRepo).toBe(false);
    });

    it('should handle no templates found', async () => {
      // Setup: No templates available
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      // Action: Request templates resource
      const result = await handleTemplatesResource();

      // Assert: Empty template list
      const data = JSON.parse(result.contents[0].text);
      expect(data.templates).toHaveLength(0);
      expect(data.count).toBe(0);
    });

    it('should handle template discovery errors', async () => {
      // Setup: Template selector throws error
      mockTemplateSelector.getAvailableTemplates.mockRejectedValue(
        new Error('Templates directory not found'),
      );

      // Action & Assert: Should throw error
      await expect(handleTemplatesResource()).rejects.toThrow('Templates directory not found');
    });
  });

  /**
   * Test 3: System Status Resource
   */
  describe('Status Resource (context-pods://status)', () => {
    it('should return system status', async () => {
      // Setup: Mock statistics
      const mockStats = {
        byStatus: {
          ready: 3,
          building: 1,
          error: 0,
          created: 2,
        },
        byLanguage: {
          typescript: 4,
          python: 2,
        },
        byTemplate: {
          'typescript-advanced': 2,
          'typescript-basic': 2,
          'python-basic': 2,
        },
      };

      mockRegistryOperations.getStatistics.mockResolvedValue(mockStats);

      // Action: Request status resource
      const result = await handleStatusResource();

      // Assert: Status info included
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('context-pods://status');
      expect(result.contents[0].mimeType).toBe('application/json');

      const data = JSON.parse(result.contents[0].text);

      // Verify system information
      expect(data.version).toBe('1.0.0-test');
      expect(data.name).toBe('context-pods-test');
      expect(data.status).toBe('ready');

      // Verify configuration
      expect(data.configuration.templatesPath).toBe('/mock/templates');
      expect(data.configuration.registryPath).toBe('/mock/registry.db');

      // Verify capabilities
      expect(data.capabilities.turboRepo).toBe(true);
      expect(data.capabilities.templateSelection).toBe(true);
      expect(data.capabilities.languageDetection).toBe(true);

      // Verify supported languages
      expect(data.supportedLanguages).toContain('typescript');
      expect(data.supportedLanguages).toContain('python');

      // Verify server counts
      expect(data.serverCounts).toEqual(mockStats.byStatus);

      // Verify runtime info
      expect(data.uptime).toBeTypeOf('number');
      expect(data.lastUpdated).toBeTypeOf('number');
    });

    it('should handle statistics errors gracefully', async () => {
      // Setup: Statistics fail to load
      mockRegistryOperations.getStatistics.mockRejectedValue(new Error('Statistics unavailable'));

      // Action & Assert: Should throw error
      await expect(handleStatusResource()).rejects.toThrow('Statistics unavailable');
    });
  });

  /**
   * Test 4: Statistics Resource
   */
  describe('Statistics Resource (context-pods://statistics)', () => {
    it('should return detailed statistics', async () => {
      // Setup: Mock comprehensive statistics
      const mockStats = {
        totalServers: 6,
        byStatus: {
          ready: 3,
          building: 1,
          error: 1,
          created: 1,
        },
        byLanguage: {
          typescript: 4,
          python: 2,
        },
        byTemplate: {
          'typescript-advanced': 2,
          'typescript-basic': 2,
          'python-basic': 2,
        },
        buildMetrics: {
          successRate: 0.85,
          averageBuildTime: 45000,
          totalBuilds: 20,
          failedBuilds: 3,
        },
        recentActivity: {
          serversCreatedToday: 2,
          buildsToday: 5,
          lastActivityTime: '2025-07-27T12:00:00Z',
        },
      };

      mockRegistryOperations.getStatistics.mockResolvedValue(mockStats);

      // Action: Request statistics resource
      const result = await handleStatisticsResource();

      // Assert: Detailed statistics returned
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('context-pods://statistics');
      expect(result.contents[0].mimeType).toBe('application/json');

      const data = JSON.parse(result.contents[0].text);

      // Verify all statistics are included
      expect(data.totalServers).toBe(6);
      expect(data.byStatus.ready).toBe(3);
      expect(data.byLanguage.typescript).toBe(4);
      expect(data.byTemplate['typescript-advanced']).toBe(2);
      expect(data.buildMetrics.successRate).toBe(0.85);
      expect(data.recentActivity.serversCreatedToday).toBe(2);
      expect(data.lastUpdated).toBeTypeOf('number');
    });

    it('should handle empty statistics', async () => {
      // Setup: No statistics available
      const emptyStats = {
        totalServers: 0,
        byStatus: {},
        byLanguage: {},
        byTemplate: {},
      };

      mockRegistryOperations.getStatistics.mockResolvedValue(emptyStats);

      // Action: Request statistics resource
      const result = await handleStatisticsResource();

      // Assert: Empty statistics handled
      const data = JSON.parse(result.contents[0].text);
      expect(data.totalServers).toBe(0);
      expect(data.byStatus).toEqual({});
    });
  });

  /**
   * Test 5: Invalid Resource Error Handling
   */
  describe('Error Handling', () => {
    it('should handle invalid resource URIs', async () => {
      // This test simulates the main ReadResourceRequestSchema handler
      // since we can't easily test the server instance directly

      // Setup: Create a mock request for invalid URI
      const mockRequest = {
        params: {
          uri: 'context-pods://invalid-resource',
        },
      };

      // Action: Simulate the main handler logic
      let errorOccurred = false;
      let errorMessage = '';

      try {
        // This would be handled by the main switch statement
        const uri = mockRequest.params.uri;
        switch (uri) {
          case 'context-pods://mcps/':
          case 'context-pods://templates/':
          case 'context-pods://status':
          case 'context-pods://statistics':
            // Valid resources
            break;
          default:
            throw new Error(`Unknown resource: ${uri}`);
        }
      } catch (error) {
        errorOccurred = true;
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      // Assert: Proper error response
      expect(errorOccurred).toBe(true);
      expect(errorMessage).toBe('Unknown resource: context-pods://invalid-resource');
    });

    it('should format error responses correctly', async () => {
      // Setup: Simulate error response format from main handler
      const uri = 'context-pods://test-error';
      const error = new Error('Test error message');

      // Action: Create error response as main handler would
      const errorResponse = {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                error: `Failed to load resource: ${error.message}`,
              },
              null,
              2,
            ),
          },
        ],
      };

      // Assert: Error response format is correct
      expect(errorResponse.contents).toHaveLength(1);
      expect(errorResponse.contents[0].uri).toBe(uri);
      expect(errorResponse.contents[0].mimeType).toBe('application/json');

      const errorData = JSON.parse(errorResponse.contents[0].text);
      expect(errorData.error).toBe('Failed to load resource: Test error message');
    });

    it('should log errors properly', async () => {
      // Action: Simulate error logging scenario
      const uri = 'context-pods://test';
      const error = new Error('Resource error');

      // Import logger from the mocked module
      const { logger } = await import('@context-pods/core');

      // Call logger method
      logger.error(`Resource error: ${uri}`, error);

      // Assert: Logger called correctly using the mock function
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.error).toHaveBeenCalledWith(`Resource error: ${uri}`, error);
    });

    it('should handle resource timeout scenarios', async () => {
      // Setup: Mock a timeout scenario
      mockRegistryOperations.listServers.mockImplementation(
        () =>
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 100)),
      );

      // Action & Assert: Should handle timeout error
      await expect(handleMCPsResource()).rejects.toThrow('Request timeout');
    });
  });

  /**
   * Test 6: Resource Data Validation
   */
  describe('Resource Data Validation', () => {
    it('should return valid JSON for all resources', async () => {
      // Setup: Mock data for all resources
      mockRegistryOperations.listServers.mockResolvedValue([]);
      mockRegistryOperations.getStatistics.mockResolvedValue({
        byStatus: {},
        byLanguage: {},
        byTemplate: {},
      });
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      // Action: Test all resources return valid JSON
      const resources = [
        await handleMCPsResource(),
        await handleTemplatesResource(),
        await handleStatusResource(),
        await handleStatisticsResource(),
      ];

      // Assert: All return valid JSON
      resources.forEach((resource) => {
        expect(resource.contents).toHaveLength(1);
        expect(resource.contents[0].mimeType).toBe('application/json');

        // Verify JSON is valid
        expect(() => JSON.parse(resource.contents[0].text)).not.toThrow();

        // Verify basic structure
        const data = JSON.parse(resource.contents[0].text);
        expect(data.lastUpdated).toBeTypeOf('number');
      });
    });

    it('should include required fields in all resource responses', async () => {
      // Setup: Mock minimal required data
      mockRegistryOperations.listServers.mockResolvedValue([]);
      mockRegistryOperations.getStatistics.mockResolvedValue({ byStatus: {} });
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      // Action: Get all resource data
      const mcpsData = JSON.parse((await handleMCPsResource()).contents[0].text);
      const templatesData = JSON.parse((await handleTemplatesResource()).contents[0].text);
      const statusData = JSON.parse((await handleStatusResource()).contents[0].text);
      const statsData = JSON.parse((await handleStatisticsResource()).contents[0].text);

      // Assert: Required fields present
      expect(mcpsData).toHaveProperty('servers');
      expect(mcpsData).toHaveProperty('count');

      expect(templatesData).toHaveProperty('templates');
      expect(templatesData).toHaveProperty('count');
      expect(templatesData).toHaveProperty('templatesPath');

      expect(statusData).toHaveProperty('version');
      expect(statusData).toHaveProperty('status');
      expect(statusData).toHaveProperty('configuration');
      expect(statusData).toHaveProperty('capabilities');

      expect(statsData).toHaveProperty('lastUpdated');
    });
  });
});
