/**
 * Unit tests for Init Command
 * Tests the functionality of initializing Context-Pods project configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import inquirer from 'inquirer';
import { TemplateSelector } from '@context-pods/core';
import { initCommand } from '../../../src/commands/init.js';
import { configManager } from '../../../src/config/index.js';
import type { CommandContext } from '../../../src/types/cli-types.js';
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
    list: vi.fn(),
    divider: vi.fn(),
    command: vi.fn((cmd: string) => cmd),
    startSpinner: vi.fn(),
    stopSpinner: vi.fn(),
    succeedSpinner: vi.fn(),
    failSpinner: vi.fn(),
  },
}));

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// Mock TemplateSelector
vi.mock('@context-pods/core', () => ({
  TemplateSelector: vi.fn(),
}));

// Mock configManager
vi.mock('../../../src/config/index.js', () => ({
  configManager: {
    loadProjectConfig: vi.fn(),
    initProjectConfig: vi.fn(),
  },
}));

describe('Init Command', () => {
  let mockContext: CommandContext;
  let mockTemplateSelector: {
    getAvailableTemplates: ReturnType<typeof vi.fn>;
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

    // Create mock TemplateSelector instance
    mockTemplateSelector = {
      getAvailableTemplates: vi.fn(),
    };

    // Mock the constructor
    vi.mocked(TemplateSelector).mockImplementation(() => mockTemplateSelector as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should initialize new project configuration', async () => {
      // Setup: No existing config, minimal input
      vi.mocked(configManager.loadProjectConfig).mockResolvedValue(undefined);
      vi.mocked(inquirer.prompt).mockResolvedValue({
        name: 'my-project',
        description: 'Test project description',
      });

      const mockConfig = {
        name: 'my-project',
        version: '1.0.0',
        description: 'Test project description',
        templates: { preferred: undefined, fallback: 'basic' },
        output: { directory: './generated', clean: false },
        build: { target: 'node18', sourcemap: true, minify: false },
      };
      vi.mocked(configManager.initProjectConfig).mockResolvedValue(mockConfig);
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      const options = {};

      // Action: Execute init command
      const result = await initCommand(undefined, options, mockContext);

      // Assert: Should initialize successfully
      expect(output.info).toHaveBeenCalledWith(
        'Initializing Context-Pods project configuration...',
      );
      expect(configManager.loadProjectConfig).toHaveBeenCalled();
      expect(output.startSpinner).toHaveBeenCalledWith('Creating project configuration...');
      expect(configManager.initProjectConfig).toHaveBeenCalledWith({
        name: 'my-project',
        description: 'Test project description',
        template: undefined,
      });
      expect(output.succeedSpinner).toHaveBeenCalledWith('Project configuration created');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
    });

    it('should use provided name and options', async () => {
      // Setup: Provided values, no prompting needed
      vi.mocked(configManager.loadProjectConfig).mockResolvedValue(undefined);

      const mockConfig = {
        name: 'provided-name',
        version: '1.0.0',
        description: 'Provided description',
        templates: { preferred: 'typescript-basic', fallback: 'basic' },
        output: { directory: './generated', clean: false },
        build: { target: 'node18', sourcemap: true, minify: false },
      };
      vi.mocked(configManager.initProjectConfig).mockResolvedValue(mockConfig);

      const options = {
        template: 'typescript-basic',
        description: 'Provided description',
      };

      // Action: Execute init command with provided values
      const result = await initCommand('provided-name', options, mockContext);

      // Assert: Should not prompt for values
      expect(inquirer.prompt).toHaveBeenCalledWith([]); // Empty questions array
      expect(configManager.initProjectConfig).toHaveBeenCalledWith({
        name: 'provided-name',
        description: 'Provided description',
        template: 'typescript-basic',
      });
      expect(result.success).toBe(true);
    });

    it('should display success information', async () => {
      // Setup: Successful initialization
      vi.mocked(configManager.loadProjectConfig).mockResolvedValue(undefined);
      vi.mocked(inquirer.prompt).mockResolvedValue({});

      const mockConfig = {
        name: 'test-project',
        version: '1.0.0',
        description: 'Test description',
        templates: { preferred: 'typescript-basic', fallback: 'basic' },
        output: { directory: './generated', clean: false },
        build: { target: 'node18', sourcemap: true, minify: false },
      };
      vi.mocked(configManager.initProjectConfig).mockResolvedValue(mockConfig);

      const options = { template: 'typescript-basic', description: 'Test description' };

      // Action: Execute init command
      const result = await initCommand('test-project', options, mockContext);

      // Assert: Should display success information
      expect(output.success).toHaveBeenCalledWith('Project initialized successfully!');
      expect(output.divider).toHaveBeenCalledTimes(2);
      expect(output.table).toHaveBeenCalledWith([
        { label: 'Project Name', value: 'test-project', color: 'cyan' },
        { label: 'Description', value: 'Test description' },
        { label: 'Template', value: 'typescript-basic', color: 'blue' },
      ]);
      expect(output.info).toHaveBeenCalledWith('Next steps:');
      expect(output.list).toHaveBeenCalledWith([
        'undefined - Generate a new MCP server',
        'undefined - Wrap an existing script',
        'undefined - List available templates',
      ]);
      expect(result.success).toBe(true);
    });
  });

  describe('Existing Configuration Handling', () => {
    it('should prompt to overwrite existing configuration', async () => {
      // Setup: Existing config found, user confirms overwrite
      const existingConfig = { name: 'existing-project' };
      vi.mocked(configManager.loadProjectConfig).mockResolvedValue(existingConfig as any);
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ confirm: true }) // Overwrite confirmation
        .mockResolvedValueOnce({ name: 'new-project' }); // Project info

      const mockConfig = {
        name: 'new-project',
        version: '1.0.0',
        description: undefined,
        templates: { preferred: undefined, fallback: 'basic' },
        output: { directory: './generated', clean: false },
        build: { target: 'node18', sourcemap: true, minify: false },
      };
      vi.mocked(configManager.initProjectConfig).mockResolvedValue(mockConfig as any);
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      const options = {};

      // Action: Execute init command
      const result = await initCommand(undefined, options, mockContext);

      // Assert: Should prompt for overwrite and proceed
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'confirm',
          name: 'confirm',
          message: 'Project configuration already exists. Overwrite?',
          default: false,
        }),
      ]);
      expect(result.success).toBe(true);
    });

    it('should cancel when user rejects overwrite', async () => {
      // Setup: Existing config found, user rejects overwrite
      const existingConfig = { name: 'existing-project' };
      vi.mocked(configManager.loadProjectConfig).mockResolvedValue(existingConfig as any);
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: false });

      const options = {};

      // Action: Execute init command
      const result = await initCommand(undefined, options, mockContext);

      // Assert: Should cancel initialization
      expect(result.success).toBe(false);
      expect(result.message).toBe('Initialization cancelled by user');
      expect(configManager.initProjectConfig).not.toHaveBeenCalled();
    });

    it('should overwrite when force option is provided', async () => {
      // Setup: Existing config found, force option provided
      const existingConfig = { name: 'existing-project' };
      vi.mocked(configManager.loadProjectConfig).mockResolvedValue(existingConfig as any);
      vi.mocked(inquirer.prompt).mockResolvedValue({});

      const mockConfig = {
        name: 'forced-project',
        version: '1.0.0',
        description: 'Forced project',
        templates: { preferred: undefined, fallback: 'basic' },
        output: { directory: './generated', clean: false },
        build: { target: 'node18', sourcemap: true, minify: false },
      };
      vi.mocked(configManager.initProjectConfig).mockResolvedValue(mockConfig as any);

      const options = { force: true, description: 'Forced project' };

      // Action: Execute init command with force
      const result = await initCommand('forced-project', options, mockContext);

      // Assert: Should skip overwrite confirmation
      expect(inquirer.prompt).not.toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'confirm' })]),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('Interactive Project Information', () => {
    beforeEach(() => {
      vi.mocked(configManager.loadProjectConfig).mockResolvedValue(undefined);
      vi.mocked(configManager.initProjectConfig).mockResolvedValue({
        name: 'test',
        version: '1.0.0',
        description: undefined,
        templates: { preferred: undefined, fallback: 'basic' },
        output: { directory: './generated', clean: false },
        build: { target: 'node18', sourcemap: true, minify: false },
      } as any);
    });

    it('should prompt for project name when not provided', async () => {
      // Setup: No name provided
      vi.mocked(inquirer.prompt).mockResolvedValue({
        name: 'prompted-name',
        description: 'Prompted description',
      });
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      const options = {};

      // Action: Execute init command without name
      const result = await initCommand(undefined, options, mockContext);

      // Assert: Should prompt for name
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'input',
            name: 'name',
            message: 'Project name:',
            validate: expect.any(Function),
          }),
        ]),
      );
      expect(result.success).toBe(true);
    });

    it('should validate project name format', async () => {
      // Setup: Mock prompt call to test validation
      vi.mocked(inquirer.prompt).mockResolvedValue({ name: 'valid-name' });
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      const options = {};

      // Action: Execute init command to trigger validation setup
      const result = await initCommand(undefined, options, mockContext);

      // Assert: Should have validation function
      const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as any[];
      const nameQuestion = promptCall.find((q: any) => q.name === 'name');
      const validateFn = nameQuestion.validate;

      expect(validateFn('valid-name')).toBe(true);
      expect(validateFn('ValidName123')).toBe(true);
      expect(validateFn('valid_name')).toBe(true);
      expect(validateFn('')).toBe('Project name is required');
      expect(validateFn('   ')).toBe('Project name is required');
      expect(validateFn('123invalid')).toContain('must start with a letter');
      expect(validateFn('invalid@name')).toContain('must start with a letter');

      expect(result.success).toBe(true);
    });

    it('should prompt for description when not provided', async () => {
      // Setup: No description provided
      vi.mocked(inquirer.prompt).mockResolvedValue({
        name: 'test-project',
        description: 'User provided description',
      });
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      const options = {};

      // Action: Execute init command
      const result = await initCommand('test-project', options, mockContext);

      // Assert: Should prompt for description
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'input',
            name: 'description',
            message: 'Project description (optional):',
          }),
        ]),
      );
      expect(result.success).toBe(true);
    });

    it('should prompt for template selection when available', async () => {
      // Setup: Templates available, no template specified
      const mockTemplates = [
        {
          template: {
            name: 'typescript-basic',
            language: 'typescript',
            description: 'Basic TypeScript template',
          },
          templatePath: '/mock/templates/typescript-basic',
        },
        {
          template: {
            name: 'python-basic',
            language: 'python',
            description: 'Basic Python template',
          },
          templatePath: '/mock/templates/python-basic',
        },
      ];
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue(mockTemplates);
      vi.mocked(inquirer.prompt).mockResolvedValue({
        name: 'test-project',
        template: 'typescript-basic',
      });

      const options = {};

      // Action: Execute init command
      const result = await initCommand('test-project', options, mockContext);

      // Assert: Should prompt for template selection
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'list',
            name: 'template',
            message: 'Preferred template:',
            choices: [
              { name: 'No preference (auto-select)', value: undefined },
              {
                name: 'typescript-basic (typescript) - Basic TypeScript template',
                value: 'typescript-basic',
                short: 'typescript-basic',
              },
              {
                name: 'python-basic (python) - Basic Python template',
                value: 'python-basic',
                short: 'python-basic',
              },
            ],
          }),
        ]),
      );
      expect(result.success).toBe(true);
    });

    it('should handle template loading errors gracefully', async () => {
      // Setup: Template loading fails
      mockTemplateSelector.getAvailableTemplates.mockRejectedValue(
        new Error('Template directory not found'),
      );
      vi.mocked(inquirer.prompt).mockResolvedValue({
        name: 'test-project',
      });

      const options = {};

      // Action: Execute init command
      const result = await initCommand('test-project', options, mockContext);

      // Assert: Should continue without template prompt
      expect(output.debug).toHaveBeenCalledWith(
        'Failed to load templates: Template directory not found',
      );
      expect(result.success).toBe(true);
    });
  });

  describe('Success Display Variations', () => {
    beforeEach(() => {
      vi.mocked(configManager.loadProjectConfig).mockResolvedValue(undefined);
      vi.mocked(inquirer.prompt).mockResolvedValue({});
    });

    it('should display "No description" when description is empty', async () => {
      // Setup: Config without description
      const mockConfig = {
        name: 'test-project',
        version: '1.0.0',
        description: undefined,
        templates: { preferred: undefined, fallback: 'basic' },
        output: { directory: './generated', clean: false },
        build: { target: 'node18', sourcemap: true, minify: false },
      };
      vi.mocked(configManager.initProjectConfig).mockResolvedValue(mockConfig);

      const options = {};

      // Action: Execute init command
      const result = await initCommand('test-project', options, mockContext);

      // Assert: Should show "No description"
      expect(output.table).toHaveBeenCalledWith([
        { label: 'Project Name', value: 'test-project', color: 'cyan' },
        { label: 'Description', value: 'No description' },
        { label: 'Template', value: 'Auto-select', color: 'blue' },
      ]);
      expect(result.success).toBe(true);
    });

    it('should display "Auto-select" when no template is specified', async () => {
      // Setup: Config without preferred template
      const mockConfig = {
        name: 'test-project',
        version: '1.0.0',
        description: 'Test description',
        templates: { preferred: undefined, fallback: 'basic' },
        output: { directory: './generated', clean: false },
        build: { target: 'node18', sourcemap: true, minify: false },
      };
      vi.mocked(configManager.initProjectConfig).mockResolvedValue(mockConfig);

      const options = { description: 'Test description' };

      // Action: Execute init command
      const result = await initCommand('test-project', options, mockContext);

      // Assert: Should show "Auto-select" for template
      expect(output.table).toHaveBeenCalledWith([
        { label: 'Project Name', value: 'test-project', color: 'cyan' },
        { label: 'Description', value: 'Test description' },
        { label: 'Template', value: 'Auto-select', color: 'blue' },
      ]);
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle config loading errors', async () => {
      // Setup: Config loading throws error
      const configError = new Error('Config loading failed');
      vi.mocked(configManager.loadProjectConfig).mockRejectedValue(configError);

      const options = {};

      // Action: Execute init command
      const result = await initCommand('test-project', options, mockContext);

      // Assert: Should handle error gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBe(configError);
      expect(result.message).toBe('Config loading failed');
      expect(output.stopSpinner).toHaveBeenCalled();
      expect(output.error).toHaveBeenCalledWith('Failed to initialize project', configError);
    });

    it('should handle config initialization errors', async () => {
      // Setup: Config initialization throws error
      vi.mocked(configManager.loadProjectConfig).mockResolvedValue(undefined);
      vi.mocked(inquirer.prompt).mockResolvedValue({ name: 'test-project' });

      const initError = new Error('Failed to create config file');
      vi.mocked(configManager.initProjectConfig).mockRejectedValue(initError);
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      const options = {};

      // Action: Execute init command
      const result = await initCommand(undefined, options, mockContext);

      // Assert: Should handle initialization error
      expect(result.success).toBe(false);
      expect(result.error).toBe(initError);
      expect(result.message).toBe('Failed to create config file');
      expect(output.stopSpinner).toHaveBeenCalled();
    });

    it('should handle inquirer prompt errors', async () => {
      // Setup: Inquirer prompt throws error
      vi.mocked(configManager.loadProjectConfig).mockResolvedValue(undefined);

      const promptError = new Error('User input error');
      vi.mocked(inquirer.prompt).mockRejectedValue(promptError);
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      const options = {};

      // Action: Execute init command
      const result = await initCommand(undefined, options, mockContext);

      // Assert: Should handle prompt error
      expect(result.success).toBe(false);
      expect(result.error).toBe(promptError);
      expect(result.message).toBe('User input error');
    });

    it('should handle non-Error exceptions', async () => {
      // Setup: Non-Error exception
      vi.mocked(configManager.loadProjectConfig).mockRejectedValue('String error');

      const options = {};

      // Action: Execute init command
      const result = await initCommand('test-project', options, mockContext);

      // Assert: Should handle string error
      expect(result.success).toBe(false);
      expect(result.message).toBe('Initialization failed');
      expect(typeof result.error).toBe('string');
    });

    it('should ensure spinner is stopped on error', async () => {
      // Setup: Error during config initialization
      vi.mocked(configManager.loadProjectConfig).mockResolvedValue(undefined);
      vi.mocked(inquirer.prompt).mockResolvedValue({ name: 'test' });

      const error = new Error('Initialization failed');
      vi.mocked(configManager.initProjectConfig).mockRejectedValue(error);
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      const options = {};

      // Action: Execute init command
      const result = await initCommand(undefined, options, mockContext);

      // Assert: Should stop spinner on error
      expect(output.startSpinner).toHaveBeenCalledWith('Creating project configuration...');
      expect(output.stopSpinner).toHaveBeenCalled();
      expect(result.success).toBe(false);
    });
  });

  describe('Working Directory Integration', () => {
    it('should use working directory basename as default project name', async () => {
      // Setup: No name provided, should use working directory
      vi.mocked(configManager.loadProjectConfig).mockResolvedValue(undefined);
      vi.mocked(inquirer.prompt).mockResolvedValue({
        name: 'working', // User accepts default
      });
      vi.mocked(configManager.initProjectConfig).mockResolvedValue({
        name: 'working',
        version: '1.0.0',
        description: undefined,
        templates: { preferred: undefined, fallback: 'basic' },
        output: { directory: './generated', clean: false },
        build: { target: 'node18', sourcemap: true, minify: false },
      } as any);
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      const options = {};

      // Action: Execute init command
      const result = await initCommand(undefined, options, mockContext);

      // Assert: Should use working directory basename as default
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'name',
            default: 'working', // basename of /mock/working
          }),
        ]),
      );
      expect(result.success).toBe(true);
    });
  });
});
