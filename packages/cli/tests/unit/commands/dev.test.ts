/**
 * Unit tests for Dev Command
 * Tests the functionality of starting development mode with hot reloading
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import chokidar from 'chokidar';
import { devCommand } from '../../../src/commands/dev.js';
import { TurboIntegration } from '../../../src/utils/turbo-integration.js';
import type { CommandContext, DevOptions } from '../../../src/types/cli-types.js';
import { output } from '../../../src/utils/output-formatter.js';

// Mock the output formatter
vi.mock('../../../src/utils/output-formatter.js', () => ({
  output: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
    path: vi.fn((path: string) => path),
    startSpinner: vi.fn(),
    stopSpinner: vi.fn(),
    succeedSpinner: vi.fn(),
    failSpinner: vi.fn(),
  },
}));

// Mock chokidar
vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(),
  },
}));

// Mock TurboIntegration
vi.mock('../../../src/utils/turbo-integration.js', () => ({
  TurboIntegration: vi.fn(),
}));

describe('Dev Command', () => {
  let mockContext: CommandContext;
  let mockTurboIntegration: {
    isAvailable: ReturnType<typeof vi.fn>;
    dev: ReturnType<typeof vi.fn>;
  };
  let mockWatcher: {
    on: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };

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
          watchPatterns: ['**/*.ts', '**/*.js'],
          port: 3001,
        },
      },
      workingDir: '/mock/working',
      templatePaths: ['/mock/templates'],
      outputPath: '/mock/output',
      verbose: false,
    };

    // Create mock TurboIntegration instance
    mockTurboIntegration = {
      isAvailable: vi.fn(),
      dev: vi.fn(),
    };

    // Mock the constructor
    vi.mocked(TurboIntegration).mockImplementation(() => mockTurboIntegration as any);

    // Create mock watcher
    mockWatcher = {
      on: vi.fn().mockReturnThis(),
      close: vi.fn(),
    };

    vi.mocked(chokidar.watch).mockReturnValue(mockWatcher as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('TurboRepo Integration', () => {
    it('should start development mode with TurboRepo when available', async () => {
      // Setup: TurboRepo is available
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.dev.mockResolvedValue(undefined);

      const options: DevOptions = { port: 3000 };

      // Action: Execute dev command
      const result = await devCommand('my-target', options, mockContext);

      // Assert: Should use TurboRepo
      expect(output.info).toHaveBeenCalledWith('Starting development mode...');
      expect(TurboIntegration).toHaveBeenCalledWith('/mock/working', mockContext.config);
      expect(mockTurboIntegration.isAvailable).toHaveBeenCalled();
      expect(output.info).toHaveBeenCalledWith('Development server starting on port 3000');
      expect(mockTurboIntegration.dev).toHaveBeenCalledWith('my-target', false);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Development mode started successfully');
    });

    it('should use default port from config when not specified', async () => {
      // Setup: TurboRepo is available, no port specified
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.dev.mockResolvedValue(undefined);

      const options: DevOptions = {};

      // Action: Execute dev command
      const result = await devCommand(undefined, options, mockContext);

      // Assert: Should use config port
      expect(output.info).toHaveBeenCalledWith('Development server starting on port 3001');
      expect(mockTurboIntegration.dev).toHaveBeenCalledWith(undefined, false);
      expect(result.success).toBe(true);
    });

    it('should enable verbose mode when context is verbose', async () => {
      // Setup: TurboRepo is available, verbose context
      const verboseContext = { ...mockContext, verbose: true };
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.dev.mockResolvedValue(undefined);

      const options: DevOptions = {};

      // Action: Execute dev command in verbose mode
      const result = await devCommand('test-target', options, verboseContext);

      // Assert: Should pass verbose flag to turbo
      expect(mockTurboIntegration.dev).toHaveBeenCalledWith('test-target', true);
      expect(result.success).toBe(true);
    });

    it('should setup hot reload when enabled', async () => {
      // Setup: TurboRepo is available, hot reload enabled
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.dev.mockResolvedValue(undefined);

      const options: DevOptions = { hotReload: true };

      // Action: Execute dev command
      const result = await devCommand(undefined, options, mockContext);

      // Assert: Should setup hot reload
      expect(chokidar.watch).toHaveBeenCalledWith(['**/*.ts', '**/*.js'], {
        cwd: '/mock/working',
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
        persistent: true,
      });
      expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('add', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('unlink', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(output.success).toHaveBeenCalledWith('Hot reload enabled');
      expect(result.success).toBe(true);
    });

    it('should skip hot reload when disabled by option', async () => {
      // Setup: TurboRepo is available, hot reload disabled
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.dev.mockResolvedValue(undefined);

      const options: DevOptions = { hotReload: false };

      // Action: Execute dev command
      const result = await devCommand(undefined, options, mockContext);

      // Assert: Should not setup hot reload
      expect(chokidar.watch).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should skip hot reload when disabled in config', async () => {
      // Setup: TurboRepo is available, hot reload disabled in config
      const configWithoutHotReload = {
        ...mockContext,
        config: { ...mockContext.config, dev: { ...mockContext.config.dev, hotReload: false } },
      };
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.dev.mockResolvedValue(undefined);

      const options: DevOptions = {};

      // Action: Execute dev command
      const result = await devCommand(undefined, options, configWithoutHotReload);

      // Assert: Should not setup hot reload
      expect(chokidar.watch).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('Basic Development Mode', () => {
    it('should fallback to basic mode when TurboRepo is not available', async () => {
      // Setup: TurboRepo is not available
      mockTurboIntegration.isAvailable.mockResolvedValue(false);

      const options: DevOptions = {};

      // Action: Execute dev command (this will hang, so we'll mock the promise to resolve immediately)
      devCommand(undefined, options, mockContext);

      // Since basic dev mode runs indefinitely, we need to handle this specially
      // The function returns a promise that never resolves, so we can't await it normally
      // Instead, we'll check that the initial setup was called correctly

      // Assert: Should warn and setup basic mode
      await new Promise((resolve) => setTimeout(resolve, 10)); // Give time for initial setup

      expect(output.warn).toHaveBeenCalledWith(
        'TurboRepo not available, falling back to basic development mode',
      );
      expect(output.info).toHaveBeenCalledWith('Starting basic development mode...');
      expect(output.success).toHaveBeenCalledWith('Development mode running (basic mode)');
      expect(output.info).toHaveBeenCalledWith('Press Ctrl+C to stop');

      // Note: We can't test the actual return value because the promise never resolves
      // This is by design - the dev command runs indefinitely until stopped
    });

    it('should setup hot reload in basic mode when enabled', async () => {
      // Setup: TurboRepo is not available, hot reload enabled
      mockTurboIntegration.isAvailable.mockResolvedValue(false);

      const options: DevOptions = { hotReload: true };

      // Action: Execute dev command
      devCommand(undefined, options, mockContext);

      // Assert: Should setup hot reload in basic mode
      await new Promise((resolve) => setTimeout(resolve, 10)); // Give time for initial setup

      expect(chokidar.watch).toHaveBeenCalledWith(['**/*.ts', '**/*.js'], {
        cwd: '/mock/working',
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
        persistent: true,
      });
      expect(output.success).toHaveBeenCalledWith('Hot reload enabled');
    });

    it('should skip hot reload in basic mode when disabled', async () => {
      // Setup: TurboRepo is not available, hot reload disabled
      mockTurboIntegration.isAvailable.mockResolvedValue(false);

      const options: DevOptions = { hotReload: false };

      // Action: Execute dev command
      devCommand(undefined, options, mockContext);

      // Assert: Should not setup hot reload
      await new Promise((resolve) => setTimeout(resolve, 10)); // Give time for initial setup

      expect(chokidar.watch).not.toHaveBeenCalled();
    });
  });

  describe('Hot Reload File Watching', () => {
    it('should handle file change events', async () => {
      // Setup: TurboRepo is available, hot reload enabled
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.dev.mockResolvedValue(undefined);

      let changeHandler: (path: string) => void;
      mockWatcher.on.mockImplementation((event: string, handler: any) => {
        if (event === 'change') {
          changeHandler = handler;
        }
        return mockWatcher;
      });

      const options: DevOptions = {};

      // Action: Execute dev command and trigger file change
      const result = await devCommand(undefined, options, mockContext);
      changeHandler!('src/test.ts');

      // Assert: Should handle file change
      expect(output.info).toHaveBeenCalledWith('File changed: src/test.ts'); // output.path(path) returns the path
      expect(output.debug).toHaveBeenCalledWith('Triggering hot reload...');
      expect(result.success).toBe(true);
    });

    it('should handle file add events', async () => {
      // Setup: TurboRepo is available, hot reload enabled
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.dev.mockResolvedValue(undefined);

      let addHandler: (path: string) => void;
      mockWatcher.on.mockImplementation((event: string, handler: any) => {
        if (event === 'add') {
          addHandler = handler;
        }
        return mockWatcher;
      });

      const options: DevOptions = {};

      // Action: Execute dev command and trigger file add
      const result = await devCommand(undefined, options, mockContext);
      addHandler!('src/new-file.ts');

      // Assert: Should handle file add
      expect(output.debug).toHaveBeenCalledWith('File added: src/new-file.ts'); // output.path(path) returns the path
      expect(result.success).toBe(true);
    });

    it('should handle file remove events', async () => {
      // Setup: TurboRepo is available, hot reload enabled
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.dev.mockResolvedValue(undefined);

      let unlinkHandler: (path: string) => void;
      mockWatcher.on.mockImplementation((event: string, handler: any) => {
        if (event === 'unlink') {
          unlinkHandler = handler;
        }
        return mockWatcher;
      });

      const options: DevOptions = {};

      // Action: Execute dev command and trigger file remove
      const result = await devCommand(undefined, options, mockContext);
      unlinkHandler!('src/deleted-file.ts');

      // Assert: Should handle file remove
      expect(output.debug).toHaveBeenCalledWith('File removed: src/deleted-file.ts'); // output.path(path) returns the path
      expect(result.success).toBe(true);
    });

    it('should handle file watcher errors', async () => {
      // Setup: TurboRepo is available, hot reload enabled
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.dev.mockResolvedValue(undefined);

      let errorHandler: (error: Error) => void;
      mockWatcher.on.mockImplementation((event: string, handler: any) => {
        if (event === 'error') {
          errorHandler = handler;
        }
        return mockWatcher;
      });

      const options: DevOptions = {};
      const watcherError = new Error('File system error');

      // Action: Execute dev command and trigger watcher error
      const result = await devCommand(undefined, options, mockContext);
      errorHandler!(watcherError);

      // Assert: Should handle watcher error
      expect(output.error).toHaveBeenCalledWith('File watcher error', watcherError);
      expect(result.success).toBe(true);
    });

    it('should handle graceful shutdown', async () => {
      // Setup: TurboRepo is available, hot reload enabled
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.dev.mockResolvedValue(undefined);

      const originalProcess = process;
      const mockProcess = { on: vi.fn() };
      (global as any).process = mockProcess;

      const options: DevOptions = {};

      // Action: Execute dev command
      const result = await devCommand(undefined, options, mockContext);

      // Assert: Should setup SIGINT handler
      expect(mockProcess.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));

      // Simulate SIGINT
      const sigintHandler = mockProcess.on.mock.calls.find((call) => call[0] === 'SIGINT')?.[1];
      if (sigintHandler) {
        sigintHandler();
        expect(mockWatcher.close).toHaveBeenCalled();
        expect(output.info).toHaveBeenCalledWith('File watcher stopped');
      }

      expect(result.success).toBe(true);

      // Restore process
      (global as any).process = originalProcess;
    });
  });

  describe('Error Handling', () => {
    it('should handle TurboRepo dev command errors', async () => {
      // Setup: TurboRepo is available but dev command fails
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      const devError = new Error('TurboRepo dev command failed');
      mockTurboIntegration.dev.mockRejectedValue(devError);

      const options: DevOptions = {};

      // Action: Execute dev command
      const result = await devCommand('test-target', options, mockContext);

      // Assert: Should handle error gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBe(devError);
      expect(result.message).toBe('TurboRepo dev command failed');
      expect(output.error).toHaveBeenCalledWith('Failed to start development mode', devError);
    });

    it('should handle TurboIntegration constructor errors', async () => {
      // Setup: TurboIntegration constructor throws
      const constructorError = new Error('Invalid configuration');
      vi.mocked(TurboIntegration).mockImplementation(() => {
        throw constructorError;
      });

      const options: DevOptions = {};

      // Action: Execute dev command
      const result = await devCommand(undefined, options, mockContext);

      // Assert: Should handle constructor error
      expect(result.success).toBe(false);
      expect(result.error).toBe(constructorError);
      expect(result.message).toBe('Invalid configuration');
      expect(output.error).toHaveBeenCalledWith(
        'Failed to start development mode',
        constructorError,
      );
    });

    it('should handle isAvailable check errors', async () => {
      // Setup: isAvailable throws error
      const availabilityError = new Error('Cannot check TurboRepo availability');
      mockTurboIntegration.isAvailable.mockRejectedValue(availabilityError);

      const options: DevOptions = {};

      // Action: Execute dev command
      const result = await devCommand(undefined, options, mockContext);

      // Assert: Should handle availability check error
      expect(result.success).toBe(false);
      expect(result.error).toBe(availabilityError);
      expect(result.message).toBe('Cannot check TurboRepo availability');
    });

    it('should handle non-Error exceptions', async () => {
      // Setup: Non-Error exception
      mockTurboIntegration.isAvailable.mockRejectedValue('String error');

      const options: DevOptions = {};

      // Action: Execute dev command
      const result = await devCommand(undefined, options, mockContext);

      // Assert: Should handle string error
      expect(result.success).toBe(false);
      expect(result.message).toBe('Unknown error');
      expect(typeof result.error).toBe('string');
    });

    it('should handle chokidar watch errors during setup', async () => {
      // Setup: TurboRepo is available, chokidar.watch throws
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.dev.mockResolvedValue(undefined);

      const watchError = new Error('Cannot create file watcher');
      vi.mocked(chokidar.watch).mockImplementation(() => {
        throw watchError;
      });

      const options: DevOptions = {};

      // Action: Execute dev command
      const result = await devCommand(undefined, options, mockContext);

      // Assert: Should handle watch setup error
      expect(result.success).toBe(false);
      expect(result.error).toBe(watchError);
      expect(result.message).toBe('Cannot create file watcher');
    });
  });

  describe('Configuration Handling', () => {
    it('should use custom watch patterns from config', async () => {
      // Setup: Custom watch patterns in config
      const customContext = {
        ...mockContext,
        config: {
          ...mockContext.config,
          dev: { ...mockContext.config.dev, watchPatterns: ['**/*.tsx', '**/*.jsx'] },
        },
      };
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.dev.mockResolvedValue(undefined);

      const options: DevOptions = {};

      // Action: Execute dev command
      const result = await devCommand(undefined, options, customContext);

      // Assert: Should use custom watch patterns
      expect(chokidar.watch).toHaveBeenCalledWith(['**/*.tsx', '**/*.jsx'], {
        cwd: '/mock/working',
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
        persistent: true,
      });
      expect(result.success).toBe(true);
    });

    it('should work with empty watch patterns array', async () => {
      // Setup: Empty watch patterns
      const emptyPatternsContext = {
        ...mockContext,
        config: { ...mockContext.config, dev: { ...mockContext.config.dev, watchPatterns: [] } },
      };
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.dev.mockResolvedValue(undefined);

      const options: DevOptions = {};

      // Action: Execute dev command
      const result = await devCommand(undefined, options, emptyPatternsContext);

      // Assert: Should still setup watcher with empty patterns
      expect(chokidar.watch).toHaveBeenCalledWith([], {
        cwd: '/mock/working',
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
        persistent: true,
      });
      expect(result.success).toBe(true);
    });

    it('should use custom working directory', async () => {
      // Setup: Custom working directory
      const customWorkingDirContext = {
        ...mockContext,
        workingDir: '/custom/working/dir',
      };
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.dev.mockResolvedValue(undefined);

      const options: DevOptions = {};

      // Action: Execute dev command
      const result = await devCommand(undefined, options, customWorkingDirContext);

      // Assert: Should use custom working directory
      expect(TurboIntegration).toHaveBeenCalledWith(
        '/custom/working/dir',
        customWorkingDirContext.config,
      );
      expect(chokidar.watch).toHaveBeenCalledWith(['**/*.ts', '**/*.js'], {
        cwd: '/custom/working/dir',
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
        persistent: true,
      });
      expect(result.success).toBe(true);
    });
  });
});
