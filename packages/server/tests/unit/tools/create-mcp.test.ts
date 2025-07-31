/**
 * Unit tests for CreateMCPTool
 * Tests the functionality of creating MCP servers with templates
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { join } from 'path';
import { promises as fs } from 'fs';
import { CreateMCPTool } from '../../../src/tools/create-mcp.js';
import { TemplateSelector, DefaultTemplateEngine, TemplateLanguage } from '@context-pods/core';
import { getRegistryOperations } from '../../../src/registry/index.js';
import { CONFIG } from '../../../src/config/index.js';

// Mock all dependencies
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
  },
}));

vi.mock('@context-pods/core', () => ({
  TemplateSelector: vi.fn(),
  DefaultTemplateEngine: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  TemplateLanguage: {
    TYPESCRIPT: 'typescript',
    NODEJS: 'javascript',
    PYTHON: 'python',
    RUST: 'rust',
    SHELL: 'shell',
  },
}));

vi.mock('../../../src/registry/index.js', () => ({
  getRegistryOperations: vi.fn(),
}));

vi.mock('../../../src/config/index.js', () => ({
  CONFIG: {
    templatesPath: '/mock/templates',
    generatedPackagesPath: '/mock/generated',
  },
}));

describe('CreateMCPTool', () => {
  let createMCPTool: CreateMCPTool;
  let mockTemplateSelector: {
    getAvailableTemplates: Mock;
    getRecommendedTemplate: Mock;
  };
  let mockTemplateEngine: {
    validateVariables: Mock;
    process: Mock;
  };
  let mockRegistryOperations: {
    isNameAvailable: Mock;
    registerServer: Mock;
    markServerBuilding: Mock;
    markServerReady: Mock;
    markServerError: Mock;
  };
  let mockFs: {
    access: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock instances
    mockTemplateSelector = {
      getAvailableTemplates: vi.fn(),
      getRecommendedTemplate: vi.fn(),
    };

    mockTemplateEngine = {
      validateVariables: vi.fn(),
      process: vi.fn(),
    };

    mockRegistryOperations = {
      isNameAvailable: vi.fn(),
      registerServer: vi.fn(),
      markServerBuilding: vi.fn(),
      markServerReady: vi.fn(),
      markServerError: vi.fn(),
    };

    mockFs = {
      access: vi.mocked(fs.access),
    };

    // Mock constructors
    vi.mocked(TemplateSelector).mockImplementation(() => mockTemplateSelector as any);
    vi.mocked(DefaultTemplateEngine).mockImplementation(() => mockTemplateEngine as any);
    vi.mocked(getRegistryOperations).mockResolvedValue(mockRegistryOperations as any);

    // Set up default mock returns after mocks are created
    const defaultTemplate = {
      template: {
        name: 'typescript-advanced',
        language: 'typescript',
        tags: ['typescript', 'advanced'],
        optimization: {
          turboRepo: true,
          hotReload: true,
          sharedDependencies: true,
          buildCaching: true,
        },
        variables: {
          serverName: { type: 'string', required: true },
          serverDescription: { type: 'string', required: false, default: 'MCP server' },
        },
      },
      templatePath: '/mock/templates/typescript-advanced',
      reasons: ['TypeScript language requested'],
      score: 10,
    };

    mockTemplateSelector.getAvailableTemplates.mockResolvedValue([defaultTemplate]);
    mockTemplateSelector.getRecommendedTemplate.mockResolvedValue(defaultTemplate);

    mockTemplateEngine.validateVariables.mockResolvedValue({
      isValid: true,
      errors: [],
    });

    mockTemplateEngine.process.mockResolvedValue({
      success: true,
      generatedFiles: ['index.ts', 'package.json'],
      buildCommand: 'npm run build',
      devCommand: 'npm run dev',
      mcpConfigPath: '/mock/output/test-server/mcp.config.json',
    });

    mockRegistryOperations.isNameAvailable.mockResolvedValue(true);
    mockRegistryOperations.registerServer.mockResolvedValue({
      id: 'test-server-id',
      name: 'test-server',
      status: 'building' as const,
      template: 'typescript-advanced',
      path: '/mock/output/test-server',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    mockRegistryOperations.markServerBuilding.mockResolvedValue(undefined);
    mockRegistryOperations.markServerReady.mockResolvedValue(undefined);
    mockRegistryOperations.markServerError.mockResolvedValue(undefined);

    mockFs.access.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    // Create tool instance
    createMCPTool = new CreateMCPTool();
  });

  describe('Argument Validation', () => {
    it('should validate required name argument', async () => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);

      const result = await createMCPTool.safeExecute({});
      expect(result.content[0].text).toContain('Missing required argument: name');
    });

    it('should validate name format', async () => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);

      const result = await createMCPTool.safeExecute({ name: '123invalid' });
      expect(result.content[0].text).toContain('Server name must start with a letter');
    });

    it('should validate name length constraints', async () => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);

      let result = await createMCPTool.safeExecute({ name: '' });
      expect(result.content[0].text).toContain('must be at least 1 characters long');

      result = await createMCPTool.safeExecute({
        name: 'a'.repeat(51),
      });
      expect(result.content[0].text).toContain('must be at most 50 characters long');
    });

    it('should check name availability', async () => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(false);

      const result = await createMCPTool.safeExecute({ name: 'taken-name' });
      expect(result.content[0].text).toContain("Server name 'taken-name' is already taken");
    });

    it('should validate optional string arguments', async () => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);

      const result = await createMCPTool.safeExecute({
        name: 'valid-name',
        template: 123,
      });
      expect(result.content[0].text).toContain("Argument 'template' must be a string");
    });

    it('should validate description length', async () => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);

      const result = await createMCPTool.safeExecute({
        name: 'valid-name',
        description: 'a'.repeat(501),
      });
      expect(result.content[0].text).toContain('must be at most 500 characters long');
    });

    it('should validate object arguments', async () => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);

      const result = await createMCPTool.safeExecute({
        name: 'valid-name',
        variables: 'not-an-object',
      });
      expect(result.content[0].text).toContain("Argument 'variables' must be an object");
    });

    it('should validate boolean arguments', async () => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);

      const result = await createMCPTool.safeExecute({
        name: 'valid-name',
        generateMcpConfig: 'true',
      });
      expect(result.content[0].text).toContain("Argument 'generateMcpConfig' must be a boolean");
    });
  });

  describe('Template Selection', () => {
    beforeEach(() => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
    });

    it('should select specific template when requested', async () => {
      const mockTemplate = {
        template: {
          name: 'typescript-basic',
          language: 'typescript',
          tags: ['typescript', 'basic'],
          optimization: {
            turboRepo: false,
            hotReload: true,
            sharedDependencies: false,
            buildCaching: true,
          },
          variables: {
            serverName: { type: 'string', required: true },
          },
        },
        templatePath: '/mock/templates/typescript-basic',
        reasons: ['Specific template requested'],
        score: 100,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([mockTemplate]);
      mockTemplateEngine.validateVariables.mockResolvedValue({ isValid: true, errors: [] });
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: ['package.json', 'src/index.ts'],
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
      });
      mockRegistryOperations.registerServer.mockResolvedValue({ id: 'server-123' });

      const result = await createMCPTool.safeExecute({
        name: 'my-server',
        template: 'typescript-basic',
      });

      expect(mockTemplateSelector.getAvailableTemplates).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Successfully created MCP server: my-server');
    });

    it('should handle template not found', async () => {
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      const result = await createMCPTool.safeExecute({
        name: 'my-server',
        template: 'non-existent-template',
      });

      expect(result.content[0].text).toContain("Template 'non-existent-template' not found");
    });

    it('should auto-select template based on language', async () => {
      const mockTemplate = {
        template: {
          name: 'python-basic',
          language: 'python',
          tags: ['python'],
          optimization: {
            turboRepo: false,
            hotReload: false,
            sharedDependencies: false,
            buildCaching: false,
          },
          variables: {},
        },
        templatePath: '/mock/templates/python-basic',
        reasons: ['Language preference: python'],
        score: 90,
      };

      mockTemplateSelector.getRecommendedTemplate.mockResolvedValue(mockTemplate);
      mockTemplateEngine.validateVariables.mockResolvedValue({ isValid: true, errors: [] });
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: ['main.py'],
      });
      mockRegistryOperations.registerServer.mockResolvedValue({ id: 'server-456' });

      const result = await createMCPTool.safeExecute({
        name: 'python-server',
        language: 'python',
      });

      expect(mockTemplateSelector.getRecommendedTemplate).toHaveBeenCalledWith(TemplateLanguage.PYTHON);
      expect(result.content[0].text).toContain('Successfully created MCP server: python-server');
    });

    it('should handle invalid language gracefully', async () => {
      const mockTemplate = {
        template: {
          name: 'typescript-advanced',
          language: 'typescript',
          tags: ['typescript', 'advanced'],
          optimization: {
            turboRepo: true,
            hotReload: true,
            sharedDependencies: true,
            buildCaching: true,
          },
          variables: {},
        },
        templatePath: '/mock/templates/typescript-advanced',
        reasons: ['Default template'],
        score: 85,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([mockTemplate]);
      mockTemplateEngine.validateVariables.mockResolvedValue({ isValid: true, errors: [] });
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: ['package.json'],
      });
      mockRegistryOperations.registerServer.mockResolvedValue({ id: 'server-789' });

      const result = await createMCPTool.safeExecute({
        name: 'server-with-invalid-lang',
        language: 'cobol',
      });

      expect(mockTemplateSelector.getAvailableTemplates).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Successfully created MCP server');
    });

    it('should fallback to default template', async () => {
      const mockTemplate = {
        template: {
          name: 'basic',
          language: 'typescript',
          tags: ['basic'],
          optimization: {
            turboRepo: false,
            hotReload: false,
            sharedDependencies: false,
            buildCaching: false,
          },
          variables: {},
        },
        templatePath: '/mock/templates/basic',
        reasons: ['Fallback template'],
        score: 50,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([mockTemplate]);
      mockTemplateEngine.validateVariables.mockResolvedValue({ isValid: true, errors: [] });
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: ['index.js'],
      });
      mockRegistryOperations.registerServer.mockResolvedValue({ id: 'server-fallback' });

      const result = await createMCPTool.safeExecute({
        name: 'fallback-server',
      });

      expect(result.content[0].text).toContain('Successfully created MCP server: fallback-server');
    });

    it('should handle no templates available', async () => {
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      const result = await createMCPTool.safeExecute({
        name: 'no-template-server',
      });

      expect(result.content[0].text).toContain('No suitable template found');
    });
  });

  describe('Output Path Handling', () => {
    beforeEach(() => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);
    });

    it('should use custom output path when provided', async () => {
      const customPath = '/custom/output/path';
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));

      const mockTemplate = {
        template: {
          name: 'basic',
          language: 'typescript',
          optimization: { turboRepo: false, hotReload: false, sharedDependencies: false, buildCaching: false },
          variables: {},
        },
        templatePath: '/mock/templates/basic',
        reasons: ['Default'],
        score: 50,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([mockTemplate]);
      mockTemplateEngine.validateVariables.mockResolvedValue({ isValid: true, errors: [] });
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: ['index.js'],
      });
      mockRegistryOperations.registerServer.mockResolvedValue({ id: 'server-custom' });

      const result = await createMCPTool.safeExecute({
        name: 'custom-path-server',
        outputPath: customPath,
      });

      expect(mockFs.access).toHaveBeenCalledWith(customPath);
      expect(result.content[0].text).toContain('Successfully created MCP server');
    });

    it('should use default output path when not provided', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));

      const mockTemplate = {
        template: {
          name: 'basic',
          language: 'typescript',
          optimization: { turboRepo: false, hotReload: false, sharedDependencies: false, buildCaching: false },
          variables: {},
        },
        templatePath: '/mock/templates/basic',
        reasons: ['Default'],
        score: 50,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([mockTemplate]);
      mockTemplateEngine.validateVariables.mockResolvedValue({ isValid: true, errors: [] });
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: ['index.js'],
      });
      mockRegistryOperations.registerServer.mockResolvedValue({ id: 'server-default' });

      const result = await createMCPTool.safeExecute({
        name: 'default-path-server',
      });

      const expectedPath = join(CONFIG.generatedPackagesPath, 'default-path-server');
      expect(mockFs.access).toHaveBeenCalledWith(expectedPath);
      expect(result.content[0].text).toContain('Successfully created MCP server');
    });

    it('should fail if output directory already exists', async () => {
      mockFs.access.mockResolvedValue(undefined); // Directory exists

      const result = await createMCPTool.safeExecute({
        name: 'existing-dir-server',
      });

      expect(result.content[0].text).toContain('Output directory already exists');
    });
  });

  describe('Template Variable Handling', () => {
    beforeEach(() => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
    });

    it('should prepare template variables correctly', async () => {
      const mockTemplate = {
        template: {
          name: 'variable-template',
          language: 'typescript',
          optimization: { turboRepo: false, hotReload: false, sharedDependencies: false, buildCaching: false },
          variables: {
            serverName: { type: 'string', required: true },
            customVar: { type: 'string', required: false, default: 'default-value' },
          },
        },
        templatePath: '/mock/templates/variable-template',
        reasons: ['Default'],
        score: 50,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([mockTemplate]);
      mockTemplateEngine.validateVariables.mockResolvedValue({ isValid: true, errors: [] });
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: ['index.js'],
      });
      mockRegistryOperations.registerServer.mockResolvedValue({ id: 'server-variables' });

      const result = await createMCPTool.safeExecute({
        name: 'variable-server',
        description: 'Server with variables',
        variables: {
          customInput: 'user-provided-value',
        },
      });

      expect(mockTemplateEngine.validateVariables).toHaveBeenCalledWith(
        mockTemplate.template,
        expect.objectContaining({
          serverName: 'variable-server',
          serverDescription: 'Server with variables',
          customInput: 'user-provided-value',
          packageName: 'variable-server',
          authorName: 'Context-Pods',
          customVar: 'default-value',
        })
      );
      expect(result.content[0].text).toContain('Successfully created MCP server');
    });

    it('should handle template variable validation errors', async () => {
      const mockTemplate = {
        template: {
          name: 'validation-template',
          language: 'typescript',
          optimization: { turboRepo: false, hotReload: false, sharedDependencies: false, buildCaching: false },
          variables: {
            requiredVar: { type: 'string', required: true },
          },
        },
        templatePath: '/mock/templates/validation-template',
        reasons: ['Default'],
        score: 50,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([mockTemplate]);
      mockTemplateEngine.validateVariables.mockResolvedValue({
        isValid: false,
        errors: [
          { field: 'requiredVar', message: 'This field is required' },
          { field: 'port', message: 'Must be a number between 1000 and 65535' },
        ],
      });

      const result = await createMCPTool.safeExecute({
        name: 'validation-error-server',
      });

      expect(result.content[0].text).toContain('Template variable validation failed');
      expect(result.content[0].text).toContain('• requiredVar: This field is required');
      expect(result.content[0].text).toContain('• port: Must be a number between 1000 and 65535');
    });
  });

  describe('MCP Config Generation', () => {
    beforeEach(() => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
    });

    it('should generate MCP config when requested', async () => {
      // Ensure default mocks will work for this test first
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));

      const result = await createMCPTool.safeExecute({
        name: 'config-server',
        generateMcpConfig: true,
        configName: 'my-config',
        configPath: '/custom/config/path',
        command: 'node',
        // Note: args is validated as object, not array, which seems like a bug in the source
        args: { 0: 'dist/index.js' }, // Working around the validation bug
        env: { NODE_ENV: 'production' },
      });

      expect(mockTemplateEngine.process).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
          language: expect.any(String),
        }),
        expect.objectContaining({
          mcpConfig: {
            generateConfig: true,
            configName: 'my-config',
            configPath: '/custom/config/path',
            command: 'node',
            args: { 0: 'dist/index.js' },
            env: { NODE_ENV: 'production' },
          },
        })
      );
      expect(result.content[0].text).toContain('Successfully created MCP server');
    });

    it('should use template default for MCP config generation', async () => {
      const mockTemplate = {
        template: {
          name: 'default-config-template',
          language: 'typescript',
          optimization: { turboRepo: false, hotReload: false, sharedDependencies: false, buildCaching: false },
          variables: {},
          mcpConfig: {
            generateByDefault: true,
          },
        },
        templatePath: '/mock/templates/default-config-template',
        reasons: ['Default'],
        score: 50,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([mockTemplate]);
      mockTemplateEngine.validateVariables.mockResolvedValue({ isValid: true, errors: [] });
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: ['index.js'],
      });
      mockRegistryOperations.registerServer.mockResolvedValue({ id: 'server-default-config' });

      const result = await createMCPTool.safeExecute({
        name: 'default-config-server',
      });

      expect(mockTemplateEngine.process).toHaveBeenCalledWith(
        mockTemplate.template,
        expect.objectContaining({
          mcpConfig: {
            generateConfig: true,
            configName: undefined,
            configPath: undefined,
            command: undefined,
            args: undefined,
            env: undefined,
          },
        })
      );
      expect(result.content[0].text).toContain('Successfully created MCP server');
    });

    it('should skip MCP config when not requested', async () => {
      const mockTemplate = {
        template: {
          name: 'no-config-template',
          language: 'typescript',
          optimization: { turboRepo: false, hotReload: false, sharedDependencies: false, buildCaching: false },
          variables: {},
        },
        templatePath: '/mock/templates/no-config-template',
        reasons: ['Default'],
        score: 50,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([mockTemplate]);
      mockTemplateEngine.validateVariables.mockResolvedValue({ isValid: true, errors: [] });
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: ['index.js'],
      });
      mockRegistryOperations.registerServer.mockResolvedValue({ id: 'server-no-config' });

      const result = await createMCPTool.safeExecute({
        name: 'no-config-server',
        generateMcpConfig: false,
      });

      expect(mockTemplateEngine.process).toHaveBeenCalledWith(
        mockTemplate.template,
        expect.objectContaining({
          mcpConfig: undefined,
        })
      );
      expect(result.content[0].text).toContain('Successfully created MCP server');
    });
  });

  describe('Registry Integration', () => {
    beforeEach(() => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
    });

    it('should register server and update status correctly', async () => {
      const mockTemplate = {
        template: {
          name: 'registry-template',
          language: 'typescript',
          tags: ['typescript', 'test'],
          optimization: { turboRepo: false, hotReload: false, sharedDependencies: false, buildCaching: false },
          variables: {},
        },
        templatePath: '/mock/templates/registry-template',
        reasons: ['Default'],
        score: 50,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([mockTemplate]);
      mockTemplateEngine.validateVariables.mockResolvedValue({ isValid: true, errors: [] });
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: ['index.js'],
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
      });
      mockRegistryOperations.registerServer.mockResolvedValue({ id: 'server-registry-123' });

      const result = await createMCPTool.safeExecute({
        name: 'registry-server',
        description: 'Test server for registry',
      });

      expect(mockRegistryOperations.registerServer).toHaveBeenCalledWith({
        name: 'registry-server',
        template: 'registry-template',
        path: expect.stringContaining('registry-server'),
        templateVariables: expect.any(Object),
        description: 'Test server for registry',
        tags: ['typescript', 'test'],
      });
      expect(mockRegistryOperations.markServerBuilding).toHaveBeenCalledWith('server-registry-123');
      expect(mockRegistryOperations.markServerReady).toHaveBeenCalledWith(
        'server-registry-123',
        'npm run build',
        'npm run dev'
      );
      expect(result.content[0].text).toContain('Successfully created MCP server');
    });

    it('should handle registry registration errors', async () => {
      mockRegistryOperations.registerServer.mockRejectedValue(new Error('Registry database error'));

      const result = await createMCPTool.safeExecute({
        name: 'registry-error-server',
      });

      expect(result.content[0].text).toContain('Registry database error');
    });

    it('should mark server as error on processing failure', async () => {
      const mockTemplate = {
        template: {
          name: 'failing-template',
          language: 'typescript',
          optimization: { turboRepo: false, hotReload: false, sharedDependencies: false, buildCaching: false },
          variables: {},
        },
        templatePath: '/mock/templates/failing-template',
        reasons: ['Default'],
        score: 50,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([mockTemplate]);
      mockTemplateEngine.validateVariables.mockResolvedValue({ isValid: true, errors: [] });
      mockTemplateEngine.process.mockResolvedValue({
        success: false,
        errors: ['Template processing failed', 'Invalid syntax in template'],
      });
      mockRegistryOperations.registerServer.mockResolvedValue({ id: 'server-failing-456' });

      const result = await createMCPTool.safeExecute({
        name: 'failing-server',
      });

      expect(mockRegistryOperations.markServerBuilding).toHaveBeenCalledWith('server-failing-456');
      expect(mockRegistryOperations.markServerError).toHaveBeenCalledWith(
        'server-failing-456',
        'Template processing failed, Invalid syntax in template'
      );
      expect(result.content[0].text).toContain('Template processing failed, Invalid syntax in template');
    });

    it('should mark server as error on unexpected processing error', async () => {
      const mockTemplate = {
        template: {
          name: 'exception-template',
          language: 'typescript',
          optimization: { turboRepo: false, hotReload: false, sharedDependencies: false, buildCaching: false },
          variables: {},
        },
        templatePath: '/mock/templates/exception-template',
        reasons: ['Default'],
        score: 50,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([mockTemplate]);
      mockTemplateEngine.validateVariables.mockResolvedValue({ isValid: true, errors: [] });
      mockTemplateEngine.process.mockRejectedValue(new Error('Unexpected processing error'));
      mockRegistryOperations.registerServer.mockResolvedValue({ id: 'server-exception-789' });

      const result = await createMCPTool.safeExecute({
        name: 'exception-server',
      });

      expect(mockRegistryOperations.markServerError).toHaveBeenCalledWith(
        'server-exception-789',
        'Unexpected processing error'
      );
      expect(result.content[0].text).toContain('Unexpected processing error');
    });
  });

  describe('Success Message Generation', () => {
    beforeEach(() => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
    });

    it('should create comprehensive success message', async () => {
      const mockTemplate = {
        template: {
          name: 'comprehensive-template',
          language: 'typescript',
          optimization: { turboRepo: false, hotReload: false, sharedDependencies: false, buildCaching: false },
          variables: {},
        },
        templatePath: '/mock/templates/comprehensive-template',
        reasons: ['Default'],
        score: 50,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([mockTemplate]);
      mockTemplateEngine.validateVariables.mockResolvedValue({ isValid: true, errors: [] });
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: ['package.json', 'src/index.ts', 'README.md'],
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        mcpConfigPath: '/path/to/config.json',
        warnings: ['File already exists', 'Using default port'],
      });
      mockRegistryOperations.registerServer.mockResolvedValue({ id: 'server-comprehensive' });

      const result = await createMCPTool.safeExecute({
        name: 'comprehensive-server',
        outputPath: '/custom/output',
      });

      const responseText = result.content[0].text;
      expect(responseText).toContain('🎉 Successfully created MCP server: comprehensive-server');
      expect(responseText).toContain('Template: comprehensive-template');
      expect(responseText).toContain('Output: /custom/output');
      expect(responseText).toContain('Files generated: 3');
      expect(responseText).toContain('Build command: npm run build');
      expect(responseText).toContain('Dev command: npm run dev');
      expect(responseText).toContain('MCP config: /path/to/config.json');
      expect(responseText).toContain('Navigate to: cd /custom/output');
      expect(responseText).toContain('Build: npm run build');
      expect(responseText).toContain('Start development: npm run dev');
      expect(responseText).toContain('⚠️ Warnings:');
      expect(responseText).toContain('- File already exists');
      expect(responseText).toContain('- Using default port');
    });

    it('should create minimal success message when optional data is missing', async () => {
      const mockTemplate = {
        template: {
          name: 'minimal-template',
          language: 'typescript',
          optimization: { turboRepo: false, hotReload: false, sharedDependencies: false, buildCaching: false },
          variables: {},
        },
        templatePath: '/mock/templates/minimal-template',
        reasons: ['Default'],
        score: 50,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([mockTemplate]);
      mockTemplateEngine.validateVariables.mockResolvedValue({ isValid: true, errors: [] });
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: ['index.js'],
      });
      mockRegistryOperations.registerServer.mockResolvedValue({ id: 'server-minimal' });

      const result = await createMCPTool.safeExecute({
        name: 'minimal-server',
      });

      const responseText = result.content[0].text;
      expect(responseText).toContain('🎉 Successfully created MCP server: minimal-server');
      expect(responseText).toContain('Template: minimal-template');
      expect(responseText).toContain('Files generated: 1');
      expect(responseText).not.toContain('Build command:');
      expect(responseText).not.toContain('Dev command:');
      expect(responseText).not.toContain('MCP config:');
      expect(responseText).not.toContain('⚠️ Warnings:');
    });
  });

  describe('Error Handling', () => {
    it('should handle template selector errors', async () => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
      mockTemplateSelector.getAvailableTemplates.mockRejectedValue(new Error('Template directory not found'));

      const result = await createMCPTool.safeExecute({
        name: 'error-server',
      });

      expect(result.content[0].text).toContain('Template directory not found');
    });

    it('should handle template engine errors', async () => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
      
      const mockTemplate = {
        template: {
          name: 'error-template',
          language: 'typescript',
          optimization: { turboRepo: false, hotReload: false, sharedDependencies: false, buildCaching: false },
          variables: {},
        },
        templatePath: '/mock/templates/error-template',
        reasons: ['Default'],
        score: 50,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([mockTemplate]);
      mockTemplateEngine.validateVariables.mockRejectedValue(new Error('Variable validation engine error'));

      const result = await createMCPTool.safeExecute({
        name: 'engine-error-server',
      });

      expect(result.content[0].text).toContain('Variable validation engine error');
    });

    it('should handle registry operation errors', async () => {
      mockRegistryOperations.isNameAvailable.mockRejectedValue(new Error('Registry connection failed'));

      const result = await createMCPTool.safeExecute({
        name: 'registry-error-server',
      });

      expect(result.content[0].text).toContain('Registry connection failed');
    });

    it('should handle file system errors', async () => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);
      // Make fs.access succeed (directory exists) - this should cause failure
      mockFs.access.mockResolvedValue(undefined);

      const result = await createMCPTool.safeExecute({
        name: 'fs-error-server',
      });

      expect(result.content[0].text).toContain('Output directory already exists');
    });

    it('should handle non-Error exceptions', async () => {
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);
      // Template processing should fail
      mockTemplateEngine.process.mockRejectedValue('String error');

      const result = await createMCPTool.safeExecute({
        name: 'string-error-server',
      });

      expect(result.content[0].text).toContain('String error');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full workflow successfully', async () => {
      // Setup all mocks for successful execution
      mockRegistryOperations.isNameAvailable.mockResolvedValue(true);
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));

      const mockTemplate = {
        template: {
          name: 'typescript-advanced',
          language: 'typescript',
          tags: ['typescript', 'advanced'],
          optimization: {
            turboRepo: true,
            hotReload: true,
            sharedDependencies: true,
            buildCaching: true,
          },
          variables: {
            serverName: { type: 'string', required: true },
            port: { type: 'number', required: false, default: 3000 },
          },
        },
        templatePath: '/mock/templates/typescript-advanced',
        reasons: ['Language preference: typescript'],
        score: 95,
      };

      mockTemplateSelector.getRecommendedTemplate.mockResolvedValue(mockTemplate);
      mockTemplateEngine.validateVariables.mockResolvedValue({ isValid: true, errors: [] });
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: ['package.json', 'src/index.ts', 'src/tools.ts', 'README.md'],
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        mcpConfigPath: '/generated/integration-server/mcp-config.json',
        warnings: ['Using default port 3000'],
      });
      mockRegistryOperations.registerServer.mockResolvedValue({ id: 'server-integration-test' });

      const result = await createMCPTool.safeExecute({
        name: 'integration-server',
        language: 'typescript',
        description: 'Integration test server',
        variables: {
          customVar: 'custom-value',
        },
        generateMcpConfig: true,
        configName: 'integration-config',
      });

      // Verify all steps were executed
      expect(mockRegistryOperations.isNameAvailable).toHaveBeenCalledWith('integration-server');
      expect(mockTemplateSelector.getRecommendedTemplate).toHaveBeenCalledWith(TemplateLanguage.TYPESCRIPT);
      expect(mockTemplateEngine.validateVariables).toHaveBeenCalled();
      expect(mockTemplateEngine.process).toHaveBeenCalled();
      expect(mockRegistryOperations.registerServer).toHaveBeenCalled();
      expect(mockRegistryOperations.markServerBuilding).toHaveBeenCalledWith('server-integration-test');
      expect(mockRegistryOperations.markServerReady).toHaveBeenCalledWith(
        'server-integration-test',
        'npm run build',
        'npm run dev'
      );

      // Verify success response
      const responseText = result.content[0].text;
      expect(responseText).toContain('🎉 Successfully created MCP server: integration-server');
      expect(responseText).toContain('Template: typescript-advanced');
      expect(responseText).toContain('Files generated: 4');
      expect(responseText).toContain('⚠️ Warnings:');
      expect(responseText).toContain('- Using default port 3000');
    });
  });
});