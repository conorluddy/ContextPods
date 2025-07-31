/**
 * Unit tests for Templates Command
 * Tests the functionality of listing available templates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateSelector } from '@context-pods/core';
import { templatesCommand } from '../../../src/commands/templates.js';
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
    path: vi.fn((path: string) => path),
    template: vi.fn((name: string) => name),
    command: vi.fn((cmd: string) => cmd),
    startSpinner: vi.fn(),
    stopSpinner: vi.fn(),
    succeedSpinner: vi.fn(),
    failSpinner: vi.fn(),
  },
}));

// Mock TemplateSelector
vi.mock('@context-pods/core', () => ({
  TemplateSelector: vi.fn(),
}));

// Mock console.log for JSON output
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('Templates Command', () => {
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
      templatePaths: ['/mock/templates', '/user/templates'],
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
    mockConsoleLog.mockClear();
  });

  describe('Basic Functionality', () => {
    it('should list available templates in table format', async () => {
      // Setup: Mock templates available
      const mockTemplates = [
        {
          template: {
            name: 'typescript-basic',
            language: 'typescript',
            description: 'Basic TypeScript MCP server',
            version: '1.0.0',
          },
          templatePath: '/mock/templates/typescript-basic',
        },
        {
          template: {
            name: 'python-basic',
            language: 'python',
            description: 'Basic Python MCP server',
            version: '1.2.0',
          },
          templatePath: '/mock/templates/python-basic',
        },
      ];
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue(mockTemplates);

      const options = {};

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should display templates table
      expect(output.startSpinner).toHaveBeenCalledWith('Loading templates...');
      expect(output.stopSpinner).toHaveBeenCalled();
      expect(output.info).toHaveBeenCalledWith('Found 2 template(s):');
      expect(output.divider).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should output JSON format when requested', async () => {
      // Setup: Mock templates available
      const mockTemplates = [
        {
          template: {
            name: 'javascript-basic',
            language: 'javascript',
            description: 'Basic JavaScript MCP server',
          },
          templatePath: '/mock/templates/javascript-basic',
        },
      ];
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue(mockTemplates);

      const options = { format: 'json' as const };

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should output JSON to console
      expect(mockConsoleLog).toHaveBeenCalledWith(
        JSON.stringify(
          [
            {
              name: 'javascript-basic',
              path: '/mock/templates/javascript-basic',
              language: 'javascript',
              description: 'Basic JavaScript MCP server',
              version: undefined,
              optimized: false,
            },
          ],
          null,
          2,
        ),
      );
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should handle no templates found', async () => {
      // Setup: Mock no templates available
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      const options = {};

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should handle empty template list
      expect(output.warn).toHaveBeenCalledWith('No templates found');
      expect(output.info).toHaveBeenCalledWith('Template directories searched:');
      expect(output.list).toHaveBeenCalledWith([undefined]);
      expect(output.list).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.message).toBe('No templates found');
      expect(result.data).toEqual([]);
    });
  });

  describe('Template Categorization', () => {
    it('should categorize optimized vs standard templates', async () => {
      // Setup: Mock mix of optimized and standard templates
      const mockTemplates = [
        {
          template: {
            name: 'typescript-advanced',
            language: 'typescript',
            description: 'Advanced TypeScript with TurboRepo',
            optimization: { turboRepo: true },
          },
          templatePath: '/mock/templates/typescript-advanced',
        },
        {
          template: {
            name: 'python-basic',
            language: 'python',
            description: 'Basic Python MCP server',
          },
          templatePath: '/mock/templates/python-basic',
        },
      ];
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue(mockTemplates);

      const options = {};

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should categorize templates
      expect(output.info).toHaveBeenCalledWith('🚀 TurboRepo Optimized Templates:');
      expect(output.info).toHaveBeenCalledWith('📦 Standard Templates:');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      // Check sorting: optimized first
      expect(result.data![0]).toMatchObject({
        name: 'typescript-advanced',
        optimized: true,
      });
      expect(result.data![1]).toMatchObject({
        name: 'python-basic',
        optimized: false,
      });
    });

    it('should sort templates with optimized first, then alphabetically', async () => {
      // Setup: Mock templates that need sorting
      const mockTemplates = [
        {
          template: {
            name: 'z-standard',
            language: 'javascript',
            description: 'Standard template Z',
          },
          templatePath: '/mock/templates/z-standard',
        },
        {
          template: {
            name: 'a-standard',
            language: 'python',
            description: 'Standard template A',
          },
          templatePath: '/mock/templates/a-standard',
        },
        {
          template: {
            name: 'z-optimized',
            language: 'typescript',
            description: 'Optimized template Z',
            optimization: { turboRepo: true },
          },
          templatePath: '/mock/templates/z-optimized',
        },
        {
          template: {
            name: 'a-optimized',
            language: 'rust',
            description: 'Optimized template A',
            optimization: { turboRepo: true },
          },
          templatePath: '/mock/templates/a-optimized',
        },
      ];
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue(mockTemplates);

      const options = {};

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should sort optimized first, then alphabetically
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);

      const names = result.data!.map((t: any) => t.name);
      expect(names).toEqual(['a-optimized', 'z-optimized', 'a-standard', 'z-standard']);
    });
  });

  describe('Template Information Display', () => {
    it('should display complete template information', async () => {
      // Setup: Mock template with full information
      const mockTemplates = [
        {
          template: {
            name: 'full-featured',
            language: 'typescript',
            description: 'Full-featured template with all metadata',
            version: '2.1.0',
            optimization: { turboRepo: true },
          },
          templatePath: '/mock/templates/full-featured',
        },
      ];
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue(mockTemplates);

      const options = {};

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should display complete information
      expect(output.info).toHaveBeenCalledWith('1. undefined ⚡'); // template function returns undefined in mock
      expect(output.table).toHaveBeenCalledWith([
        { label: '  Language', value: 'typescript', color: 'blue' },
        { label: '  Description', value: 'Full-featured template with all metadata' },
        { label: '  Version', value: '2.1.0', color: 'gray' },
      ]);
      expect(result.success).toBe(true);
    });

    it('should handle templates with missing optional fields', async () => {
      // Setup: Mock template with minimal information
      const mockTemplates = [
        {
          template: {
            name: 'minimal',
            language: 'shell',
          },
          templatePath: '/mock/templates/minimal',
        },
      ];
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue(mockTemplates);

      const options = {};

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should handle missing fields gracefully
      expect(output.table).toHaveBeenCalledWith([
        { label: '  Language', value: 'shell', color: 'green' },
        { label: '  Description', value: 'No description' },
      ]);
      expect(result.success).toBe(true);
    });

    it('should show language-specific colors', async () => {
      // Setup: Mock templates with different languages
      const mockTemplates = [
        {
          template: { name: 'ts-template', language: 'typescript' },
          templatePath: '/mock/templates/ts-template',
        },
        {
          template: { name: 'py-template', language: 'python' },
          templatePath: '/mock/templates/py-template',
        },
        {
          template: { name: 'rs-template', language: 'rust' },
          templatePath: '/mock/templates/rs-template',
        },
        {
          template: { name: 'sh-template', language: 'shell' },
          templatePath: '/mock/templates/sh-template',
        },
        {
          template: { name: 'unknown-template', language: 'unknown' },
          templatePath: '/mock/templates/unknown-template',
        },
      ];
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue(mockTemplates);

      const options = {};

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should use correct colors for each language
      expect(output.table).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label: '  Language', value: 'typescript', color: 'blue' }),
        ]),
      );
      expect(output.table).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label: '  Language', value: 'python', color: 'yellow' }),
        ]),
      );
      expect(output.table).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label: '  Language', value: 'rust', color: 'red' }),
        ]),
      );
      expect(output.table).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label: '  Language', value: 'shell', color: 'green' }),
        ]),
      );
      expect(output.table).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label: '  Language', value: 'unknown', color: 'gray' }),
        ]),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('Multiple Template Paths', () => {
    it('should load templates from multiple paths', async () => {
      // Setup: Mock different templates from different paths
      let callCount = 0;
      mockTemplateSelector.getAvailableTemplates.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First path
          return Promise.resolve([
            {
              template: { name: 'template-from-path-1', language: 'typescript' },
              templatePath: '/mock/templates/template-from-path-1',
            },
          ]);
        } else {
          // Second path
          return Promise.resolve([
            {
              template: { name: 'template-from-path-2', language: 'python' },
              templatePath: '/user/templates/template-from-path-2',
            },
          ]);
        }
      });

      const options = {};

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should load from both paths
      expect(TemplateSelector).toHaveBeenCalledTimes(2);
      expect(TemplateSelector).toHaveBeenCalledWith('/mock/templates');
      expect(TemplateSelector).toHaveBeenCalledWith('/user/templates');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should avoid duplicate templates by name', async () => {
      // Setup: Mock duplicate template names from different paths
      let callCount = 0;
      mockTemplateSelector.getAvailableTemplates.mockImplementation(() => {
        callCount++;
        return Promise.resolve([
          {
            template: {
              name: 'duplicate-template',
              language: callCount === 1 ? 'typescript' : 'javascript',
              description: `Template from path ${callCount}`,
            },
            templatePath:
              callCount === 1
                ? '/mock/templates/duplicate-template'
                : '/user/templates/duplicate-template',
          },
        ]);
      });

      const options = {};

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should prefer first occurrence (avoid duplicates)
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toMatchObject({
        name: 'duplicate-template',
        language: 'typescript', // Should be from first path
        path: '/mock/templates/duplicate-template',
      });
    });

    it('should handle template loading errors gracefully', async () => {
      // Setup: Mock one path succeeding, one failing
      let callCount = 0;
      mockTemplateSelector.getAvailableTemplates.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([
            {
              template: { name: 'working-template', language: 'typescript' },
              templatePath: '/mock/templates/working-template',
            },
          ]);
        } else {
          return Promise.reject(new Error('Template path not accessible'));
        }
      });

      const options = {};

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should continue with working paths
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toMatchObject({ name: 'working-template' });
    });
  });

  describe('Verbose Mode', () => {
    it('should show additional information in verbose mode', async () => {
      // Setup: Verbose context and mock templates
      const verboseContext = { ...mockContext, verbose: true };
      const mockTemplates = [
        {
          template: {
            name: 'example-template',
            language: 'typescript',
            description: 'Example template',
            version: '1.0.0',
          },
          templatePath: '/mock/templates/example-template',
        },
      ];
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue(mockTemplates);

      const options = {};

      // Action: Execute templates command in verbose mode
      const result = await templatesCommand(options, verboseContext);

      // Assert: Should show template paths and debug info
      expect(output.table).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            label: '  Path',
            value: '/mock/templates/example-template',
            color: 'yellow',
          }),
        ]),
      );
      expect(output.info).toHaveBeenCalledWith('Template search paths:');
      expect(output.list).toHaveBeenCalledWith([undefined]);
      expect(output.list).toHaveBeenCalledTimes(3); // Usage examples + template paths
      expect(result.success).toBe(true);
    });

    it('should show debug messages for failed paths in verbose mode', async () => {
      // Setup: Verbose context with failing template path
      const verboseContext = { ...mockContext, verbose: true };
      mockTemplateSelector.getAvailableTemplates.mockRejectedValue(new Error('Access denied'));

      const options = {};

      // Action: Execute templates command in verbose mode
      const result = await templatesCommand(options, verboseContext);

      // Assert: Should show debug messages for failures
      expect(output.debug).toHaveBeenCalledWith(
        'Failed to load templates from /mock/templates: Access denied',
      );
      expect(output.debug).toHaveBeenCalledWith(
        'Failed to load templates from /user/templates: Access denied',
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('Usage Examples', () => {
    it('should show usage examples with template names', async () => {
      // Setup: Mock templates
      const mockTemplates = [
        {
          template: { name: 'example-template', language: 'typescript' },
          templatePath: '/mock/templates/example-template',
        },
      ];
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue(mockTemplates);

      const options = {};

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should show usage examples (mocked functions return undefined)
      expect(output.info).toHaveBeenCalledWith('Usage examples:');
      expect(output.list).toHaveBeenCalledWith([
        'undefined undefined', // command and template functions return undefined in mock
        'undefined --template undefined',
      ]);
      expect(result.success).toBe(true);
    });

    it('should handle usage examples with no templates', async () => {
      // Setup: No templates available
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      const options = {};

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should show generic template name in examples
      expect(result.success).toBe(true);
      expect(result.message).toBe('No templates found');
    });
  });

  describe('Error Handling', () => {
    it('should handle template selector construction errors', async () => {
      // Setup: Mock TemplateSelector constructor throwing
      const constructorError = new Error('Invalid template path');
      vi.mocked(TemplateSelector).mockImplementation(() => {
        throw constructorError;
      });

      const options = {};

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should handle constructor error gracefully (may continue with other paths)
      expect(result.success).toBe(true); // Command continues despite individual path failures
      expect(result.data).toEqual([]); // No templates loaded due to errors
      expect(output.stopSpinner).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      // Setup: Mock non-Error exception
      mockTemplateSelector.getAvailableTemplates.mockRejectedValue('String error');

      const options = {};

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should handle string error gracefully (continues with other paths)
      expect(result.success).toBe(true); // Command continues despite individual path failures
      expect(result.data).toEqual([]); // No templates loaded due to errors
    });

    it('should ensure spinner is stopped on error', async () => {
      // Setup: Mock error during template loading
      const loadError = new Error('Template load failed');
      mockTemplateSelector.getAvailableTemplates.mockRejectedValue(loadError);

      const options = {};

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should stop spinner even on error
      expect(output.startSpinner).toHaveBeenCalledWith('Loading templates...');
      expect(output.stopSpinner).toHaveBeenCalled();
      expect(result.success).toBe(true); // Command continues despite individual path failures
    });
  });

  describe('Output Formatting', () => {
    it('should format output consistently', async () => {
      // Setup: Mock templates for formatting test
      const mockTemplates = [
        {
          template: {
            name: 'formatting-test',
            language: 'javascript',
            description: 'Test template formatting',
          },
          templatePath: '/mock/templates/formatting-test',
        },
      ];
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue(mockTemplates);

      const options = {};

      // Action: Execute templates command
      const result = await templatesCommand(options, mockContext);

      // Assert: Should use consistent formatting functions
      expect(output.template).toHaveBeenCalledWith('formatting-test');
      expect(output.command).toHaveBeenCalledWith('context-pods generate');
      expect(output.command).toHaveBeenCalledWith('context-pods wrap script.js');
      expect(result.success).toBe(true);
    });
  });
});
