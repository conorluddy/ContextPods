/**
 * Unit tests for Server Generation Pipeline
 * Checkpoint 2.3: Server Generation Pipeline Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CreateMCPTool } from '../../src/tools/create-mcp.js';
import { getRegistryOperations } from '../../src/registry/index.js';
import { MCPServerStatus } from '../../src/registry/models.js';
import type { TemplateProcessingResult } from '@context-pods/core';

// Mock dependencies
vi.mock('@context-pods/core', async () => {
  const actual = await vi.importActual('@context-pods/core');
  return {
    ...actual,
    TemplateSelector: vi.fn(),
    DefaultTemplateEngine: vi.fn(),
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  };
});

vi.mock('../../src/registry/index.js', () => ({
  getRegistryOperations: vi.fn(),
}));

vi.mock('../../src/config/index.js', () => ({
  CONFIG: {
    templatesPath: '/mock/templates',
    generatedPackagesPath: '/mock/generated',
  },
}));

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
  },
}));

describe('Server Generation Pipeline', () => {
  let createMCPTool: CreateMCPTool;
  let mockRegistry: {
    isNameAvailable: ReturnType<typeof vi.fn>;
    registerServer: ReturnType<typeof vi.fn>;
    markServerBuilding: ReturnType<typeof vi.fn>;
    markServerReady: ReturnType<typeof vi.fn>;
    markServerError: ReturnType<typeof vi.fn>;
  };
  let mockTemplateSelector: {
    getAvailableTemplates: ReturnType<typeof vi.fn>;
    getRecommendedTemplate: ReturnType<typeof vi.fn>;
  };
  let mockTemplateEngine: {
    validateVariables: ReturnType<typeof vi.fn>;
    process: ReturnType<typeof vi.fn>;
  };
  let fs: {
    promises: {
      access: ReturnType<typeof vi.fn>;
    };
  };

  // Helper function to parse MCP response
  const parseMCPResponse = (mcpResponse: {
    isError?: boolean;
    content?: Array<{ text?: string }>;
  }): {
    success: boolean;
    error?: string;
    data?: string;
    warnings?: string[];
  } => {
    if (mcpResponse.isError) {
      return {
        success: false,
        error: mcpResponse.content[0]?.text || 'Unknown error',
      };
    }

    const text = mcpResponse.content[0]?.text || '';

    // Check for specific error patterns in the text content
    if (
      text.includes('Invalid arguments:') ||
      text.includes('Error:') ||
      text.includes('Failed:') ||
      text.includes('already exists') ||
      text.includes('not found') ||
      text.includes('validation failed')
    ) {
      return {
        success: false,
        error: text,
        data: text, // Also include as data for fallback checks
      };
    }

    // Success case - contains success indicator
    const isSuccess = text.includes('Successfully created') || text.includes('🎉');

    return {
      success: isSuccess,
      data: text,
      warnings: text.includes('⚠️') ? extractWarnings(text) : undefined,
    };
  };

  const extractWarnings = (text: string): string[] => {
    const warningSection = text.split('⚠️ Warnings:')[1];
    if (!warningSection) return [text]; // fallback

    return warningSection
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('-'))
      .map((line) => line.substring(1).trim());
  };

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Import mocked modules
    const core = await import('@context-pods/core');
    fs = await import('fs');

    // Setup mock registry
    mockRegistry = {
      isNameAvailable: vi.fn().mockResolvedValue(true),
      registerServer: vi.fn().mockResolvedValue({
        id: 'test-server-id',
        name: 'test-server',
        template: 'typescript-advanced',
        path: '/mock/generated/test-server',
        status: MCPServerStatus.CREATED,
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
      markServerBuilding: vi.fn().mockResolvedValue(true),
      markServerReady: vi.fn().mockResolvedValue(true),
      markServerError: vi.fn().mockResolvedValue(true),
    };
    vi.mocked(getRegistryOperations).mockResolvedValue(mockRegistry);

    // Setup mock template selector
    mockTemplateSelector = {
      getAvailableTemplates: vi.fn().mockResolvedValue([
        {
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
              serverDescription: { type: 'string', required: false },
            },
          },
          templatePath: '/mock/templates/typescript-advanced',
          reasons: ['Best match for TypeScript'],
          score: 100,
        },
      ]),
      getRecommendedTemplate: vi.fn().mockResolvedValue({
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
            serverDescription: { type: 'string', required: false },
          },
        },
        templatePath: '/mock/templates/typescript-advanced',
        reasons: ['Recommended for TypeScript'],
        score: 100,
      }),
    };

    // Setup mock template engine
    mockTemplateEngine = {
      validateVariables: vi.fn().mockResolvedValue({ isValid: true, errors: [] }),
      process: vi.fn().mockResolvedValue({
        success: true,
        generatedFiles: [
          '/mock/generated/test-server/package.json',
          '/mock/generated/test-server/src/index.ts',
          '/mock/generated/test-server/tsconfig.json',
        ],
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        warnings: [],
      } as TemplateProcessingResult),
    };

    // Mock the constructor implementations
    vi.mocked(core.TemplateSelector).mockImplementation(() => mockTemplateSelector);
    vi.mocked(core.DefaultTemplateEngine).mockImplementation(() => mockTemplateEngine);

    // Create tool instance
    createMCPTool = new CreateMCPTool();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  /**
   * Test 1: Template Processing
   */
  describe('Template Processing', () => {
    it('should process template with correct variables and paths', async () => {
      // Setup: Basic server creation args
      const args = {
        name: 'pipeline-test-server',
        description: 'Test server for pipeline validation',
        variables: {
          author: 'Test Author',
          license: 'MIT',
        },
      };

      // Mock fs.access to throw (directory doesn't exist)
      fs.promises.access.mockRejectedValue(new Error('ENOENT'));

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: Template processing called with correct parameters
      expect(mockTemplateEngine.process).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'typescript-advanced',
          language: 'typescript',
          variables: expect.any(Object),
        }),
        expect.objectContaining({
          variables: expect.objectContaining({
            serverName: 'pipeline-test-server',
            serverDescription: 'Test server for pipeline validation',
            packageName: 'pipeline-test-server',
            authorName: 'Context-Pods',
            author: 'Test Author',
            license: 'MIT',
          }),
          outputPath: '/mock/generated/pipeline-test-server',
          templatePath: '/mock/templates/typescript-advanced',
          optimization: {
            turboRepo: true,
            hotReload: true,
            sharedDependencies: true,
            buildCaching: true,
          },
        }),
      );

      // Assert: Success result with correct message
      expect(result.success).toBe(true);
      expect(result.data).toContain('Successfully created MCP server: pipeline-test-server');
      expect(result.data).toContain('Template: typescript-advanced');
      expect(result.data).toContain('Files generated: 3');
      expect(result.data).toContain('Build command: npm run build');
      expect(result.data).toContain('Dev command: npm run dev');
    });

    it('should handle template with missing optional variables', async () => {
      // Setup: Minimal args (no description, no extra variables)
      const args = {
        name: 'minimal-server',
      };

      // Mock fs.access to throw (directory doesn't exist)
      fs.promises.access.mockRejectedValue(new Error('ENOENT'));

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: Template processing succeeds with defaults
      expect(mockTemplateEngine.process).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          variables: expect.objectContaining({
            serverName: 'minimal-server',
            serverDescription: 'MCP server: minimal-server', // Default description
            packageName: 'minimal-server',
            authorName: 'Context-Pods',
          }),
        }),
      );

      expect(result.success).toBe(true);
    });

    it('should select template based on language preference', async () => {
      // Setup: Request Python template
      const args = {
        name: 'python-server',
        language: 'python',
      };

      // Mock Python template
      mockTemplateSelector.getRecommendedTemplate.mockResolvedValue({
        template: {
          name: 'python-basic',
          language: 'python',
          tags: ['python', 'basic'],
          optimization: {
            turboRepo: false,
            hotReload: false,
            sharedDependencies: false,
            buildCaching: false,
          },
          variables: {},
        },
        templatePath: '/mock/templates/python-basic',
        reasons: ['Recommended for Python'],
        score: 100,
      });

      // Mock fs.access to throw (directory doesn't exist)
      fs.promises.access.mockRejectedValue(new Error('ENOENT'));

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: Python template was selected
      expect(mockTemplateSelector.getRecommendedTemplate).toHaveBeenCalledWith(
        expect.anything(), // TemplateLanguage.PYTHON
      );
      expect(result.success).toBe(true);
      expect(mockRegistry.registerServer).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'python-basic',
        }),
      );
    });
  });

  /**
   * Test 2: File Generation
   */
  describe('File Generation', () => {
    it('should validate output directory does not exist', async () => {
      // Setup: Mock directory already exists
      fs.promises.access.mockResolvedValue(undefined); // Directory exists

      const args = {
        name: 'existing-directory-server',
      };

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: Fails with appropriate error (check content includes the error)
      expect(result.success).toBe(false);
      expect(result.error || result.data).toContain('Output directory already exists');
      expect(mockTemplateEngine.process).not.toHaveBeenCalled();
    });

    it('should use custom output path when provided', async () => {
      // Setup: Custom output path
      const args = {
        name: 'custom-path-server',
        outputPath: '/custom/output/path',
      };

      // Mock fs.access to throw (directory doesn't exist)
      fs.promises.access.mockRejectedValue(new Error('ENOENT'));

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: Custom path used
      expect(mockTemplateEngine.process).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          outputPath: '/custom/output/path',
        }),
      );
      expect(mockRegistry.registerServer).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/custom/output/path',
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should report generated files in success message', async () => {
      // Setup: Template generates multiple files
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: [
          '/output/package.json',
          '/output/src/index.ts',
          '/output/src/tools/example.ts',
          '/output/tsconfig.json',
          '/output/README.md',
        ],
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
      });

      const args = {
        name: 'multi-file-server',
      };

      // Mock fs.access to throw (directory doesn't exist)
      fs.promises.access.mockRejectedValue(new Error('ENOENT'));

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: File count reported correctly
      expect(result.success).toBe(true);
      expect(result.data).toContain('Files generated: 5');
    });
  });

  /**
   * Test 3: Build Process
   */
  describe('Build Process', () => {
    it('should track build status through registry', async () => {
      // Setup: Basic server creation
      const args = {
        name: 'build-tracking-server',
      };

      // Mock fs.access to throw (directory doesn't exist)
      fs.promises.access.mockRejectedValue(new Error('ENOENT'));

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: Build status tracked correctly
      expect(mockRegistry.registerServer).toHaveBeenCalledOnce();
      expect(mockRegistry.markServerBuilding).toHaveBeenCalledWith('test-server-id');
      expect(mockRegistry.markServerReady).toHaveBeenCalledWith(
        'test-server-id',
        'npm run build',
        'npm run dev',
      );
      expect(mockRegistry.markServerError).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should mark server as error if template processing fails', async () => {
      // Setup: Template processing fails
      mockTemplateEngine.process.mockResolvedValue({
        success: false,
        errors: ['Failed to read template file', 'Invalid template structure'],
      });

      const args = {
        name: 'failing-template-server',
      };

      // Mock fs.access to throw (directory doesn't exist)
      fs.promises.access.mockRejectedValue(new Error('ENOENT'));

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: Server marked as error
      expect(mockRegistry.markServerBuilding).toHaveBeenCalled();
      expect(mockRegistry.markServerError).toHaveBeenCalledWith(
        'test-server-id',
        'Failed to read template file, Invalid template structure',
      );
      expect(mockRegistry.markServerReady).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.data || result.error).toContain('Failed to read template file');
    });

    it('should capture build and dev commands from template', async () => {
      // Setup: Template with custom commands
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: ['/output/package.json'],
        buildCommand: 'pnpm build:prod',
        devCommand: 'pnpm dev --watch',
      });

      const args = {
        name: 'custom-commands-server',
      };

      // Mock fs.access to throw (directory doesn't exist)
      fs.promises.access.mockRejectedValue(new Error('ENOENT'));

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: Custom commands captured
      expect(mockRegistry.markServerReady).toHaveBeenCalledWith(
        'test-server-id',
        'pnpm build:prod',
        'pnpm dev --watch',
      );
      expect(result.data).toContain('Build command: pnpm build:prod');
      expect(result.data).toContain('Dev command: pnpm dev --watch');
    });
  });

  /**
   * Test 4: Error Handling
   */
  describe('Error Handling', () => {
    it('should validate server name format', async () => {
      // Test invalid name format
      const args = { name: '123-start-with-number' };

      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/name must start with a letter|characters long|invalid/i);
    });

    it('should check name availability in registry', async () => {
      // Setup: Name already taken
      mockRegistry.isNameAvailable.mockResolvedValue(false);

      const args = {
        name: 'already-taken-server',
      };

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: Name availability checked and error returned
      expect(mockRegistry.isNameAvailable).toHaveBeenCalledWith('already-taken-server');
      expect(result.success).toBe(false);
      expect(result.error).toContain("Server name 'already-taken-server' is already taken");
    });

    it('should handle template not found error', async () => {
      // Setup: Request non-existent template
      const args = {
        name: 'template-not-found-server',
        template: 'non-existent-template',
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: Template not found error
      expect(result.success).toBe(false);
      expect(result.error).toContain("Template 'non-existent-template' not found");
    });

    it('should handle variable validation failure', async () => {
      // Setup: Template variable validation fails
      mockTemplateEngine.validateVariables.mockResolvedValue({
        isValid: false,
        errors: [
          {
            field: 'serverName',
            message: "Variable 'serverName' should be of type 'string', got 'number'",
            currentValue: 123,
            expectedType: 'string',
          },
          {
            field: 'invalidVariable',
            message: "Variable 'invalidVariable' does not match required pattern: ^[a-z0-9-]+$",
            currentValue: 'some-value',
            expectedType: 'string',
            pattern: '^[a-z0-9-]+$',
          },
        ],
      });

      const args = {
        name: 'invalid-variables-server',
        variables: {
          invalidVariable: 'some-value',
        },
      };

      // Mock fs.access to throw (directory doesn't exist)
      fs.promises.access.mockRejectedValue(new Error('ENOENT'));

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: Variable validation error
      expect(mockTemplateEngine.validateVariables).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Template variable validation failed');
    });
  });

  /**
   * Test 5: Cleanup
   */
  describe('Cleanup and Recovery', () => {
    it('should mark server as error if exception occurs during processing', async () => {
      // Setup: Template processing throws exception
      mockTemplateEngine.process.mockRejectedValue(new Error('Disk full'));

      const args = {
        name: 'exception-during-processing',
      };

      // Mock fs.access to throw (directory doesn't exist)
      fs.promises.access.mockRejectedValue(new Error('ENOENT'));

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: Server marked as error with exception message
      expect(mockRegistry.markServerError).toHaveBeenCalledWith('test-server-id', 'Disk full');
      expect(result.success).toBe(false);
      expect(result.data || result.error).toContain('Disk full');
    });

    it('should include warnings in successful response', async () => {
      // Setup: Template processing with warnings
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: ['/output/package.json'],
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        warnings: [
          'Template uses deprecated feature X',
          'Consider upgrading to template version 2.0',
        ],
      });

      const args = {
        name: 'server-with-warnings',
      };

      // Mock fs.access to throw (directory doesn't exist)
      fs.promises.access.mockRejectedValue(new Error('ENOENT'));

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: Success with warnings
      expect(result.success).toBe(true);
      expect(result.warnings).toEqual([
        'Template uses deprecated feature X',
        'Consider upgrading to template version 2.0',
      ]);
    });

    it('should handle registry operation failures gracefully', async () => {
      // Setup: Registry operations fail
      mockRegistry.registerServer.mockRejectedValue(new Error('Database connection failed'));

      const args = {
        name: 'registry-failure-server',
      };

      // Mock fs.access to throw (directory doesn't exist)
      fs.promises.access.mockRejectedValue(new Error('ENOENT'));

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: Error handled gracefully
      expect(result.success).toBe(false);
      expect(result.data || result.error).toContain('Database connection failed');
      expect(mockTemplateEngine.process).not.toHaveBeenCalled(); // Processing never started
    });

    it('should validate string argument constraints', async () => {
      // Setup: Description too long
      const args = {
        name: 'long-description-server',
        description: 'A'.repeat(501), // Exceeds 500 char limit
      };

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: Length validation error
      expect(result.success).toBe(false);
      expect(result.error).toContain('description');
      expect(result.error).toContain('500 characters');
    });

    it('should use default template when none specified', async () => {
      // Setup: No template or language specified
      const args = {
        name: 'default-template-server',
      };

      // Mock fs.access to throw (directory doesn't exist)
      fs.promises.access.mockRejectedValue(new Error('ENOENT'));

      // Action: Execute create-mcp tool
      const mcpResponse = await createMCPTool.safeExecute(args);
      const result = parseMCPResponse(mcpResponse);

      // Assert: Default template selected (typescript-advanced)
      expect(mockTemplateSelector.getAvailableTemplates).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(mockRegistry.registerServer).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'typescript-advanced',
        }),
      );
    });
  });
});
