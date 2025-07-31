/**
 * Unit tests for Server Commands
 * Tests the functionality of Meta-MCP server management commands
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import {
  startServerCommand,
  stopServerCommand,
  statusServerCommand,
  testServerCommand,
  devServerCommand,
} from '../../../src/commands/server.js';
import type { CommandContext, ServerOptions } from '../../../src/types/cli-types.js';
import { output } from '../../../src/utils/output-formatter.js';

// Mock the output formatter
vi.mock('../../../src/utils/output-formatter.js', () => ({
  output: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
    table: vi.fn(),
  },
}));

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
  },
}));

// Mock child_process module
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock process.kill
const originalKill = process.kill;
const mockKill = vi.fn();

describe('Server Commands', () => {
  let mockContext: CommandContext;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock process.kill
    process.kill = mockKill as any;

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
    process.kill = originalKill;
  });

  describe('Start Server Command', () => {
    it('should start server when already built', async () => {
      // Setup: Mock server exists and spawn successful
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const mockProcess = {
        pid: 12345,
        on: vi.fn(),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const options: ServerOptions = { daemon: true };

      // Action: Start server command
      const result = await startServerCommand(options, mockContext);

      // Assert: Should start in daemon mode
      expect(fs.access).toHaveBeenCalledWith('/mock/working/packages/server/dist/index.js');
      expect(spawn).toHaveBeenCalledWith('node', ['/mock/working/packages/server/dist/index.js'], {
        cwd: '/mock/working',
        stdio: 'pipe',
        env: expect.objectContaining({
          NODE_ENV: 'production',
        }),
      });
      expect(fs.writeFile).toHaveBeenCalledWith('/mock/working/.context-pods-server.pid', '12345');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ pid: 12345 });
      expect(output.success).toHaveBeenCalledWith(
        '✅ Meta-MCP Server started in daemon mode (PID: 12345)',
      );
    });

    it('should build server if not built then start', async () => {
      // Setup: Mock server doesn't exist initially, build succeeds
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));

      const mockBuildProcess = {
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10); // Successful build
          }
        }),
      };

      const mockServerProcess = {
        pid: 54321,
        on: vi.fn(),
      };

      vi.mocked(spawn)
        .mockReturnValueOnce(mockBuildProcess as any) // Build process
        .mockReturnValueOnce(mockServerProcess as any); // Server process

      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const options: ServerOptions = { daemon: true, verbose: false };

      // Action: Start server command
      const result = await startServerCommand(options, mockContext);

      // Assert: Should build then start
      expect(output.warn).toHaveBeenCalledWith('Server package not built. Building now...');
      expect(spawn).toHaveBeenCalledWith('npm', ['run', 'build', '--workspace=packages/server'], {
        cwd: '/mock/working',
        stdio: 'pipe',
      });
      expect(spawn).toHaveBeenCalledWith(
        'node',
        ['/mock/working/packages/server/dist/index.js'],
        expect.objectContaining({
          cwd: '/mock/working',
          stdio: 'pipe',
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should start in non-daemon mode', async () => {
      // Setup: Mock server exists
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const mockProcess = {
        pid: 99999,
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        }),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const options: ServerOptions = { daemon: false };

      // Action: Start server command (will resolve quickly due to mock)
      const result = await startServerCommand(options, mockContext);

      // Assert: Should start in foreground mode
      expect(spawn).toHaveBeenCalledWith('node', ['/mock/working/packages/server/dist/index.js'], {
        cwd: '/mock/working',
        stdio: 'inherit',
        env: expect.objectContaining({
          NODE_ENV: 'production',
        }),
      });
      expect(fs.writeFile).not.toHaveBeenCalled(); // No PID file in non-daemon mode
      expect(result.success).toBe(true);
      expect(output.success).toHaveBeenCalledWith('✅ Meta-MCP Server is running');
    });

    it('should handle build failures', async () => {
      // Setup: Mock server doesn't exist and build fails
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      const mockBuildProcess = {
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 10); // Failed build
          }
        }),
      };
      vi.mocked(spawn).mockReturnValue(mockBuildProcess as any);

      const options: ServerOptions = {};

      // Action: Start server command
      const result = await startServerCommand(options, mockContext);

      // Assert: Should fail due to build error
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Build failed with code 1');
      expect(output.error).toHaveBeenCalled();
    });

    it('should handle development and debug options', async () => {
      // Setup: Mock server exists
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const mockProcess = {
        pid: 11111,
        on: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const options: ServerOptions = { daemon: true, dev: true, debug: true, verbose: true };

      // Action: Start server command
      const result = await startServerCommand(options, mockContext);

      // Assert: Should pass development and debug environment
      expect(spawn).toHaveBeenCalledWith('node', ['/mock/working/packages/server/dist/index.js'], {
        cwd: '/mock/working',
        stdio: 'pipe',
        env: expect.objectContaining({
          NODE_ENV: 'development',
          DEBUG: 'context-pods:*',
        }),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Stop Server Command', () => {
    it('should stop running server', async () => {
      // Setup: Mock PID file exists and process can be killed
      vi.mocked(fs.readFile).mockResolvedValue('54321');
      mockKill.mockImplementation((pid, signal) => {
        if (signal === 0) {
          // First check - process exists
          return true;
        }
        if (signal === 'SIGTERM') {
          // SIGTERM - process stops
          return true;
        }
        if (signal === 0) {
          // Second check - process no longer exists
          throw new Error('ESRCH');
        }
      });
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const options: ServerOptions = {};

      // Action: Stop server command
      const result = await stopServerCommand(options, mockContext);

      // Assert: Should stop server gracefully
      expect(fs.readFile).toHaveBeenCalledWith('/mock/working/.context-pods-server.pid', 'utf8');
      expect(mockKill).toHaveBeenCalledWith(54321, 'SIGTERM');
      expect(fs.unlink).toHaveBeenCalledWith('/mock/working/.context-pods-server.pid');
      expect(result.success).toBe(true);
      expect(output.success).toHaveBeenCalledWith('✅ Meta-MCP Server stopped');
    });

    it('should force kill if process does not stop gracefully', async () => {
      // Setup: Mock PID file exists but process doesn't stop with SIGTERM
      vi.mocked(fs.readFile).mockResolvedValue('99999');
      mockKill.mockImplementation((pid, signal) => {
        if (signal === 'SIGTERM') {
          return true; // SIGTERM sent
        }
        if (signal === 0) {
          return true; // Process still exists after wait
        }
        if (signal === 'SIGKILL') {
          return true; // SIGKILL sent
        }
      });
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const options: ServerOptions = {};

      // Action: Stop server command
      const result = await stopServerCommand(options, mockContext);

      // Assert: Should force kill stubborn process
      expect(mockKill).toHaveBeenCalledWith(99999, 'SIGTERM');
      expect(mockKill).toHaveBeenCalledWith(99999, 0); // Check if still running
      expect(mockKill).toHaveBeenCalledWith(99999, 'SIGKILL'); // Force kill
      expect(output.warn).toHaveBeenCalledWith('Process still running, forcing shutdown...');
      expect(result.success).toBe(true);
    });

    it('should handle case when no server is running', async () => {
      // Setup: Mock PID file doesn't exist
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      const options: ServerOptions = {};

      // Action: Stop server command
      const result = await stopServerCommand(options, mockContext);

      // Assert: Should handle gracefully
      expect(result.success).toBe(true);
      expect(output.warn).toHaveBeenCalledWith('No running Meta-MCP Server found');
    });

    it('should handle invalid PID in file', async () => {
      // Setup: Mock PID file contains invalid PID
      vi.mocked(fs.readFile).mockResolvedValue('invalid-pid');

      const options: ServerOptions = {};

      // Action: Stop server command
      const result = await stopServerCommand(options, mockContext);

      // Assert: Should handle invalid PID gracefully
      expect(result.success).toBe(true);
      expect(output.warn).toHaveBeenCalledWith('No running Meta-MCP Server found');
    });
  });

  describe('Status Server Command', () => {
    it('should show status when server is running and built', async () => {
      // Setup: Mock server built, running, and configured
      vi.mocked(fs.access)
        .mockResolvedValueOnce(undefined) // Server built
        .mockResolvedValueOnce(undefined); // Config exists

      vi.mocked(fs.readFile).mockResolvedValue('12345');
      mockKill.mockReturnValue(true); // Process exists

      const options: ServerOptions = {};

      // Action: Get server status
      const result = await statusServerCommand(options, mockContext);

      // Assert: Should show complete status
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        running: true,
        built: true,
        configured: true,
        pid: 12345,
        uptime: undefined,
        version: '0.0.1',
      });
      expect(output.table).toHaveBeenCalledWith([
        { label: 'Status', value: '🟢 Running' },
        { label: 'Built', value: '✅ Yes' },
        { label: 'PID', value: '12345' },
        { label: 'Version', value: '0.0.1' },
        { label: 'Config Examples', value: '✅ Available' },
      ]);
    });

    it('should show status when server is not running', async () => {
      // Setup: Mock server not built, not running
      vi.mocked(fs.access)
        .mockRejectedValueOnce(new Error('ENOENT')) // Server not built
        .mockRejectedValueOnce(new Error('ENOENT')); // Config not found

      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT')); // No PID file

      const options: ServerOptions = {};

      // Action: Get server status
      const result = await statusServerCommand(options, mockContext);

      // Assert: Should show stopped status with recommendations
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        running: false,
        built: false,
        configured: false,
        pid: undefined,
        uptime: undefined,
        version: '0.0.1',
      });
      expect(output.table).toHaveBeenCalledWith([
        { label: 'Status', value: '🔴 Stopped' },
        { label: 'Built', value: '❌ No' },
        { label: 'PID', value: 'N/A' },
        { label: 'Version', value: '0.0.1' },
        { label: 'Config Examples', value: '❌ Missing' },
      ]);
      expect(output.warn).toHaveBeenCalledWith('📝 Run "npm run build" to build the server');
      expect(output.info).toHaveBeenCalledWith(
        '📝 Run "context-pods server start" to start the server',
      );
    });

    it('should clean up stale PID file', async () => {
      // Setup: Mock PID file exists but process is not running
      vi.mocked(fs.access)
        .mockResolvedValueOnce(undefined) // Server built
        .mockResolvedValueOnce(undefined); // Config exists

      vi.mocked(fs.readFile).mockResolvedValue('99999');
      mockKill.mockImplementation(() => {
        throw new Error('ESRCH'); // Process not found
      });
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const options: ServerOptions = {};

      // Action: Get server status
      const result = await statusServerCommand(options, mockContext);

      // Assert: Should clean up stale PID file
      expect(fs.unlink).toHaveBeenCalledWith('/mock/working/.context-pods-server.pid');
      expect(result.data?.running).toBe(false);
    });
  });

  describe('Test Server Command', () => {
    it('should run server test successfully', async () => {
      // Setup: Mock test script exists and passes
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const mockTestProcess = {
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10); // Test passes
          }
        }),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
      };
      vi.mocked(spawn).mockReturnValue(mockTestProcess as any);

      const options: ServerOptions = { verbose: false };

      // Action: Test server command
      const result = await testServerCommand(options, mockContext);

      // Assert: Should run test successfully
      expect(fs.access).toHaveBeenCalledWith('/mock/working/scripts/test-connection.mjs');
      expect(spawn).toHaveBeenCalledWith('node', ['/mock/working/scripts/test-connection.mjs'], {
        cwd: '/mock/working',
        stdio: 'pipe',
        env: expect.objectContaining({
          NODE_ENV: 'test',
        }),
      });
      expect(result.success).toBe(true);
      expect(output.success).toHaveBeenCalledWith('✅ Meta-MCP Server test passed');
    });

    it('should handle test failures', async () => {
      // Setup: Mock test script exists but fails
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const mockTestProcess = {
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 10); // Test fails
          }
        }),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
      };
      vi.mocked(spawn).mockReturnValue(mockTestProcess as any);

      const options: ServerOptions = { verbose: false };

      // Action: Test server command
      const result = await testServerCommand(options, mockContext);

      // Assert: Should handle test failure
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Test failed');
      expect(output.error).toHaveBeenCalledWith('❌ Meta-MCP Server test failed');
    });

    it('should handle missing test script', async () => {
      // Setup: Mock test script doesn't exist
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      const options: ServerOptions = {};

      // Action: Test server command
      const result = await testServerCommand(options, mockContext);

      // Assert: Should handle missing script
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Test script not found');
      expect(output.error).toHaveBeenCalledWith(
        'Test script not found at scripts/test-connection.mjs',
      );
    });

    it('should handle verbose mode', async () => {
      // Setup: Mock test script exists
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const mockTestProcess = {
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        }),
      };
      vi.mocked(spawn).mockReturnValue(mockTestProcess as any);

      const options: ServerOptions = { verbose: true };

      // Action: Test server command in verbose mode
      const result = await testServerCommand(options, mockContext);

      // Assert: Should use inherit stdio in verbose mode
      expect(spawn).toHaveBeenCalledWith('node', ['/mock/working/scripts/test-connection.mjs'], {
        cwd: '/mock/working',
        stdio: 'inherit',
        env: expect.objectContaining({
          NODE_ENV: 'test',
        }),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Dev Server Command', () => {
    it('should start development server', async () => {
      // Setup: Mock dev script exists
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const mockDevProcess = {
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        }),
      };
      vi.mocked(spawn).mockReturnValue(mockDevProcess as any);

      const options: ServerOptions = {};

      // Action: Start dev server command
      const result = await devServerCommand(options, mockContext);

      // Assert: Should start development server
      expect(fs.access).toHaveBeenCalledWith('/mock/working/scripts/dev-server.sh');
      expect(spawn).toHaveBeenCalledWith('bash', ['/mock/working/scripts/dev-server.sh'], {
        cwd: '/mock/working',
        stdio: 'inherit',
        env: expect.objectContaining({
          NODE_ENV: 'development',
          DEBUG: 'context-pods:*',
        }),
      });
      expect(result.success).toBe(true);
      expect(output.info).toHaveBeenCalledWith(
        '🛠️ Starting Context-Pods Meta-MCP Server in development mode...',
      );
    });

    it('should handle missing dev script', async () => {
      // Setup: Mock dev script doesn't exist
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      const options: ServerOptions = {};

      // Action: Start dev server command
      const result = await devServerCommand(options, mockContext);

      // Assert: Should handle missing script
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Development script not found');
      expect(output.error).toHaveBeenCalledWith(
        'Development script not found at scripts/dev-server.sh',
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle filesystem errors gracefully', async () => {
      // Setup: Mock filesystem error during start
      const fsError = new Error('Permission denied');
      vi.mocked(fs.access).mockRejectedValue(fsError);
      vi.mocked(spawn).mockImplementation(() => {
        throw fsError;
      });

      const options: ServerOptions = {};

      // Action: Try to start server
      const result = await startServerCommand(options, mockContext);

      // Assert: Should handle error gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBe(fsError);
      expect(output.error).toHaveBeenCalledWith('Failed to start Meta-MCP Server', fsError);
    });

    it('should handle spawn errors', async () => {
      // Setup: Mock spawn throwing error
      vi.mocked(fs.access).mockResolvedValue(undefined);
      const spawnError = new Error('spawn ENOENT');
      vi.mocked(spawn).mockImplementation(() => {
        throw spawnError;
      });

      const options: ServerOptions = {};

      // Action: Try to start server
      const result = await startServerCommand(options, mockContext);

      // Assert: Should handle spawn error
      expect(result.success).toBe(false);
      expect(result.error).toBe(spawnError);
    });
  });
});
