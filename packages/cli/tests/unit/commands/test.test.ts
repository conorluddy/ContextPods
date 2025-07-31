/**
 * Unit tests for Test Command
 * Tests the functionality of running tests using TurboRepo and fallback mode
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { testCommand } from '../../../src/commands/test.js';
import { TurboIntegration } from '../../../src/utils/turbo-integration.js';
import type { CommandContext, TestOptions } from '../../../src/types/cli-types.js';
import { output } from '../../../src/utils/output-formatter.js';

// Mock the output formatter
vi.mock('../../../src/utils/output-formatter.js', () => ({
  output: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
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

// Mock execa (used in fallback mode)
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

describe('Test Command', () => {
  let mockContext: CommandContext;
  let mockTurboIntegration: {
    isAvailable: ReturnType<typeof vi.fn>;
    test: ReturnType<typeof vi.fn>;
  };
  let mockExeca: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
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
    mockTurboIntegration = {
      isAvailable: vi.fn(),
      test: vi.fn(),
    };

    // Mock the constructor
    vi.mocked(TurboIntegration).mockImplementation(() => mockTurboIntegration as any);

    // Get mocked execa
    const { execa } = await import('execa');
    mockExeca = vi.mocked(execa);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('TurboRepo Integration', () => {
    it('should run tests with TurboRepo when available', async () => {
      // Setup: TurboRepo is available
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.test.mockResolvedValue(undefined);

      const options: TestOptions = {};

      // Action: Execute test command
      const result = await testCommand('my-package', options, mockContext);

      // Assert: Should use TurboRepo
      expect(TurboIntegration).toHaveBeenCalledWith('/mock/working', mockContext.config);
      expect(mockTurboIntegration.isAvailable).toHaveBeenCalled();
      expect(output.info).toHaveBeenCalledWith('Running tests for my-package...');
      expect(mockTurboIntegration.test).toHaveBeenCalledWith('my-package', false);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Tests completed successfully');
    });

    it('should run tests for all packages when no target specified', async () => {
      // Setup: TurboRepo is available, no target specified
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.test.mockResolvedValue(undefined);

      const options: TestOptions = {};

      // Action: Execute test command without target
      const result = await testCommand(undefined, options, mockContext);

      // Assert: Should test all packages
      expect(output.info).toHaveBeenCalledWith('Running tests for all packages...');
      expect(mockTurboIntegration.test).toHaveBeenCalledWith(undefined, false);
      expect(result.success).toBe(true);
    });

    it('should enable verbose mode when context is verbose', async () => {
      // Setup: TurboRepo is available, verbose context
      const verboseContext = { ...mockContext, verbose: true };
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.test.mockResolvedValue(undefined);

      const options: TestOptions = {};

      // Action: Execute test command in verbose mode
      const result = await testCommand('test-package', options, verboseContext);

      // Assert: Should pass verbose flag to turbo
      expect(mockTurboIntegration.test).toHaveBeenCalledWith('test-package', true);
      expect(result.success).toBe(true);
    });
  });

  describe('Fallback Mode', () => {
    it('should fallback to npm when TurboRepo is not available', async () => {
      // Setup: TurboRepo is not available
      mockTurboIntegration.isAvailable.mockResolvedValue(false);
      mockExeca.mockResolvedValue({ exitCode: 0 } as any);

      const options: TestOptions = {};

      // Action: Execute test command
      const result = await testCommand(undefined, options, mockContext);

      // Assert: Should use fallback mode
      expect(output.warn).toHaveBeenCalledWith('TurboRepo not available, using fallback test');
      expect(output.info).toHaveBeenCalledWith('Testing all packages...');
      expect(mockExeca).toHaveBeenCalledWith('npm', ['run', 'test'], {
        cwd: '/mock/working',
        stdio: 'pipe',
      });
      expect(output.success).toHaveBeenCalledWith('Tests completed successfully');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Tests completed successfully (fallback mode)');
    });

    it('should test specific target in fallback mode', async () => {
      // Setup: TurboRepo is not available, specific target
      mockTurboIntegration.isAvailable.mockResolvedValue(false);
      mockExeca.mockResolvedValue({ exitCode: 0 } as any);

      const options: TestOptions = {};

      // Action: Execute test command with target
      const result = await testCommand('my-package', options, mockContext);

      // Assert: Should test specific target
      expect(output.info).toHaveBeenCalledWith('Testing my-package...');
      expect(mockExeca).toHaveBeenCalledWith('npm', ['run', 'test'], {
        cwd: 'packages/my-package',
        stdio: 'pipe',
      });
      expect(result.success).toBe(true);
    });

    it('should enable coverage in fallback mode', async () => {
      // Setup: TurboRepo is not available, coverage enabled
      mockTurboIntegration.isAvailable.mockResolvedValue(false);
      mockExeca.mockResolvedValue({ exitCode: 0 } as any);

      const options: TestOptions = { coverage: true };

      // Action: Execute test command with coverage
      const result = await testCommand(undefined, options, mockContext);

      // Assert: Should add coverage flag
      expect(mockExeca).toHaveBeenCalledWith('npm', ['run', 'test', '--', '--coverage'], {
        cwd: '/mock/working',
        stdio: 'pipe',
      });
      expect(result.success).toBe(true);
    });

    it('should enable watch mode in fallback mode', async () => {
      // Setup: TurboRepo is not available, watch mode enabled
      mockTurboIntegration.isAvailable.mockResolvedValue(false);
      mockExeca.mockResolvedValue({ exitCode: 0 } as any);

      const options: TestOptions = { watch: true };

      // Action: Execute test command with watch
      const result = await testCommand(undefined, options, mockContext);

      // Assert: Should add watch flag
      expect(mockExeca).toHaveBeenCalledWith('npm', ['run', 'test', '--', '--watch'], {
        cwd: '/mock/working',
        stdio: 'pipe',
      });
      expect(result.success).toBe(true);
    });

    it('should combine coverage and watch flags in fallback mode', async () => {
      // Setup: TurboRepo is not available, both coverage and watch enabled
      mockTurboIntegration.isAvailable.mockResolvedValue(false);
      mockExeca.mockResolvedValue({ exitCode: 0 } as any);

      const options: TestOptions = { coverage: true, watch: true };

      // Action: Execute test command with both flags
      const result = await testCommand('test-package', options, mockContext);

      // Assert: Should add both flags
      expect(mockExeca).toHaveBeenCalledWith(
        'npm',
        ['run', 'test', '--', '--coverage', '--', '--watch'],
        {
          cwd: 'packages/test-package',
          stdio: 'pipe',
        },
      );
      expect(result.success).toBe(true);
    });

    it('should enable verbose stdio in fallback mode', async () => {
      // Setup: TurboRepo is not available, verbose context
      const verboseContext = { ...mockContext, verbose: true };
      mockTurboIntegration.isAvailable.mockResolvedValue(false);
      mockExeca.mockResolvedValue({ exitCode: 0 } as any);

      const options: TestOptions = {};

      // Action: Execute test command in verbose mode
      const result = await testCommand(undefined, options, verboseContext);

      // Assert: Should use inherit stdio
      expect(mockExeca).toHaveBeenCalledWith('npm', ['run', 'test'], {
        cwd: '/mock/working',
        stdio: 'inherit',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle TurboRepo test errors', async () => {
      // Setup: TurboRepo is available but test command fails
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      const testError = new Error('Tests failed with exit code 1');
      mockTurboIntegration.test.mockRejectedValue(testError);

      const options: TestOptions = {};

      // Action: Execute test command
      const result = await testCommand('failing-package', options, mockContext);

      // Assert: Should handle error gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBe(testError);
      expect(result.message).toBe('Tests failed with exit code 1');
      expect(output.error).toHaveBeenCalledWith('Tests failed', testError);
    });

    it('should handle TurboIntegration constructor errors', async () => {
      // Setup: TurboIntegration constructor throws
      const constructorError = new Error('Invalid configuration');
      vi.mocked(TurboIntegration).mockImplementation(() => {
        throw constructorError;
      });

      const options: TestOptions = {};

      // Action: Execute test command
      const result = await testCommand(undefined, options, mockContext);

      // Assert: Should handle constructor error
      expect(result.success).toBe(false);
      expect(result.error).toBe(constructorError);
      expect(result.message).toBe('Invalid configuration');
      expect(output.error).toHaveBeenCalledWith('Tests failed', constructorError);
    });

    it('should handle isAvailable check errors', async () => {
      // Setup: isAvailable throws error
      const availabilityError = new Error('Cannot check TurboRepo availability');
      mockTurboIntegration.isAvailable.mockRejectedValue(availabilityError);

      const options: TestOptions = {};

      // Action: Execute test command
      const result = await testCommand(undefined, options, mockContext);

      // Assert: Should handle availability check error
      expect(result.success).toBe(false);
      expect(result.error).toBe(availabilityError);
      expect(result.message).toBe('Cannot check TurboRepo availability');
    });

    it('should handle fallback test errors', async () => {
      // Setup: TurboRepo is not available, fallback test fails
      mockTurboIntegration.isAvailable.mockResolvedValue(false);
      const fallbackError = new Error('npm test failed');
      mockExeca.mockRejectedValue(fallbackError);

      const options: TestOptions = {};

      // Action: Execute test command
      const result = await testCommand(undefined, options, mockContext);

      // Assert: Should handle fallback error
      expect(result.success).toBe(false);
      expect(result.error).toBe(fallbackError);
      expect(result.message).toBe('Fallback tests failed');
      expect(output.error).toHaveBeenCalledWith('Fallback tests failed', fallbackError);
    });

    it('should handle non-Error exceptions', async () => {
      // Setup: Non-Error exception
      mockTurboIntegration.isAvailable.mockRejectedValue('String error');

      const options: TestOptions = {};

      // Action: Execute test command
      const result = await testCommand(undefined, options, mockContext);

      // Assert: Should handle string error
      expect(result.success).toBe(false);
      expect(result.message).toBe('Tests failed');
      expect(typeof result.error).toBe('string');
    });

    it('should handle fallback non-Error exceptions', async () => {
      // Setup: TurboRepo is not available, fallback throws non-Error
      mockTurboIntegration.isAvailable.mockResolvedValue(false);
      mockExeca.mockRejectedValue('String error in fallback');

      const options: TestOptions = {};

      // Action: Execute test command
      const result = await testCommand(undefined, options, mockContext);

      // Assert: Should handle fallback string error
      expect(result.success).toBe(false);
      expect(result.message).toBe('Fallback tests failed');
      expect(typeof result.error).toBe('string');
    });

    it('should handle execa execution errors gracefully', async () => {
      // Setup: TurboRepo is not available, execa execution fails
      mockTurboIntegration.isAvailable.mockResolvedValue(false);
      const execError = new Error('Command execution failed');
      mockExeca.mockRejectedValue(execError);

      const options: TestOptions = {};

      // Action: Execute test command
      const result = await testCommand(undefined, options, mockContext);

      // Assert: Should handle execution error
      expect(result.success).toBe(false);
      expect(result.error).toBe(execError);
      expect(result.message).toBe('Fallback tests failed');
      expect(output.error).toHaveBeenCalledWith('Fallback tests failed', execError);
    });
  });

  describe('Configuration Handling', () => {
    it('should use custom working directory', async () => {
      // Setup: Custom working directory
      const customWorkingDirContext = {
        ...mockContext,
        workingDir: '/custom/working/dir',
      };
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.test.mockResolvedValue(undefined);

      const options: TestOptions = {};

      // Action: Execute test command
      const result = await testCommand(undefined, options, customWorkingDirContext);

      // Assert: Should use custom working directory
      expect(TurboIntegration).toHaveBeenCalledWith(
        '/custom/working/dir',
        customWorkingDirContext.config,
      );
      expect(result.success).toBe(true);
    });

    it('should use custom working directory in fallback mode', async () => {
      // Setup: Custom working directory, fallback mode
      const customWorkingDirContext = {
        ...mockContext,
        workingDir: '/custom/working/dir',
      };
      mockTurboIntegration.isAvailable.mockResolvedValue(false);
      mockExeca.mockResolvedValue({ exitCode: 0 } as any);

      const options: TestOptions = {};

      // Action: Execute test command
      const result = await testCommand(undefined, options, customWorkingDirContext);

      // Assert: Should use custom working directory in fallback
      expect(mockExeca).toHaveBeenCalledWith('npm', ['run', 'test'], {
        cwd: '/custom/working/dir',
        stdio: 'pipe',
      });
      expect(result.success).toBe(true);
    });

    it('should handle disabled turbo configuration', async () => {
      // Setup: Turbo disabled in config
      const disabledTurboContext = {
        ...mockContext,
        config: { ...mockContext.config, turbo: { ...mockContext.config.turbo, enabled: false } },
      };
      mockTurboIntegration.isAvailable.mockResolvedValue(false);
      mockExeca.mockResolvedValue({ exitCode: 0 } as any);

      const options: TestOptions = {};

      // Action: Execute test command
      const result = await testCommand(undefined, options, disabledTurboContext);

      // Assert: Should use fallback mode
      expect(output.warn).toHaveBeenCalledWith('TurboRepo not available, using fallback test');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Tests completed successfully (fallback mode)');
    });
  });

  describe('Options Integration', () => {
    it('should pass all options correctly to TurboRepo', async () => {
      // Setup: TurboRepo is available, various options
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.test.mockResolvedValue(undefined);

      const options: TestOptions = {
        target: 'specific-package',
        coverage: true,
        watch: true,
      };

      // Action: Execute test command with options
      const result = await testCommand('override-target', options, mockContext);

      // Assert: Should use target from positional argument, not options
      expect(mockTurboIntegration.test).toHaveBeenCalledWith('override-target', false);
      expect(result.success).toBe(true);
    });

    it('should handle empty options object', async () => {
      // Setup: TurboRepo is available, empty options
      mockTurboIntegration.isAvailable.mockResolvedValue(true);
      mockTurboIntegration.test.mockResolvedValue(undefined);

      const options: TestOptions = {};

      // Action: Execute test command with empty options
      const result = await testCommand(undefined, options, mockContext);

      // Assert: Should work with no options
      expect(mockTurboIntegration.test).toHaveBeenCalledWith(undefined, false);
      expect(result.success).toBe(true);
    });

    it('should handle undefined options in fallback mode', async () => {
      // Setup: TurboRepo is not available, undefined options
      mockTurboIntegration.isAvailable.mockResolvedValue(false);
      mockExeca.mockResolvedValue({ exitCode: 0 } as any);

      const options: TestOptions = {};

      // Action: Execute test command with undefined options
      const result = await testCommand(undefined, options, mockContext);

      // Assert: Should work with no extra flags
      expect(mockExeca).toHaveBeenCalledWith('npm', ['run', 'test'], {
        cwd: '/mock/working',
        stdio: 'pipe',
      });
      expect(result.success).toBe(true);
    });
  });
});
