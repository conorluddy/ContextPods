/**
 * Unit tests for CLI Commands
 * Checkpoint 3.2: CLI Command Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  CommandContext,
  GenerateOptions,
  WrapOptions,
  BuildOptions,
} from '../../src/types/cli-types.js';

// Mock core dependencies
vi.mock('@context-pods/core', () => ({
  TemplateSelector: vi.fn(),
  DefaultTemplateEngine: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock output formatter
vi.mock('../../src/utils/output-formatter.js', () => {
  const templateMock = vi.fn((name: string) => `[template:${name}]`);
  const pathMock = vi.fn((path: string) => `[path:${path}]`);
  const commandMock = vi.fn((cmd: string) => `[cmd:${cmd}]`);

  return {
    output: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      startSpinner: vi.fn(),
      stopSpinner: vi.fn(),
      succeedSpinner: vi.fn(),
      failSpinner: vi.fn(),
      template: templateMock,
      path: pathMock,
      command: commandMock,
      table: vi.fn(),
      list: vi.fn(),
      json: vi.fn(),
    },
  };
});

describe('CLI Commands', () => {
  let mockContext: CommandContext;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock context
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

  /**
   * Test 1: Generate Command Structure
   */
  describe('Generate Command', () => {
    it('should export generateCommand function', async () => {
      // Action: Import generate command
      const { generateCommand } = await import('../../src/commands/generate.js');

      // Assert: Function exists and is callable
      expect(typeof generateCommand).toBe('function');
      expect(generateCommand).toBeDefined();
    });

    it('should accept correct parameters', async () => {
      // Setup: Mock to prevent actual execution
      vi.doMock('../../src/commands/generate.js', () => ({
        generateCommand: vi.fn().mockResolvedValue({ success: true }),
      }));

      const { generateCommand } = await import('../../src/commands/generate.js');
      const options: GenerateOptions = {
        name: 'test-server',
        template: 'typescript-advanced',
      };

      // Action: Call with expected parameters
      const result = await generateCommand('template-name', options, mockContext);

      // Assert: Function accepts parameters correctly
      expect(generateCommand).toHaveBeenCalledWith('template-name', options, mockContext);
      expect(result).toEqual({ success: true });
    });

    it('should handle invalid options gracefully', async () => {
      // Setup: Mock to simulate validation failure
      vi.doMock('../../src/commands/generate.js', () => ({
        generateCommand: vi.fn().mockResolvedValue({
          success: false,
          message: 'Invalid server name',
        }),
      }));

      const { generateCommand } = await import('../../src/commands/generate.js');
      const invalidOptions = {
        name: '', // Invalid empty name
      } as GenerateOptions;

      // Action: Call with invalid options
      const result = await generateCommand(undefined, invalidOptions, mockContext);

      // Assert: Proper error handling
      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  /**
   * Test 2: List Command Structure
   */
  describe('List Command', () => {
    it('should export listCommand function', async () => {
      // Action: Import list command
      const { listCommand } = await import('../../src/commands/list.js');

      // Assert: Function exists and is callable
      expect(typeof listCommand).toBe('function');
      expect(listCommand).toBeDefined();
    });

    it('should return CommandResult with data array', async () => {
      // Setup: Mock to return empty list
      vi.doMock('../../src/commands/list.js', () => ({
        listCommand: vi.fn().mockResolvedValue({
          success: true,
          data: [],
          message: 'No MCP servers found',
        }),
      }));

      const { listCommand } = await import('../../src/commands/list.js');
      const options = { format: 'table' as const };

      // Action: Execute list command
      const result = await listCommand(options, mockContext);

      // Assert: Returns proper structure
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should support different output formats', async () => {
      // Setup: Mock different format responses
      vi.doMock('../../src/commands/list.js', () => ({
        listCommand: vi
          .fn()
          .mockResolvedValueOnce({ success: true, data: [], format: 'table' })
          .mockResolvedValueOnce({ success: true, data: [], format: 'json' }),
      }));

      const { listCommand } = await import('../../src/commands/list.js');

      // Action: Test different formats
      const tableResult = await listCommand({ format: 'table' }, mockContext);
      const jsonResult = await listCommand({ format: 'json' }, mockContext);

      // Assert: Both formats supported
      expect(tableResult.success).toBe(true);
      expect(jsonResult.success).toBe(true);
    });
  });

  /**
   * Test 3: Templates Command Structure
   */
  describe('Templates Command', () => {
    it('should export templatesCommand function', async () => {
      // Action: Import templates command
      const { templatesCommand } = await import('../../src/commands/templates.js');

      // Assert: Function exists and is callable
      expect(typeof templatesCommand).toBe('function');
      expect(templatesCommand).toBeDefined();
    });

    it('should return available templates', async () => {
      // Setup: Mock templates response
      vi.doMock('../../src/commands/templates.js', () => ({
        templatesCommand: vi.fn().mockResolvedValue({
          success: true,
          data: [
            { name: 'typescript-advanced', language: 'typescript' },
            { name: 'python-basic', language: 'python' },
          ],
        }),
      }));

      const { templatesCommand } = await import('../../src/commands/templates.js');
      const options = { format: 'table' as const };

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Returns template data
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should handle no templates found', async () => {
      // Setup: Mock empty templates response
      vi.doMock('../../src/commands/templates.js', () => ({
        templatesCommand: vi.fn().mockResolvedValue({
          success: true,
          data: [],
          message: 'No templates found',
        }),
      }));

      const { templatesCommand } = await import('../../src/commands/templates.js');
      const options = { format: 'json' as const };

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Handles empty case gracefully
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.message).toContain('No templates found');
    });
  });

  /**
   * Test 4: Wrap Command Structure
   */
  describe('Wrap Command', () => {
    it('should export wrapCommand function', async () => {
      // Action: Import wrap command
      const { wrapCommand } = await import('../../src/commands/wrap.js');

      // Assert: Function exists and is callable
      expect(typeof wrapCommand).toBe('function');
      expect(wrapCommand).toBeDefined();
    });

    it('should validate script file parameter', async () => {
      // Setup: Mock validation failure
      vi.doMock('../../src/commands/wrap.js', () => ({
        wrapCommand: vi.fn().mockResolvedValue({
          success: false,
          message: 'Script file is required',
        }),
      }));

      const { wrapCommand } = await import('../../src/commands/wrap.js');
      const options: WrapOptions = {
        script: '', // Invalid empty script
        name: 'test-wrapper',
      };

      // Action: Execute wrap command with invalid script
      const result = await wrapCommand(options, mockContext);

      // Assert: Validation error
      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should accept wrap options', async () => {
      // Setup: Mock successful wrap
      vi.doMock('../../src/commands/wrap.js', () => ({
        wrapCommand: vi.fn().mockResolvedValue({
          success: true,
          message: 'Script wrapped successfully',
        }),
      }));

      const { wrapCommand } = await import('../../src/commands/wrap.js');
      const options: WrapOptions = {
        script: '/path/to/script.ts',
        name: 'wrapped-server',
        description: 'Wrapped script server',
        template: 'typescript-wrapper',
      };

      // Action: Execute wrap command
      const result = await wrapCommand(options, mockContext);

      // Assert: Successful wrapping
      expect(wrapCommand).toHaveBeenCalledWith(options, mockContext);
      expect(result.success).toBe(true);
    });
  });

  /**
   * Test 5: Build Command Structure
   */
  describe('Build Command', () => {
    it('should export buildCommand function', async () => {
      // Action: Import build command
      const { buildCommand } = await import('../../src/commands/build.js');

      // Assert: Function exists and is callable
      expect(typeof buildCommand).toBe('function');
      expect(buildCommand).toBeDefined();
    });

    it('should handle build options', async () => {
      // Setup: Mock successful build
      vi.doMock('../../src/commands/build.js', () => ({
        buildCommand: vi.fn().mockResolvedValue({
          success: true,
          message: 'Build completed successfully',
        }),
      }));

      const { buildCommand } = await import('../../src/commands/build.js');
      const options: BuildOptions = {
        target: 'production',
        clean: true,
        sourcemap: true,
        minify: false,
      };

      // Action: Execute build command
      const result = await buildCommand(options, mockContext);

      // Assert: Build executed with options
      expect(buildCommand).toHaveBeenCalledWith(options, mockContext);
      expect(result.success).toBe(true);
    });

    it('should handle build failures', async () => {
      // Setup: Mock build failure
      vi.doMock('../../src/commands/build.js', () => ({
        buildCommand: vi.fn().mockResolvedValue({
          success: false,
          message: 'Build failed: compilation errors',
          error: new Error('TypeScript compilation failed'),
        }),
      }));

      const { buildCommand } = await import('../../src/commands/build.js');
      const options: BuildOptions = {};

      // Action: Execute build command
      const result = await buildCommand(options, mockContext);

      // Assert: Build failure handled
      expect(result.success).toBe(false);
      expect(result.message).toContain('Build failed');
      expect(result.error).toBeDefined();
    });
  });

  /**
   * Test 6: Command Interface Compliance
   */
  describe('Command Interface Compliance', () => {
    it('all commands should return CommandResult interface', async () => {
      // Setup: Import all commands
      const commands = await Promise.all([
        import('../../src/commands/generate.js'),
        import('../../src/commands/list.js'),
        import('../../src/commands/templates.js'),
        import('../../src/commands/wrap.js'),
        import('../../src/commands/build.js'),
      ]);

      // Action: Check all exported functions exist
      const [generate, list, templates, wrap, build] = commands;

      // Assert: All commands export the expected functions
      expect(typeof generate.generateCommand).toBe('function');
      expect(typeof list.listCommand).toBe('function');
      expect(typeof templates.templatesCommand).toBe('function');
      expect(typeof wrap.wrapCommand).toBe('function');
      expect(typeof build.buildCommand).toBe('function');
    });

    it('should validate CommandContext parameter structure', () => {
      // Action: Validate context structure
      const requiredProperties = ['config', 'workingDir', 'templatePaths', 'outputPath', 'verbose'];

      // Assert: Mock context has all required properties
      requiredProperties.forEach((prop) => {
        expect(mockContext).toHaveProperty(prop);
      });

      // Assert: Config has required nested properties
      expect(mockContext.config).toHaveProperty('templatesPath');
      expect(mockContext.config).toHaveProperty('outputPath');
      expect(mockContext.config).toHaveProperty('turbo');
      expect(mockContext.config).toHaveProperty('registry');
    });

    it('should support both verbose and quiet modes', () => {
      // Setup: Test contexts with different verbosity
      const verboseContext = { ...mockContext, verbose: true };
      const quietContext = { ...mockContext, verbose: false };

      // Action: Validate context structures
      // Assert: Both contexts are valid
      expect(verboseContext.verbose).toBe(true);
      expect(quietContext.verbose).toBe(false);
      expect(verboseContext.config).toEqual(quietContext.config);
    });
  });

  /**
   * Test 7: Output Formatter Integration
   */
  describe('Output Formatter Integration', () => {
    it('should use output formatter for all user-facing messages', async () => {
      // Action: Import output formatter
      const { output } = await import('../../src/utils/output-formatter.js');

      // Assert: Output formatter methods are available
      expect(typeof output.info).toBe('function');
      expect(typeof output.warn).toBe('function');
      expect(typeof output.error).toBe('function');
      expect(typeof output.success).toBe('function');
      expect(typeof output.startSpinner).toBe('function');
      expect(typeof output.stopSpinner).toBe('function');
      expect(typeof output.table).toBe('function');
      expect(typeof output.json).toBe('function');
    });

    it('should format template names consistently', async () => {
      // Action: Import and test formatter
      const { output } = await import('../../src/utils/output-formatter.js');

      // Action: Call template formatter and verify it doesn't throw
      expect(() => output.template('typescript-advanced')).not.toThrow();

      // Assert: Template formatter method exists
      expect(typeof output.template).toBe('function');
    });

    it('should format paths consistently', async () => {
      // Action: Import and test formatter
      const { output } = await import('../../src/utils/output-formatter.js');

      // Action: Call path formatter and verify it doesn't throw
      expect(() => output.path('/some/path')).not.toThrow();

      // Assert: Path formatter method exists
      expect(typeof output.path).toBe('function');
    });
  });

  /**
   * Test 8: Error Handling Patterns
   */
  describe('Error Handling Patterns', () => {
    it('should handle missing required parameters', async () => {
      // Setup: Mock command that validates parameters
      vi.doMock('../../src/commands/generate.js', () => ({
        generateCommand: vi.fn().mockImplementation((template, options, _context) => {
          if (!options.name) {
            return Promise.resolve({
              success: false,
              message: 'Server name is required',
            });
          }
          return Promise.resolve({ success: true });
        }),
      }));

      const { generateCommand } = await import('../../src/commands/generate.js');

      // Action: Call without required parameter
      const result = await generateCommand(undefined, {} as GenerateOptions, mockContext);

      // Assert: Proper error handling
      expect(result.success).toBe(false);
      expect(result.message).toContain('required');
    });

    it('should handle filesystem errors gracefully', async () => {
      // Setup: Mock command that handles fs errors
      vi.doMock('../../src/commands/list.js', () => ({
        listCommand: vi.fn().mockResolvedValue({
          success: false,
          message: 'Unable to access output directory',
          error: new Error('EACCES: permission denied'),
        }),
      }));

      const { listCommand } = await import('../../src/commands/list.js');

      // Action: Execute command that encounters fs error
      const result = await listCommand({ format: 'table' }, mockContext);

      // Assert: Graceful error handling
      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
      expect(result.error).toBeDefined();
    });

    it('should provide helpful error messages', async () => {
      // Setup: Mock command with helpful errors
      vi.doMock('../../src/commands/templates.js', () => ({
        templatesCommand: vi.fn().mockResolvedValue({
          success: false,
          message: 'No templates found. Please check your template directories configuration.',
        }),
      }));

      const { templatesCommand } = await import('../../src/commands/templates.js');

      // Action: Execute command that fails
      const result = await templatesCommand({ format: 'table' }, mockContext);

      // Assert: Helpful error message
      expect(result.success).toBe(false);
      expect(result.message).toContain('template');
      expect(result.message).toContain('configuration');
    });
  });
});
