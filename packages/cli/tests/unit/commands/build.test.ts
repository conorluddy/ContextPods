/**
 * Unit tests for Build Command
 * Tests the functionality of building packages with TurboRepo integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildCommand } from '../../../src/commands/build.js';
import type { CommandContext, BuildOptions } from '../../../src/types/cli-types.js';
import { output } from '../../../src/utils/output-formatter.js';
import { TurboIntegration } from '../../../src/utils/turbo-integration.js';

// Mock the output formatter
vi.mock('../../../src/utils/output-formatter.js', () => ({
  output: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    startSpinner: vi.fn(),
    stopSpinner: vi.fn(),
    succeedSpinner: vi.fn(),
    failSpinner: vi.fn(),
  },
}));

// Mock TurboIntegration
vi.mock('../../../src/utils/turbo-integration.js', () => ({
  TurboIntegration: vi.fn(),
}));

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

describe('Build Command', () => {
  let mockContext: CommandContext;
  let mockTurboInstance: {
    isAvailable: ReturnType<typeof vi.fn>;
    build: ReturnType<typeof vi.fn>;
    clean: ReturnType<typeof vi.fn>;
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
          watchPatterns: ['**/*.ts'],
          port: 3001,
        },
      },
      workingDir: '/mock/working',
      templatePaths: ['/mock/templates'],
      outputPath: '/mock/output',
      verbose: false,
    };

    // Create mock TurboIntegration instance
    mockTurboInstance = {
      isAvailable: vi.fn(),
      build: vi.fn(),
      clean: vi.fn(),
    };

    // Mock the TurboIntegration constructor
    vi.mocked(TurboIntegration).mockImplementation(() => mockTurboInstance as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('TurboRepo Integration', () => {
    it('should build successfully with TurboRepo', async () => {
      // Setup: Mock TurboRepo available
      mockTurboInstance.isAvailable.mockResolvedValue(true);
      mockTurboInstance.build.mockResolvedValue(undefined);

      const options: BuildOptions = {};

      // Action: Execute build command
      const result = await buildCommand(undefined, options, mockContext);

      // Assert: Should use TurboRepo
      expect(TurboIntegration).toHaveBeenCalledWith('/mock/working', mockContext.config);
      expect(mockTurboInstance.isAvailable).toHaveBeenCalled();
      expect(mockTurboInstance.build).toHaveBeenCalledWith(undefined, false);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Build completed successfully');
      expect(output.info).toHaveBeenCalledWith('Building all packages...');
    });

    it('should build specific target with TurboRepo', async () => {
      // Setup: Mock TurboRepo available
      mockTurboInstance.isAvailable.mockResolvedValue(true);
      mockTurboInstance.build.mockResolvedValue(undefined);

      const options: BuildOptions = {};
      const target = 'cli';

      // Action: Execute build command with target
      const result = await buildCommand(target, options, mockContext);

      // Assert: Should build specific target
      expect(mockTurboInstance.build).toHaveBeenCalledWith('cli', false);
      expect(result.success).toBe(true);
      expect(output.info).toHaveBeenCalledWith('Building cli...');
    });

    it('should clean before building when requested', async () => {
      // Setup: Mock TurboRepo available
      mockTurboInstance.isAvailable.mockResolvedValue(true);
      mockTurboInstance.clean.mockResolvedValue(undefined);
      mockTurboInstance.build.mockResolvedValue(undefined);

      const options: BuildOptions = { clean: true };

      // Action: Execute build command with clean option
      const result = await buildCommand(undefined, options, mockContext);

      // Assert: Should clean then build
      expect(mockTurboInstance.clean).toHaveBeenCalledWith(undefined, false);
      expect(mockTurboInstance.build).toHaveBeenCalledWith(undefined, false);
      expect(result.success).toBe(true);
      expect(output.info).toHaveBeenCalledWith('Cleaning build artifacts...');
      expect(output.info).toHaveBeenCalledWith('Building all packages...');
    });

    it('should pass verbose flag to TurboRepo', async () => {
      // Setup: Mock TurboRepo available and verbose context
      mockTurboInstance.isAvailable.mockResolvedValue(true);
      mockTurboInstance.build.mockResolvedValue(undefined);
      
      const verboseContext = { ...mockContext, verbose: true };
      const options: BuildOptions = {};

      // Action: Execute build command in verbose mode
      const result = await buildCommand(undefined, options, verboseContext);

      // Assert: Should pass verbose flag
      expect(mockTurboInstance.build).toHaveBeenCalledWith(undefined, true);
      expect(result.success).toBe(true);
    });

    it('should handle TurboRepo build failures', async () => {
      // Setup: Mock TurboRepo available but build fails
      mockTurboInstance.isAvailable.mockResolvedValue(true);
      const buildError = new Error('Build script failed');
      mockTurboInstance.build.mockRejectedValue(buildError);

      const options: BuildOptions = {};

      // Action: Execute build command
      const result = await buildCommand(undefined, options, mockContext);

      // Assert: Should handle build failure
      expect(result.success).toBe(false);
      expect(result.error).toBe(buildError);
      expect(result.message).toBe('Build script failed');
      expect(output.error).toHaveBeenCalledWith('Build failed', buildError);
    });

    it('should handle TurboRepo clean failures', async () => {
      // Setup: Mock TurboRepo available but clean fails
      mockTurboInstance.isAvailable.mockResolvedValue(true);
      const cleanError = new Error('Clean failed');
      mockTurboInstance.clean.mockRejectedValue(cleanError);

      const options: BuildOptions = { clean: true };

      // Action: Execute build command with clean
      const result = await buildCommand(undefined, options, mockContext);

      // Assert: Should handle clean failure
      expect(result.success).toBe(false);
      expect(result.error).toBe(cleanError);
      expect(mockTurboInstance.build).not.toHaveBeenCalled();
    });
  });

  describe('Fallback Build Mode', () => {
    beforeEach(() => {
      // Mock dynamic import of execa
      vi.doMock('execa', () => ({
        execa: vi.fn(),
      }));
    });

    it('should use fallback when TurboRepo is not available', async () => {
      // Setup: Mock TurboRepo not available
      mockTurboInstance.isAvailable.mockResolvedValue(false);
      
      // Mock execa
      const { execa } = await import('execa');
      vi.mocked(execa).mockResolvedValue({} as any);

      const options: BuildOptions = {};

      // Action: Execute build command
      const result = await buildCommand(undefined, options, mockContext);

      // Assert: Should use fallback mode
      expect(output.warn).toHaveBeenCalledWith('TurboRepo not available, using fallback build');
      expect(output.info).toHaveBeenCalledWith('Building all packages...');
      expect(execa).toHaveBeenCalledWith('npm', ['run', 'build'], {
        cwd: '/mock/working',
        stdio: 'pipe',
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Build completed successfully (fallback mode)');
    });

    it('should build specific target in fallback mode', async () => {
      // Setup: Mock TurboRepo not available
      mockTurboInstance.isAvailable.mockResolvedValue(false);

      // Mock execa
      const { execa } = await import('execa');
      vi.mocked(execa).mockResolvedValue({} as any);

      const options: BuildOptions = {};
      const target = 'core';

      // Action: Execute build command with target
      const result = await buildCommand(target, options, mockContext);

      // Assert: Should build specific target in fallback mode
      expect(output.info).toHaveBeenCalledWith('Building core...');
      expect(execa).toHaveBeenCalledWith('npm', ['run', 'build'], {
        cwd: 'packages/core',
        stdio: 'pipe',
      });
      expect(result.success).toBe(true);
    });

    it('should use inherit stdio in verbose fallback mode', async () => {
      // Setup: Mock TurboRepo not available and verbose context
      mockTurboInstance.isAvailable.mockResolvedValue(false);
      
      // Mock execa
      const { execa } = await import('execa');
      vi.mocked(execa).mockResolvedValue({} as any);

      const verboseContext = { ...mockContext, verbose: true };
      const options: BuildOptions = {};

      // Action: Execute build command in verbose mode
      const result = await buildCommand(undefined, options, verboseContext);

      // Assert: Should use inherit stdio in verbose mode
      expect(execa).toHaveBeenCalledWith('npm', ['run', 'build'], {
        cwd: '/mock/working',
        stdio: 'inherit',
      });
      expect(result.success).toBe(true);
    });

    it('should handle fallback build failures', async () => {
      // Setup: Mock TurboRepo not available and execa fails
      mockTurboInstance.isAvailable.mockResolvedValue(false);

      const buildError = new Error('npm build failed');
      const { execa } = await import('execa');
      vi.mocked(execa).mockRejectedValue(buildError);

      const options: BuildOptions = {};

      // Action: Execute build command
      const result = await buildCommand(undefined, options, mockContext);

      // Assert: Should handle fallback failure
      expect(result.success).toBe(false);
      expect(result.error).toBe(buildError);
      expect(result.message).toBe('Fallback build failed');
      expect(output.error).toHaveBeenCalledWith('Fallback build failed', buildError);
    });
  });

  describe('Build Options', () => {
    it('should handle different build target configurations', async () => {
      // Setup: Mock TurboRepo available
      mockTurboInstance.isAvailable.mockResolvedValue(true);
      mockTurboInstance.build.mockResolvedValue(undefined);

      const options: BuildOptions = {
        target: 'production',
        clean: false,
        sourcemap: true,
        minify: false,
      };

      // Action: Execute build command
      const result = await buildCommand('server', options, mockContext);

      // Assert: Should pass target correctly
      expect(mockTurboInstance.build).toHaveBeenCalledWith('server', false);
      expect(result.success).toBe(true);
    });

    it('should handle empty build options', async () => {
      // Setup: Mock TurboRepo available
      mockTurboInstance.isAvailable.mockResolvedValue(true);
      mockTurboInstance.build.mockResolvedValue(undefined);

      const options: BuildOptions = {};

      // Action: Execute build command with no options
      const result = await buildCommand(undefined, options, mockContext);

      // Assert: Should work with default options
      expect(mockTurboInstance.clean).not.toHaveBeenCalled();
      expect(mockTurboInstance.build).toHaveBeenCalledWith(undefined, false);
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle TurboIntegration constructor errors', async () => {
      // Setup: Mock TurboIntegration constructor throwing
      const constructorError = new Error('TurboIntegration init failed');
      vi.mocked(TurboIntegration).mockImplementation(() => {
        throw constructorError;
      });

      const options: BuildOptions = {};

      // Action: Execute build command
      const result = await buildCommand(undefined, options, mockContext);

      // Assert: Should handle constructor error
      expect(result.success).toBe(false);
      expect(result.error).toBe(constructorError);
      expect(output.error).toHaveBeenCalledWith('Build failed', constructorError);
    });

    it('should handle isAvailable check errors', async () => {
      // Setup: Mock isAvailable throwing
      const availabilityError = new Error('Could not check TurboRepo availability');
      mockTurboInstance.isAvailable.mockRejectedValue(availabilityError);

      const options: BuildOptions = {};

      // Action: Execute build command
      const result = await buildCommand(undefined, options, mockContext);

      // Assert: Should handle availability check error
      expect(result.success).toBe(false);
      expect(result.error).toBe(availabilityError);
    });

    it('should handle non-Error exceptions', async () => {
      // Setup: Mock TurboRepo throwing non-Error
      mockTurboInstance.isAvailable.mockResolvedValue(true);
      mockTurboInstance.build.mockRejectedValue('String error');

      const options: BuildOptions = {};

      // Action: Execute build command
      const result = await buildCommand(undefined, options, mockContext);

      // Assert: Should handle string error
      expect(result.success).toBe(false);
      expect(result.message).toBe('Build failed');
      expect(typeof result.error).toBe('string');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete build workflow with clean', async () => {
      // Setup: Mock complete successful workflow
      mockTurboInstance.isAvailable.mockResolvedValue(true);
      mockTurboInstance.clean.mockResolvedValue(undefined);
      mockTurboInstance.build.mockResolvedValue(undefined);

      const options: BuildOptions = { clean: true };
      const target = 'templates';

      // Action: Execute complete build workflow
      const result = await buildCommand(target, options, mockContext);

      // Assert: Should execute full workflow
      expect(mockTurboInstance.isAvailable).toHaveBeenCalledOnce();
      expect(mockTurboInstance.clean).toHaveBeenCalledWith('templates', false);
      expect(mockTurboInstance.build).toHaveBeenCalledWith('templates', false);
      expect(result.success).toBe(true);
      
      // Check correct output messages
      expect(output.info).toHaveBeenCalledWith('Cleaning build artifacts...');
      expect(output.info).toHaveBeenCalledWith('Building templates...');
    });

    it('should handle TurboRepo disabled in config', async () => {
      // Setup: Mock TurboRepo disabled in config
      const configWithDisabledTurbo = {
        ...mockContext.config,
        turbo: { ...mockContext.config.turbo, enabled: false },
      };
      const contextWithDisabledTurbo = { ...mockContext, config: configWithDisabledTurbo };
      
      mockTurboInstance.isAvailable.mockResolvedValue(false);

      // Mock execa for fallback
      const { execa } = await import('execa');
      vi.mocked(execa).mockResolvedValue({} as any);

      const options: BuildOptions = {};

      // Action: Execute build command with disabled TurboRepo
      const result = await buildCommand(undefined, options, contextWithDisabledTurbo);

      // Assert: Should fall back to npm build
      expect(mockTurboInstance.isAvailable).toHaveBeenCalled();
      expect(output.warn).toHaveBeenCalledWith('TurboRepo not available, using fallback build');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Build completed successfully (fallback mode)');
    });
  });
});