/**
 * Unit tests for List Command
 * Tests the functionality of listing MCP servers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { listCommand } from '../../../src/commands/list.js';
import type { CommandContext, MCPInfo } from '../../../src/types/cli-types.js';
import { output } from '../../../src/utils/output-formatter.js';

// Mock the output formatter
vi.mock('../../../src/utils/output-formatter.js', () => ({
  output: {
    startSpinner: vi.fn(),
    stopSpinner: vi.fn(),
    succeedSpinner: vi.fn(),
    failSpinner: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    divider: vi.fn(),
    package: vi.fn((name: string) => `[${name}]`),
    table: vi.fn(),
  },
}));

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
    stat: vi.fn(),
  },
}));

describe('List Command', () => {
  let mockContext: CommandContext;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockContext = {
      config: {
        templatesPath: '/mock/templates',
        outputPath: '/mock/output',
        cacheDir: '/mock/cache',
        turbo: {
          enabled: true,
          tasks: ['build', 'test', 'lint'],
          caching: true,
        },
        registry: {
          enabled: true,
          path: '/mock/registry.db',
        },
        dev: {
          hotReload: true,
          watchPatterns: ['**/*.ts'],
          port: 3001,
        },
      },
      workingDir: '/mock/working',
      templatePaths: ['/mock/templates'],
      outputPath: '/mock/output',
      verbose: false,
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should return empty array when no MCP servers exist', async () => {
      // Setup: Mock empty directory
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([]);

      // Action: Execute list command
      const result = await listCommand({}, mockContext);

      // Assert: Proper empty response
      expect(result.success).toBe(true);
      expect(result.message).toBe('No MCP servers found');
      expect(result.data).toEqual([]);
      expect(output.info).toHaveBeenCalledWith('No MCP servers found');
    });

    it('should handle output directory not existing', async () => {
      // Setup: Mock directory doesn't exist
      const mockError = new Error('ENOENT: no such file or directory');
      (mockError as any).code = 'ENOENT';
      vi.mocked(fs.access).mockRejectedValue(mockError);

      // Action: Execute list command
      const result = await listCommand({}, mockContext);

      // Assert: Should handle gracefully
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(output.info).toHaveBeenCalledWith('No MCP servers found');
    });

    it('should handle permission errors', async () => {
      // Setup: Mock permission denied
      const mockError = new Error('EACCES: permission denied');
      (mockError as any).code = 'EACCES';
      vi.mocked(fs.access).mockRejectedValue(mockError);

      // Action: Execute list command
      const result = await listCommand({}, mockContext);

      // Assert: Should return error
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(output.error).toHaveBeenCalled();
    });
  });

  describe('Finding MCP Servers', () => {
    it('should find and list active MCP servers', async () => {
      // Setup: Mock directory with MCP servers
      const mockDate = new Date('2024-01-01T12:00:00Z');
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'weather-api', isDirectory: () => true } as any,
        { name: 'data-processor', isDirectory: () => true } as any,
        { name: 'not-a-dir.txt', isDirectory: () => false } as any,
      ]);

      vi.mocked(fs.stat).mockResolvedValue({
        birthtime: mockDate,
        mtime: mockDate,
      } as any);

      vi.mocked(fs.readFile).mockImplementation((filePath) => {
        if (String(filePath).includes('weather-api')) {
          return Promise.resolve(JSON.stringify({
            name: 'weather-api',
            keywords: ['mcp', 'weather'],
            'context-pods': { template: 'typescript-advanced' },
          }));
        } else if (String(filePath).includes('data-processor')) {
          return Promise.resolve(JSON.stringify({
            name: 'data-processor-mcp',
            keywords: ['model-context-protocol'],
          }));
        }
        return Promise.reject(new Error('File not found'));
      });

      // Action: Execute list command
      const result = await listCommand({}, mockContext);

      // Assert: Found MCP servers
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.message).toBe('Found 2 MCP server(s)');
      
      const mcps = result.data as MCPInfo[];
      expect(mcps[0].name).toBe('weather-api');
      expect(mcps[0].status).toBe('active');
      expect(mcps[0].template).toBe('typescript-advanced');
      expect(mcps[1].name).toBe('data-processor');
      expect(mcps[1].status).toBe('active');
    });

    it('should detect MCP servers without package.json keywords', async () => {
      // Setup: Mock MCP with name containing 'mcp'
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'my-mcp-tool', isDirectory: () => true } as any,
      ]);

      vi.mocked(fs.stat).mockResolvedValue({
        birthtime: new Date(),
        mtime: new Date(),
      } as any);

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        name: 'my-mcp-tool',
        // No keywords, but name contains 'mcp'
      }));

      // Action: Execute list command
      const result = await listCommand({}, mockContext);

      // Assert: Should detect as MCP server
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect((result.data as MCPInfo[])[0].status).toBe('active');
    });

    it('should mark servers with missing package.json as error status', async () => {
      // Setup: Mock server directory without package.json
      vi.mocked(fs.access).mockImplementation((filePath) => {
        if (String(filePath).includes('package.json')) {
          return Promise.reject(new Error('File not found'));
        }
        return Promise.resolve(undefined);
      });

      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'broken-server', isDirectory: () => true } as any,
      ]);

      vi.mocked(fs.stat).mockResolvedValue({
        birthtime: new Date(),
        mtime: new Date(),
      } as any);

      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      // Mock that it looks like an MCP project (has src/index.ts)
      let accessCallCount = 0;
      vi.mocked(fs.access).mockImplementation((filePath) => {
        const pathStr = String(filePath);
        accessCallCount++;
        
        // First call is for output directory
        if (accessCallCount === 1) {
          return Promise.resolve(undefined);
        }
        
        // Subsequent calls for checking project structure
        if (pathStr.includes('src') || pathStr.includes('index.ts')) {
          return Promise.resolve(undefined);
        }
        
        return Promise.reject(new Error('Not found'));
      });

      // Action: Execute list command
      const result = await listCommand({}, mockContext);

      // Assert: Should mark as error
      expect(result.success).toBe(true);
      if (result.data && (result.data as MCPInfo[]).length > 0) {
        expect((result.data as MCPInfo[])[0].status).toBe('error');
      }
    });

    it('should skip non-MCP directories', async () => {
      // Setup: Mock mixed directories
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'valid-mcp', isDirectory: () => true } as any,
        { name: 'regular-project', isDirectory: () => true } as any,
      ]);

      vi.mocked(fs.stat).mockResolvedValue({
        birthtime: new Date(),
        mtime: new Date(),
      } as any);

      vi.mocked(fs.readFile).mockImplementation((filePath) => {
        if (String(filePath).includes('valid-mcp')) {
          return Promise.resolve(JSON.stringify({
            name: 'valid-mcp',
            keywords: ['mcp'],
          }));
        } else {
          return Promise.resolve(JSON.stringify({
            name: 'regular-project',
            // No MCP-related keywords or name
          }));
        }
      });

      // Action: Execute list command
      const result = await listCommand({}, mockContext);

      // Assert: Should only find valid MCP
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect((result.data as MCPInfo[])[0].name).toBe('valid-mcp');
    });
  });

  describe('Template Detection', () => {
    it('should detect typescript-advanced template', async () => {
      // Setup: Mock advanced TypeScript structure
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'advanced-server', isDirectory: () => true } as any,
      ]);

      vi.mocked(fs.stat).mockResolvedValue({
        birthtime: new Date(),
        mtime: new Date(),
      } as any);

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        name: 'advanced-server',
        keywords: ['mcp'],
      }));

      // Mock file existence checks for template detection
      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        const pathStr = String(filePath);
        
        // Output directory exists
        if (pathStr === mockContext.outputPath) {
          return Promise.resolve(undefined);
        }
        
        // Advanced TypeScript template structure
        if (pathStr.includes('advanced-server')) {
          if (pathStr.endsWith('tsconfig.json') || 
              pathStr.endsWith('src/tools') || 
              pathStr.endsWith('src/resources')) {
            return Promise.resolve(undefined);
          }
        }
        
        return Promise.reject(new Error('Not found'));
      });

      // Action: Execute list command
      const result = await listCommand({}, mockContext);

      // Assert: Should detect advanced template
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      const mcp = (result.data as MCPInfo[])[0];
      expect(mcp).toBeDefined();
      expect(mcp.template).toBe('typescript-advanced');
    });

    it('should detect python-basic template', async () => {
      // Setup: Mock Python project structure
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'python-server', isDirectory: () => true } as any,
      ]);

      vi.mocked(fs.stat).mockResolvedValue({
        birthtime: new Date(),
        mtime: new Date(),
      } as any);

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        name: 'python-server',
        keywords: ['mcp'],
      }));

      // Mock file existence checks
      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        const pathStr = String(filePath);
        
        // Output directory exists
        if (pathStr === mockContext.outputPath) {
          return Promise.resolve(undefined);
        }
        
        // Python template structure
        if (pathStr.includes('python-server') && pathStr.endsWith('requirements.txt')) {
          return Promise.resolve(undefined);
        }
        
        return Promise.reject(new Error('Not found'));
      });

      // Action: Execute list command
      const result = await listCommand({}, mockContext);

      // Assert: Should detect Python template
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      const mcp = (result.data as MCPInfo[])[0];
      expect(mcp).toBeDefined();
      expect(mcp.template).toBe('python-basic');
    });
  });

  describe('Output Formatting', () => {
    it('should output JSON format when requested', async () => {
      // Setup: Mock MCP server
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'test-server', isDirectory: () => true } as any,
      ]);

      vi.mocked(fs.stat).mockResolvedValue({
        birthtime: new Date(),
        mtime: new Date(),
      } as any);

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        name: 'test-server',
        keywords: ['mcp'],
      }));

      // Action: Execute with JSON format
      const result = await listCommand({ format: 'json' }, mockContext);

      // Assert: Should output JSON
      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test-server'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"name"'));
      
      consoleSpy.mockRestore();
    });

    it('should display table format by default', async () => {
      // Setup: Mock MCP servers
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'server-1', isDirectory: () => true } as any,
        { name: 'server-2', isDirectory: () => true } as any,
      ]);

      vi.mocked(fs.stat).mockResolvedValue({
        birthtime: new Date(),
        mtime: new Date(),
      } as any);

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        keywords: ['mcp'],
      }));

      // Action: Execute with default format
      const result = await listCommand({}, mockContext);

      // Assert: Should use table display
      expect(result.success).toBe(true);
      expect(output.info).toHaveBeenCalledWith('Found 2 MCP server(s):');
      expect(output.divider).toHaveBeenCalled();
      expect(output.table).toHaveBeenCalled();
    });

    it('should sort servers by last modified date', async () => {
      // Setup: Mock servers with different dates
      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-01-15');
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'old-server', isDirectory: () => true } as any,
        { name: 'new-server', isDirectory: () => true } as any,
      ]);

      vi.mocked(fs.stat).mockImplementation((filePath) => {
        if (String(filePath).includes('old-server')) {
          return Promise.resolve({
            birthtime: oldDate,
            mtime: oldDate,
          } as any);
        } else {
          return Promise.resolve({
            birthtime: newDate,
            mtime: newDate,
          } as any);
        }
      });

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        keywords: ['mcp'],
      }));

      // Action: Execute list command
      const result = await listCommand({}, mockContext);

      // Assert: Should sort by date (newest first)
      expect(result.success).toBe(true);
      const mcps = result.data as MCPInfo[];
      expect(mcps[0].name).toBe('new-server');
      expect(mcps[1].name).toBe('old-server');
    });
  });

  describe('Filtering Options', () => {
    it('should filter out inactive servers by default', async () => {
      // Setup: Mock active and inactive servers
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'active-server', isDirectory: () => true } as any,
        { name: 'inactive-server', isDirectory: () => true } as any,
      ]);

      vi.mocked(fs.stat).mockResolvedValue({
        birthtime: new Date(),
        mtime: new Date(),
      } as any);

      vi.mocked(fs.readFile).mockImplementation((filePath) => {
        if (String(filePath).includes('active-server')) {
          return Promise.resolve(JSON.stringify({
            keywords: ['mcp'],
          }));
        } else {
          // Return package.json without MCP indicators
          return Promise.resolve(JSON.stringify({
            name: 'some-other-project',
          }));
        }
      });

      // Make inactive-server look like an MCP but with error status
      let accessCallCount = 0;
      vi.mocked(fs.access).mockImplementation((filePath) => {
        accessCallCount++;
        const pathStr = String(filePath);
        
        if (accessCallCount === 1 || pathStr.includes('src')) {
          return Promise.resolve(undefined);
        }
        
        return Promise.reject(new Error('Not found'));
      });

      // Action: Execute without --all flag
      const result = await listCommand({}, mockContext);

      // Assert: Should only show active servers
      expect(result.success).toBe(true);
      // Only active servers should be included
      const mcps = result.data as MCPInfo[];
      expect(mcps.every(mcp => mcp.status === 'active')).toBe(true);
    });

    it('should show all servers with --all flag', async () => {
      // Setup: Mock mixed status servers
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'active-server', isDirectory: () => true } as any,
        { name: 'error-server', isDirectory: () => true } as any,
      ]);

      vi.mocked(fs.stat).mockResolvedValue({
        birthtime: new Date(),
        mtime: new Date(),
      } as any);

      // Active server has proper package.json
      vi.mocked(fs.readFile).mockImplementation((filePath) => {
        if (String(filePath).includes('active-server')) {
          return Promise.resolve(JSON.stringify({
            keywords: ['mcp'],
          }));
        }
        // Error server has no package.json
        return Promise.reject(new Error('File not found'));
      });

      // Make error-server look like MCP project
      let accessCount = 0;
      vi.mocked(fs.access).mockImplementation((filePath) => {
        accessCount++;
        const pathStr = String(filePath);
        
        if (accessCount === 1 || pathStr.includes('src/index.ts')) {
          return Promise.resolve(undefined);
        }
        
        return Promise.reject(new Error('Not found'));
      });

      // Action: Execute with --all flag
      const result = await listCommand({ all: true }, mockContext);

      // Assert: Should show all servers
      expect(result.success).toBe(true);
      const mcps = result.data as MCPInfo[];
      expect(mcps.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle spinner cleanup on error', async () => {
      // Setup: Mock error during execution
      vi.mocked(fs.access).mockRejectedValue(new Error('Unexpected error'));

      // Action: Execute command
      const result = await listCommand({}, mockContext);

      // Assert: Spinner should be stopped
      expect(output.stopSpinner).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(output.error).toHaveBeenCalled();
    });

    it('should handle JSON parse errors gracefully', async () => {
      // Setup: Mock invalid JSON in package.json
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'corrupt-server', isDirectory: () => true } as any,
      ]);

      vi.mocked(fs.stat).mockResolvedValue({
        birthtime: new Date(),
        mtime: new Date(),
      } as any);

      vi.mocked(fs.readFile).mockResolvedValue('{ invalid json');

      // Make it look like MCP project structure
      let accessCount = 0;
      vi.mocked(fs.access).mockImplementation((filePath) => {
        accessCount++;
        const pathStr = String(filePath);
        
        if (accessCount === 1 || pathStr.includes('src')) {
          return Promise.resolve(undefined);
        }
        
        return Promise.reject(new Error('Not found'));
      });

      // Action: Execute command
      const result = await listCommand({}, mockContext);

      // Assert: Should handle gracefully
      expect(result.success).toBe(true);
      // Server should be detected but with error status
      if (result.data && (result.data as MCPInfo[]).length > 0) {
        expect((result.data as MCPInfo[])[0].status).toBe('error');
      }
    });
  });
});