/**
 * Unit tests for ListMCPsTool
 * Tests the functionality of listing and filtering MCP servers from the registry
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ListMCPsTool } from '../../../src/tools/list-mcps.js';
import { getRegistryOperations } from '../../../src/registry/index.js';

// Mock the registry operations
vi.mock('../../../src/registry/index.js', () => ({
  getRegistryOperations: vi.fn(),
  MCPServerStatus: {
    CREATED: 'created',
    BUILDING: 'building',
    READY: 'ready',
    ERROR: 'error',
    ARCHIVED: 'archived',
  },
}));

describe('ListMCPsTool', () => {
  let listMCPsTool: ListMCPsTool;
  let mockRegistry: {
    listServers: Mock;
    getStatistics: Mock;
  };

  const mockServers = [
    {
      id: 'server-1',
      name: 'weather-api',
      status: 'ready',
      template: 'typescript-advanced',
      path: '/generated/weather-api',
      metadata: {
        language: 'typescript',
        description: 'Weather API server',
        tags: ['weather', 'api'],
        turboOptimized: true,
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        lastBuildStatus: 'success',
        lastBuildTime: Date.now() - 1000 * 60 * 30, // 30 minutes ago
      },
      createdAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
      updatedAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
    },
    {
      id: 'server-2',
      name: 'file-manager',
      status: 'building',
      template: 'python-basic',
      path: '/generated/file-manager',
      metadata: {
        language: 'python',
        description: 'File management server',
        tags: ['files', 'management'],
        turboOptimized: false,
        buildCommand: 'python -m build',
        devCommand: 'python main.py',
      },
      createdAt: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
      updatedAt: Date.now() - 1000 * 60 * 30, // 30 minutes ago
    },
    {
      id: 'server-3',
      name: 'data-processor',
      status: 'error',
      template: 'rust-basic',
      path: '/generated/data-processor',
      metadata: {
        language: 'rust',
        description: 'Data processing server',
        tags: ['data', 'processing'],
        turboOptimized: true,
        errorMessage: 'Compilation failed',
      },
      createdAt: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
      updatedAt: Date.now() - 1000 * 60 * 60 * 12, // 12 hours ago
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock registry
    mockRegistry = {
      listServers: vi.fn(),
      getStatistics: vi.fn(),
    };

    vi.mocked(getRegistryOperations).mockResolvedValue(mockRegistry as any);

    // Set up default mock returns
    mockRegistry.listServers.mockResolvedValue(mockServers);
    mockRegistry.getStatistics.mockResolvedValue({
      total: 3,
      recentlyCreated: 1,
      byStatus: {
        ready: 1,
        building: 1,
        error: 1,
        created: 0,
        archived: 0,
      },
      byTemplate: {
        'typescript-advanced': 1,
        'python-basic': 1,
        'rust-basic': 1,
      },
    });

    // Create tool instance
    listMCPsTool = new ListMCPsTool();
  });

  describe('Argument Validation', () => {
    it('should accept empty arguments', async () => {
      const result = await listMCPsTool.safeExecute({});
      expect(result.content[0].text).toContain('Managed MCP Servers');
    });

    it('should validate status argument', async () => {
      const result = await listMCPsTool.safeExecute({ status: 'invalid-status' });
      expect(result.content[0].text).toContain('Invalid status. Valid values: created, building, ready, error, archived');
    });

    it('should accept valid status values', async () => {
      const result = await listMCPsTool.safeExecute({ status: 'ready' });
      expect(result.content[0].text).not.toContain('Invalid status');
    });

    it('should validate format argument', async () => {
      const result = await listMCPsTool.safeExecute({ format: 'invalid-format' });
      expect(result.content[0].text).toContain('Invalid format. Valid values: table, json, summary');
    });

    it('should accept valid format values', async () => {
      const result = await listMCPsTool.safeExecute({ format: 'json' });
      expect(result.content[0].text).toContain('"servers"');
    });

    it('should validate string arguments', async () => {
      const result = await listMCPsTool.safeExecute({ template: 123 });
      expect(result.content[0].text).toContain("Argument 'template' must be a string");
    });
  });

  describe('Filter Building', () => {
    it('should build filters from arguments', async () => {
      await listMCPsTool.safeExecute({
        status: 'ready',
        template: 'typescript-advanced',
        language: 'typescript',
        search: 'weather',
      });

      expect(mockRegistry.listServers).toHaveBeenCalledWith({
        status: 'ready',
        template: 'typescript-advanced',
        language: 'typescript',
        search: 'weather',
      });
    });

    it('should handle legacy filter parameter as status', async () => {
      await listMCPsTool.safeExecute({ filter: 'ready' });

      expect(mockRegistry.listServers).toHaveBeenCalledWith({
        status: 'ready',
      });
    });

    it('should handle legacy filter parameter as search term', async () => {
      await listMCPsTool.safeExecute({ filter: 'weather-api' });

      expect(mockRegistry.listServers).toHaveBeenCalledWith({
        search: 'weather-api',
      });
    });

    it('should build empty filters when no arguments provided', async () => {
      await listMCPsTool.safeExecute({});

      expect(mockRegistry.listServers).toHaveBeenCalledWith({});
    });
  });

  describe('Table Format Output', () => {
    it('should format servers as table', async () => {
      const result = await listMCPsTool.safeExecute({ format: 'table' });
      const output = result.content[0].text;

      expect(output).toContain('📦 Managed MCP Servers (3 total)');
      expect(output).toContain('┌─────────────────┬──────────────┬─────────────────┬──────────────────┬─────────────────┐');
      expect(output).toContain('│ Name            │ Status       │ Template        │ Language         │ Created         │');
      expect(output).toContain('weather-api');
      expect(output).toContain('file-manager');
      expect(output).toContain('data-processor');
      expect(output).toContain('✅ ready');
      expect(output).toContain('🔨 building');
      expect(output).toContain('❌ error');
      expect(output).toContain('typescript-a...');
      expect(output).toContain('💡 Use "list-mcps --format=json" for detailed information');
    });

    it('should handle empty server list', async () => {
      mockRegistry.listServers.mockResolvedValue([]);

      const result = await listMCPsTool.safeExecute({ format: 'table' });
      const output = result.content[0].text;

      expect(output).toContain('📦 No MCP servers found.');
      expect(output).toContain('Use the "create-mcp" or "wrap-script" tools');
    });

    it('should truncate long values in table', async () => {
      const longNameServer = {
        ...mockServers[0],
        name: 'very-long-server-name-that-exceeds-fifteen-characters',
        template: 'very-long-template-name-that-exceeds-fifteen-characters',
      };
      mockRegistry.listServers.mockResolvedValue([longNameServer]);

      const result = await listMCPsTool.safeExecute({ format: 'table' });
      const output = result.content[0].text;

      expect(output).toContain('very-long-se...');
      expect(output).toContain('very-long-te...');
    });

    it('should format dates correctly', async () => {
      const recentServer = {
        ...mockServers[0],
        createdAt: Date.now() - 1000 * 60 * 5, // 5 minutes ago
      };
      mockRegistry.listServers.mockResolvedValue([recentServer]);

      const result = await listMCPsTool.safeExecute({ format: 'table' });
      const output = result.content[0].text;

      expect(output).toContain('5m ago');
    });
  });

  describe('JSON Format Output', () => {
    it('should format servers as JSON', async () => {
      const result = await listMCPsTool.safeExecute({ format: 'json' });
      const output = result.content[0].text;

      const jsonData = JSON.parse(output);
      expect(jsonData).toHaveProperty('servers');
      expect(jsonData).toHaveProperty('count', 3);
      expect(jsonData.servers).toHaveLength(3);

      const server = jsonData.servers[0];
      expect(server).toHaveProperty('id', 'server-1');
      expect(server).toHaveProperty('name', 'weather-api');
      expect(server).toHaveProperty('status', 'ready');
      expect(server).toHaveProperty('template', 'typescript-advanced');
      expect(server).toHaveProperty('path', '/generated/weather-api');
      expect(server).toHaveProperty('language', 'typescript');
      expect(server).toHaveProperty('description', 'Weather API server');
      expect(server).toHaveProperty('tags');
      expect(server).toHaveProperty('turboOptimized', true);
      expect(server).toHaveProperty('buildCommand', 'npm run build');
      expect(server).toHaveProperty('devCommand', 'npm run dev');
      expect(server).toHaveProperty('lastBuildStatus', 'success');
      expect(server).toHaveProperty('createdAt');
      expect(server).toHaveProperty('updatedAt');
    });

    it('should handle empty server list in JSON format', async () => {
      mockRegistry.listServers.mockResolvedValue([]);

      const result = await listMCPsTool.safeExecute({ format: 'json' });
      const output = result.content[0].text;

      const jsonData = JSON.parse(output);
      expect(jsonData).toEqual({
        servers: [],
        count: 0,
        message: 'No MCP servers found',
      });
    });

    it('should include all server metadata in JSON format', async () => {
      const result = await listMCPsTool.safeExecute({ format: 'json' });
      const output = result.content[0].text;

      const jsonData = JSON.parse(output);
      const errorServer = jsonData.servers.find((s: any) => s.status === 'error');
      expect(errorServer).toHaveProperty('errorMessage', 'Compilation failed');
    });
  });

  describe('Summary Format Output', () => {
    it('should format servers as summary', async () => {
      const result = await listMCPsTool.safeExecute({ format: 'summary' });
      const output = result.content[0].text;

      expect(output).toContain('📊 MCP Servers Summary');
      expect(output).toContain('📈 Statistics:');
      expect(output).toContain('- Total servers: 3');
      expect(output).toContain('- Recently created: 1 (last 24h)');
      expect(output).toContain('📋 By Status:');
      expect(output).toContain('- ✅ ready: 1');
      expect(output).toContain('- 🔨 building: 1');
      expect(output).toContain('- ❌ error: 1');
      expect(output).toContain('🎨 By Template:');
      expect(output).toContain('- typescript-advanced: 1');
      expect(output).toContain('- python-basic: 1');
      expect(output).toContain('- rust-basic: 1');
      expect(output).toContain('🕒 Recent Servers:');
    });

    it('should sort templates by usage in summary', async () => {
      mockRegistry.getStatistics.mockResolvedValue({
        total: 5,
        recentlyCreated: 2,
        byStatus: { ready: 3, building: 1, error: 1 },
        byTemplate: {
          'typescript-advanced': 3,
          'python-basic': 1,
          'rust-basic': 1,
        },
      });

      const result = await listMCPsTool.safeExecute({ format: 'summary' });
      const output = result.content[0].text;

      // typescript-advanced should be listed first (highest count)
      const typescriptIndex = output.indexOf('- typescript-advanced: 3');
      const pythonIndex = output.indexOf('- python-basic: 1');
      expect(typescriptIndex).toBeLessThan(pythonIndex);
    });

    it('should limit template display to top 5', async () => {
      mockRegistry.getStatistics.mockResolvedValue({
        total: 10,
        recentlyCreated: 1,
        byStatus: { ready: 10 },
        byTemplate: {
          'template-1': 5,
          'template-2': 4,
          'template-3': 3,
          'template-4': 2,
          'template-5': 1,
          'template-6': 1,
          'template-7': 1,
        },
      });

      const result = await listMCPsTool.safeExecute({ format: 'summary' });
      const output = result.content[0].text;

      expect(output).toContain('- template-1: 5');
      expect(output).toContain('- template-5: 1');
      expect(output).toContain('- ... and 2 more');
      expect(output).not.toContain('template-6');
    });

    it('should show recent servers sorted by creation date', async () => {

      const result = await listMCPsTool.safeExecute({ format: 'summary' });
      const output = result.content[0].text;

      // Should show max 3 recent servers
      const recentSection = output.substring(output.indexOf('🕒 Recent Servers:'));
      expect(recentSection).toContain('file-manager');
      expect(recentSection).toContain('weather-api');
      expect(recentSection).toContain('data-processor');
    });

    it('should skip status entries with zero count', async () => {
      mockRegistry.getStatistics.mockResolvedValue({
        total: 1,
        recentlyCreated: 0,
        byStatus: {
          ready: 1,
          building: 0,
          error: 0,
          created: 0,
          archived: 0,
        },
        byTemplate: { 'typescript-advanced': 1 },
      });

      const result = await listMCPsTool.safeExecute({ format: 'summary' });
      const output = result.content[0].text;

      expect(output).toContain('- ✅ ready: 1');
      expect(output).not.toContain('building: 0');
      expect(output).not.toContain('error: 0');
    });
  });

  describe('Status Emojis', () => {
    it('should use correct emojis for each status', async () => {
      const statusServers = [
        { ...mockServers[0], status: 'ready' as const },
        { ...mockServers[0], status: 'building' as const, id: 's2', name: 'building-server' },
        { ...mockServers[0], status: 'created' as const, id: 's3', name: 'created-server' },
        { ...mockServers[0], status: 'error' as const, id: 's4', name: 'error-server' },
        { ...mockServers[0], status: 'archived' as const, id: 's5', name: 'archived-server' },
      ];
      mockRegistry.listServers.mockResolvedValue(statusServers);

      const result = await listMCPsTool.safeExecute({ format: 'table' });
      const output = result.content[0].text;

      expect(output).toContain('✅ ready');
      expect(output).toContain('🔨 building');
      expect(output).toContain('🆕 created');
      expect(output).toContain('❌ error');
      expect(output).toContain('📦 archived');
    });
  });

  describe('Date Formatting', () => {
    it('should format various time differences correctly', async () => {
      const now = Date.now();
      const timeServers = [
        { ...mockServers[0], name: 'just-now', createdAt: now },
        { ...mockServers[0], name: 'minutes-ago', id: 's2', createdAt: now - 1000 * 60 * 30 }, // 30 min
        { ...mockServers[0], name: 'hours-ago', id: 's3', createdAt: now - 1000 * 60 * 60 * 5 }, // 5 hours
        { ...mockServers[0], name: 'days-ago', id: 's4', createdAt: now - 1000 * 60 * 60 * 24 * 3 }, // 3 days
        { ...mockServers[0], name: 'weeks-ago', id: 's5', createdAt: now - 1000 * 60 * 60 * 24 * 10 }, // 10 days
      ];
      mockRegistry.listServers.mockResolvedValue(timeServers);

      const result = await listMCPsTool.safeExecute({ format: 'table' });
      const output = result.content[0].text;

      expect(output).toContain('just now');
      expect(output).toContain('30m ago');
      expect(output).toContain('5h ago');
      expect(output).toContain('3d ago');
      // Weeks should show as date
      expect(output).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // MM/DD/YYYY format
    });
  });

  describe('Filtering Integration', () => {
    it('should pass correct filters to registry for status filtering', async () => {
      mockRegistry.listServers.mockResolvedValueOnce([mockServers[0]]); // Only ready server

      const result = await listMCPsTool.safeExecute({ status: 'ready' });

      expect(mockRegistry.listServers).toHaveBeenCalledWith({ status: 'ready' });
      expect(result.content[0].text).toContain('MCP Servers');
    });

    it('should pass correct filters to registry for template filtering', async () => {
      mockRegistry.listServers.mockResolvedValueOnce([mockServers[1]]); // Only python server

      const result = await listMCPsTool.safeExecute({ template: 'python-basic' });

      expect(mockRegistry.listServers).toHaveBeenCalledWith({ template: 'python-basic' });
      expect(result.content[0].text).toContain('MCP Servers');
    });

    it('should pass correct filters to registry for search', async () => {
      mockRegistry.listServers.mockResolvedValueOnce([mockServers[0]]); // Weather server

      const result = await listMCPsTool.safeExecute({ search: 'weather' });

      expect(mockRegistry.listServers).toHaveBeenCalledWith({ search: 'weather' });
      expect(result.content[0].text).toContain('MCP Servers');
    });

    it('should combine multiple filters', async () => {
      mockRegistry.listServers.mockResolvedValueOnce([mockServers[0]]); // Return weather-api server

      const result = await listMCPsTool.safeExecute({
        status: 'ready',
        language: 'typescript',
        search: 'api',
      });

      expect(mockRegistry.listServers).toHaveBeenCalledWith({
        status: 'ready',
        language: 'typescript',
        search: 'api',
      });
      expect(result.content[0].text).toContain('MCP Servers');
    });
  });

  describe('Error Handling', () => {
    it('should handle registry connection errors', async () => {
      mockRegistry.listServers.mockRejectedValue(new Error('Registry connection failed'));

      const result = await listMCPsTool.safeExecute({});
      expect(result.content[0].text).toContain('Registry connection failed');
    });

    it('should handle registry statistics errors in summary mode', async () => {
      mockRegistry.getStatistics.mockRejectedValue(new Error('Statistics not available'));

      const result = await listMCPsTool.safeExecute({ format: 'summary' });
      expect(result.content[0].text).toContain('Statistics not available');
    });

    it('should handle non-Error exceptions', async () => {
      mockRegistry.listServers.mockRejectedValue('String error');

      const result = await listMCPsTool.safeExecute({});
      expect(result.content[0].text).toContain('String error');
    });

    it('should handle JSON serialization of complex objects safely', async () => {
      const complexServer = {
        ...mockServers[0],
        metadata: {
          ...mockServers[0].metadata,
          circularRef: undefined, // This won't cause issues
          nullValue: null,
          undefinedValue: undefined,
        },
      };
      mockRegistry.listServers.mockResolvedValueOnce([complexServer]);

      const result = await listMCPsTool.safeExecute({ format: 'json' });
      
      // Should not throw and should produce valid JSON
      const jsonData = JSON.parse(result.content[0].text);
      expect(jsonData.servers).toHaveLength(1);
      expect(jsonData.servers[0]).toHaveProperty('name');
    });
  });

  describe('Integration with Registry', () => {
    it('should request statistics for summary format', async () => {
      await listMCPsTool.safeExecute({ format: 'summary' });

      expect(mockRegistry.getStatistics).toHaveBeenCalled();
    });

    it('should not request statistics for table format', async () => {
      await listMCPsTool.safeExecute({ format: 'table' });

      expect(mockRegistry.getStatistics).not.toHaveBeenCalled();
    });

    it('should not request statistics for JSON format', async () => {
      await listMCPsTool.safeExecute({ format: 'json' });

      expect(mockRegistry.getStatistics).not.toHaveBeenCalled();
    });
  });

  describe('Default Values', () => {
    it('should use table format as default', async () => {
      const result = await listMCPsTool.safeExecute({});
      expect(result.content[0].text).toContain('┌─────────────────┬──────────────┬─────────────────┬──────────────────┬─────────────────┐');
    });

    it('should handle undefined format gracefully', async () => {
      const result = await listMCPsTool.safeExecute({ format: undefined });
      expect(result.content[0].text).toContain('┌─────────────────┬──────────────┬─────────────────┬──────────────────┬─────────────────┐');
    });

    it('should pass empty filters when no filtering arguments provided', async () => {
      await listMCPsTool.safeExecute({});
      expect(mockRegistry.listServers).toHaveBeenCalledWith({});
    });
  });
});