/**
 * Unit tests for WrapScriptTool
 * Tests the functionality of wrapping existing scripts as MCP servers
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { promises as fs } from 'fs';
import { WrapScriptTool } from '../../../src/tools/wrap-script.js';
import { TemplateSelector, DefaultTemplateEngine, TemplateLanguage } from '@context-pods/core';
import { getRegistryOperations } from '../../../src/registry/index.js';

// Mock all dependencies
vi.mock('fs', () => ({
  promises: {
    stat: vi.fn(),
    readFile: vi.fn(),
    access: vi.fn(),
    mkdir: vi.fn(),
    copyFile: vi.fn(),
    chmod: vi.fn(),
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


describe('WrapScriptTool', () => {
  let wrapScriptTool: WrapScriptTool;
  let mockFs: {
    stat: Mock;
    readFile: Mock;
    access: Mock;
    mkdir: Mock;
    copyFile: Mock;
    chmod: Mock;
  };
  let mockTemplateSelector: {
    getAvailableTemplates: Mock;
    getRecommendedTemplate: Mock;
  };
  let mockTemplateEngine: {
    validateVariables: Mock;
    process: Mock;
    detectLanguage: Mock;
  };
  let mockRegistry: {
    isNameAvailable: Mock;
    registerServer: Mock;
    markServerBuilding: Mock;
    markServerReady: Mock;
    markServerError: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock fs
    mockFs = {
      stat: vi.mocked(fs.stat),
      readFile: vi.mocked(fs.readFile),
      access: vi.mocked(fs.access),
      mkdir: vi.mocked(fs.mkdir),
      copyFile: vi.mocked(fs.copyFile),
      chmod: vi.mocked(fs.chmod),
    };

    // Create mock template selector
    mockTemplateSelector = {
      getAvailableTemplates: vi.fn(),
      getRecommendedTemplate: vi.fn(),
    };

    // Create mock template engine
    mockTemplateEngine = {
      validateVariables: vi.fn(),
      process: vi.fn(),
      detectLanguage: vi.fn(),
    };

    // Create mock registry
    mockRegistry = {
      isNameAvailable: vi.fn(),
      registerServer: vi.fn(),
      markServerBuilding: vi.fn(),
      markServerReady: vi.fn(),
      markServerError: vi.fn(),
    };

    // Mock constructors
    vi.mocked(TemplateSelector).mockImplementation(() => mockTemplateSelector as any);
    vi.mocked(DefaultTemplateEngine).mockImplementation(() => mockTemplateEngine as any);
    vi.mocked(getRegistryOperations).mockResolvedValue(mockRegistry as any);

    // Set up default mock returns
    const defaultTemplate = {
      template: {
        name: 'python-wrapper',
        language: 'python',
        tags: ['python', 'wrapper'],
        optimization: {
          turboRepo: false,
          hotReload: true,
          sharedDependencies: false,
          buildCaching: false,
        },
        variables: {
          serverName: { type: 'string', required: true },
          scriptPath: { type: 'string', required: true },
        },
      },
      templatePath: '/mock/templates/python-wrapper',
      reasons: ['Python script detected'],
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
      generatedFiles: ['index.py', 'requirements.txt'],
      buildCommand: 'pip install -r requirements.txt',
      devCommand: 'python index.py',
    });

    mockTemplateEngine.detectLanguage.mockResolvedValue(TemplateLanguage.PYTHON);

    mockRegistry.isNameAvailable.mockResolvedValue(true);
    mockRegistry.registerServer.mockResolvedValue({
      id: 'wrapped-server-id',
      name: 'wrapped-script',
      status: 'building' as const,
      template: 'python-wrapper',
      path: '/mock/generated/wrapped-script',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    mockRegistry.markServerBuilding.mockResolvedValue(undefined);
    mockRegistry.markServerReady.mockResolvedValue(undefined);
    mockRegistry.markServerError.mockResolvedValue(undefined);

    // Set up default filesystem mocks
    mockFs.stat.mockResolvedValue({ isFile: () => true } as any);
    mockFs.readFile.mockResolvedValue('print("Hello from Python script!")');
    mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.copyFile.mockResolvedValue(undefined);
    mockFs.chmod.mockResolvedValue(undefined);

    // Create tool instance
    wrapScriptTool = new WrapScriptTool();
  });

  describe('Argument Validation', () => {
    it('should validate required scriptPath argument', async () => {
      const result = await wrapScriptTool.safeExecute({ name: 'test-wrapper' });
      expect(result.content[0].text).toContain('Missing required argument: scriptPath');
    });

    it('should validate required name argument', async () => {
      const result = await wrapScriptTool.safeExecute({ scriptPath: '/path/to/script.py' });
      expect(result.content[0].text).toContain('Missing required argument: name');
    });

    it('should validate scriptPath is not empty', async () => {
      const result = await wrapScriptTool.safeExecute({
        scriptPath: '',
        name: 'test-wrapper',
      });
      expect(result.content[0].text).toContain('must be at least 1 characters long');
    });

    it('should validate name format', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true } as any);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: '123invalid',
      });
      expect(result.content[0].text).toContain('Server name must start with a letter');
    });

    it('should validate name length constraints', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true } as any);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'a'.repeat(51),
      });
      expect(result.content[0].text).toContain('must be at most 50 characters long');
    });

    it('should check if script file exists', async () => {
      mockFs.stat.mockRejectedValue(new Error('File not found'));

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/nonexistent/script.py',
        name: 'test-wrapper',
      });
      expect(result.content[0].text).toContain('Script file not found: /nonexistent/script.py');
    });

    it('should check if script path points to a file', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => false } as any);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/directory',
        name: 'test-wrapper',
      });
      expect(result.content[0].text).toContain('Script path must point to a file');
    });

    it('should check name availability', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true } as any);
      mockRegistry.isNameAvailable.mockResolvedValue(false);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'taken-name',
      });
      expect(result.content[0].text).toContain("Server name 'taken-name' is already taken");
    });

    it('should validate optional string arguments', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true } as any);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'test-wrapper',
        template: 123,
      });
      expect(result.content[0].text).toContain("Argument 'template' must be a string");
    });

    it('should validate description length', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true } as any);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'test-wrapper',
        description: 'a'.repeat(501),
      });
      expect(result.content[0].text).toContain('must be at most 500 characters long');
    });

    it('should validate variables as object', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true } as any);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'test-wrapper',
        variables: 'not-an-object',
      });
      expect(result.content[0].text).toContain("Argument 'variables' must be an object");
    });
  });

  describe('Script Analysis', () => {
    it('should analyze Python script correctly', async () => {
      const pythonScript = `#!/usr/bin/env python3
import os
import asyncio

class DataProcessor:
    async def process_data(self):
        return "processed"

def main():
    processor = DataProcessor()
    asyncio.run(processor.process_data())

if __name__ == "__main__":
    main()
`;
      mockFs.readFile.mockResolvedValue(pythonScript);
      mockTemplateEngine.detectLanguage.mockResolvedValue(TemplateLanguage.PYTHON);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/processor.py',
        name: 'data-processor',
      });

      expect(result.content[0].text).toContain('Successfully wrapped script');
      expect(result.content[0].text).toContain('Detected language: python');
      expect(result.content[0].text).toContain('Has imports: Yes');
      expect(result.content[0].text).toContain('Has functions: Yes');
      expect(result.content[0].text).toContain('Has async code: Yes');
    });

    it('should analyze TypeScript script correctly', async () => {
      const typescriptScript = `import express from 'express';

class APIServer {
    private app = express();

    async start(): Promise<void> {
        this.app.listen(3000);
    }
}

export default APIServer;
`;
      mockFs.readFile.mockResolvedValue(typescriptScript);
      mockTemplateEngine.detectLanguage.mockResolvedValue(TemplateLanguage.TYPESCRIPT);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/server.ts',
        name: 'api-server',
      });

      expect(result.content[0].text).toContain('Detected language: typescript');
      expect(result.content[0].text).toContain('Has imports: Yes');
      expect(result.content[0].text).toContain('Has functions: No'); // Class methods not detected by current regex
      expect(result.content[0].text).toContain('Has async code: No'); // Async method not detected by current regex
    });

    it('should analyze Shell script correctly', async () => {
      const shellScript = `#!/bin/bash

function deploy_app() {
    echo "Deploying application..."
    docker build -t myapp .
    docker run -d myapp
}

deploy_app
`;
      mockFs.readFile.mockResolvedValue(shellScript);
      mockTemplateEngine.detectLanguage.mockResolvedValue(TemplateLanguage.SHELL);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/deploy.sh',
        name: 'deployment-script',
      });

      expect(result.content[0].text).toContain('Detected language: shell');
    });

    it('should warn about simple scripts without imports', async () => {
      const simpleScript = 'print("Hello World")';
      mockFs.readFile.mockResolvedValue(simpleScript);
      mockTemplateEngine.detectLanguage.mockResolvedValue(TemplateLanguage.PYTHON);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/simple.py',
        name: 'simple-script',
      });

      expect(result.content[0].text).toContain('Has imports: No');
    });

    it('should warn about large script files', async () => {
      const largeScript = 'a'.repeat(15000); // > 10,000 characters
      mockFs.readFile.mockResolvedValue(largeScript);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/large.py',
        name: 'large-script',
      });

      expect(result.content[0].text).toContain(
        'Large script file - consider breaking into modules',
      );
    });

    it('should warn about shell scripts without shebang', async () => {
      const shellScript = 'echo "No shebang here"';
      mockFs.readFile.mockResolvedValue(shellScript);
      mockTemplateEngine.detectLanguage.mockResolvedValue(TemplateLanguage.SHELL);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.sh',
        name: 'shell-script',
      });

      expect(result.content[0].text).toContain('Shell script missing shebang');
    });

    it('should warn when language cannot be detected', async () => {
      mockTemplateEngine.detectLanguage.mockResolvedValue(null);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/unknown.xyz',
        name: 'unknown-script',
      });

      expect(result.content[0].text).toContain('Could not detect script language');
    });
  });

  describe('Template Selection', () => {
    it('should select specific template when requested', async () => {
      const customTemplate = {
        template: {
          name: 'custom-wrapper',
          language: 'python',
          tags: ['custom'],
          optimization: {
            turboRepo: false,
            hotReload: false,
            sharedDependencies: false,
            buildCaching: false,
          },
          variables: {},
        },
        templatePath: '/mock/templates/custom-wrapper',
        reasons: ['Custom template'],
        score: 10,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([customTemplate]);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'custom-wrapped',
        template: 'custom-wrapper',
      });

      expect(result.content[0].text).toContain('Template: custom-wrapper');
    });

    it('should handle template not found error', async () => {
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'test-wrapper',
        template: 'nonexistent-template',
      });

      expect(result.content[0].text).toContain("Template 'nonexistent-template' not found");
    });

    it('should auto-select template based on detected language', async () => {
      mockTemplateEngine.detectLanguage.mockResolvedValue(TemplateLanguage.PYTHON);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'python-wrapped',
      });

      expect(mockTemplateSelector.getRecommendedTemplate).toHaveBeenCalledWith(
        TemplateLanguage.PYTHON,
      );
      expect(result.content[0].text).toContain('Successfully wrapped script');
    });

    it('should fallback to TypeScript template for unknown languages', async () => {
      mockTemplateEngine.detectLanguage.mockResolvedValue(null);

      const typescriptTemplate = {
        template: {
          name: 'typescript-basic',
          language: 'typescript',
          tags: ['typescript', 'basic'],
          optimization: {
            turboRepo: false,
            hotReload: false,
            sharedDependencies: false,
            buildCaching: false,
          },
          variables: {},
        },
        templatePath: '/mock/templates/typescript-basic',
        reasons: ['Fallback template'],
        score: 5,
      };

      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([typescriptTemplate]);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/unknown.xyz',
        name: 'unknown-wrapped',
      });

      expect(result.content[0].text).toContain('Template: typescript-basic');
    });

    it('should handle no templates available', async () => {
      mockTemplateSelector.getAvailableTemplates.mockResolvedValue([]);
      mockTemplateSelector.getRecommendedTemplate.mockResolvedValue(null);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'test-wrapper',
      });

      expect(result.content[0].text).toContain('No suitable template found for script wrapping');
    });
  });

  describe('Output Path Handling', () => {
    it('should use custom output path when provided', async () => {
      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'test-wrapper',
        outputPath: '/custom/output/path',
      });

      expect(result.content[0].text).toContain('Output: /custom/output/path');
    });

    it('should use default output path when not provided', async () => {
      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'test-wrapper',
      });

      expect(result.content[0].text).toContain('Output: /mock/generated/test-wrapper');
    });

    it('should fail if output directory already exists', async () => {
      mockFs.access.mockResolvedValue(undefined); // Directory exists

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'test-wrapper',
      });

      expect(result.content[0].text).toContain('Output directory already exists');
    });
  });

  describe('Script Copying', () => {
    it('should copy Python script with correct naming', async () => {
      await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/my-script.py',
        name: 'python-wrapper',
      });

      expect(mockFs.mkdir).toHaveBeenCalledWith('/mock/generated/python-wrapper/scripts', {
        recursive: true,
      });
      expect(mockFs.copyFile).toHaveBeenCalledWith(
        '/path/to/my-script.py',
        '/mock/generated/python-wrapper/scripts/script.py',
      );
    });

    it('should copy TypeScript script with correct naming', async () => {
      mockTemplateEngine.detectLanguage.mockResolvedValue(TemplateLanguage.TYPESCRIPT);

      await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/my-script.ts',
        name: 'ts-wrapper',
      });

      expect(mockFs.copyFile).toHaveBeenCalledWith(
        '/path/to/my-script.ts',
        '/mock/generated/ts-wrapper/scripts/script.ts',
      );
    });

    it('should copy shell script and make it executable', async () => {
      mockTemplateEngine.detectLanguage.mockResolvedValue(TemplateLanguage.SHELL);

      await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/deploy.sh',
        name: 'shell-wrapper',
      });

      expect(mockFs.copyFile).toHaveBeenCalledWith(
        '/path/to/deploy.sh',
        '/mock/generated/shell-wrapper/scripts/script.sh',
      );
      expect(mockFs.chmod).toHaveBeenCalledWith(
        '/mock/generated/shell-wrapper/scripts/script.sh',
        0o755,
      );
    });

    it('should preserve original filename for unknown languages', async () => {
      mockTemplateEngine.detectLanguage.mockResolvedValue(null);

      await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/custom.xyz',
        name: 'unknown-wrapper',
      });

      expect(mockFs.copyFile).toHaveBeenCalledWith(
        '/path/to/custom.xyz',
        '/mock/generated/unknown-wrapper/scripts/custom.xyz',
      );
    });
  });

  describe('Template Variables', () => {
    it('should prepare template variables correctly', async () => {
      mockTemplateEngine.process.mockImplementationOnce((template, options) => {
        // Verify the variables are prepared correctly
        const vars = options.variables;
        expect(vars.serverName).toBe('test-wrapper');
        expect(vars.scriptName).toBe('test-script.py');
        expect(vars.scriptLanguage).toBe('python');
        expect(vars.scriptPath).toBe('./scripts/test-script.py');
        expect(vars.hasImports).toBe(false);
        expect(vars.hasFunctions).toBe(false);
        expect(vars.packageName).toBe('test-wrapper');
        expect(vars.authorName).toBe('Context-Pods');

        return Promise.resolve({
          success: true,
          generatedFiles: ['index.py'],
          buildCommand: 'pip install',
          devCommand: 'python index.py',
        });
      });

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/test-script.py',
        name: 'test-wrapper',
        description: 'Custom description',
        variables: { customVar: 'customValue' },
      });

      expect(result.content[0].text).toContain('Successfully wrapped script');
    });

    it('should handle template variable validation errors', async () => {
      mockTemplateEngine.validateVariables.mockResolvedValue({
        isValid: false,
        errors: [
          { field: 'serverName', message: 'Must be a valid identifier' },
          { field: 'scriptPath', message: 'Must be a valid path' },
        ],
      });

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'test-wrapper',
      });

      expect(result.content[0].text).toContain('Template variable validation failed');
      expect(result.content[0].text).toContain('• serverName: Must be a valid identifier');
      expect(result.content[0].text).toContain('• scriptPath: Must be a valid path');
    });
  });

  describe('Registry Integration', () => {
    it('should register server and update status correctly', async () => {
      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'registry-test',
      });

      expect(mockRegistry.registerServer).toHaveBeenCalledWith({
        name: 'registry-test',
        template: 'python-wrapper',
        path: '/mock/generated/registry-test',
        templateVariables: expect.any(Object),
        description: 'Wrapped script: script.py',
        tags: ['python', 'wrapper', 'script-wrapper'],
      });

      expect(mockRegistry.markServerBuilding).toHaveBeenCalledWith('wrapped-server-id');
      expect(mockRegistry.markServerReady).toHaveBeenCalledWith(
        'wrapped-server-id',
        'pip install -r requirements.txt',
        'python index.py',
      );

      expect(result.content[0].text).toContain('Successfully wrapped script');
    });

    it('should mark server as error on template processing failure', async () => {
      mockTemplateEngine.process.mockResolvedValue({
        success: false,
        errors: ['Template compilation failed', 'Missing required files'],
      });

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'error-test',
      });

      expect(mockRegistry.markServerError).toHaveBeenCalledWith(
        'wrapped-server-id',
        'Template compilation failed, Missing required files',
      );

      expect(result.content[0].text).toContain(
        'Template compilation failed, Missing required files',
      );
    });

    it('should mark server as error on unexpected processing error', async () => {
      mockTemplateEngine.process.mockRejectedValue(new Error('Unexpected template error'));

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'unexpected-error',
      });

      expect(mockRegistry.markServerError).toHaveBeenCalledWith(
        'wrapped-server-id',
        'Unexpected template error',
      );

      expect(result.content[0].text).toContain('Unexpected template error');
    });
  });

  describe('Success Message Generation', () => {
    it('should create comprehensive success message', async () => {
      const complexScript = `#!/usr/bin/env python3
import asyncio
import json

class DataProcessor:
    async def process(self):
        return {"status": "processed"}

def main():
    processor = DataProcessor()
    result = asyncio.run(processor.process())
    print(json.dumps(result))

if __name__ == "__main__":
    main()
`;
      mockFs.readFile.mockResolvedValue(complexScript);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/complex-processor.py',
        name: 'complex-wrapper',
        description: 'Advanced data processing wrapper',
      });

      const output = result.content[0].text;
      expect(output).toContain('🎉 Successfully wrapped script as MCP server: complex-wrapper');
      expect(output).toContain('📋 Details:');
      expect(output).toContain('- Original script: /path/to/complex-processor.py');
      expect(output).toContain('- Detected language: python');
      expect(output).toContain('- Template: python-wrapper');
      expect(output).toContain('- Files generated: 2');
      expect(output).toContain('- Build command: pip install -r requirements.txt');
      expect(output).toContain('- Dev command: python index.py');
      expect(output).toContain('📊 Script Analysis:');
      expect(output).toContain('🚀 Next steps:');
      expect(output).toContain('1. Navigate to: cd /mock/generated/complex-wrapper');
      expect(output).toContain('4. Review the generated MCP server and customize as needed');
    });

    it('should create minimal success message when optional data is missing', async () => {
      mockTemplateEngine.process.mockResolvedValue({
        success: true,
        generatedFiles: [],
      });

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/simple.py',
        name: 'simple-wrapper',
      });

      const output = result.content[0].text;
      expect(output).toContain('Successfully wrapped script');
      expect(output).toContain('Files generated: 0');
      expect(output).not.toContain('Build command:');
      expect(output).not.toContain('Dev command:');
    });
  });

  describe('Error Handling', () => {
    it('should handle filesystem errors during script copying', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'fs-error-test',
      });

      expect(result.content[0].text).toContain('Permission denied');
    });

    it('should handle template selector errors', async () => {
      mockTemplateSelector.getRecommendedTemplate.mockRejectedValue(
        new Error('Template selector failed'),
      );

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'selector-error',
      });

      expect(result.content[0].text).toContain('Template selector failed');
    });

    it('should handle script read errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Cannot read script file'));

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'read-error',
      });

      expect(result.content[0].text).toContain('Cannot read script file');
    });

    it('should handle non-Error exceptions', async () => {
      mockTemplateEngine.detectLanguage.mockRejectedValue('String error');

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'string-error',
      });

      expect(result.content[0].text).toContain('String error');
    });

    it('should handle registry errors gracefully', async () => {
      mockRegistry.isNameAvailable.mockRejectedValue(new Error('Registry connection failed'));

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/script.py',
        name: 'registry-error',
      });

      expect(result.content[0].text).toContain('Registry connection failed');
    });
  });

  describe('Language Detection Integration', () => {
    it('should handle JavaScript files correctly', async () => {
      const jsScript = `const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.json({ message: 'Hello World' });
});

app.listen(3000);
`;
      mockFs.readFile.mockResolvedValue(jsScript);
      mockTemplateEngine.detectLanguage.mockResolvedValue(TemplateLanguage.NODEJS);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/server.js',
        name: 'js-wrapper',
      });

      expect(result.content[0].text).toContain('Detected language: javascript');
      expect(mockFs.copyFile).toHaveBeenCalledWith(
        '/path/to/server.js',
        '/mock/generated/js-wrapper/scripts/script.js',
      );
    });

    it('should handle Rust files correctly', async () => {
      mockTemplateEngine.detectLanguage.mockResolvedValue(TemplateLanguage.RUST);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/main.rs',
        name: 'rust-wrapper',
      });

      expect(result.content[0].text).toContain('Detected language: rust');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full workflow successfully', async () => {
      const pythonScript = `#!/usr/bin/env python3
import requests
import json

def fetch_data(url):
    response = requests.get(url)
    return response.json()

if __name__ == "__main__":
    data = fetch_data("https://api.example.com/data")
    print(json.dumps(data))
`;

      mockFs.readFile.mockResolvedValue(pythonScript);
      mockTemplateEngine.detectLanguage.mockResolvedValue(TemplateLanguage.PYTHON);

      const result = await wrapScriptTool.safeExecute({
        scriptPath: '/path/to/fetch-data.py',
        name: 'data-fetcher',
        description: 'API data fetching script wrapper',
        variables: { apiEndpoint: 'https://api.example.com' },
      });

      // Verify all steps were executed
      expect(mockTemplateEngine.detectLanguage).toHaveBeenCalled();
      expect(mockTemplateSelector.getRecommendedTemplate).toHaveBeenCalledWith(
        TemplateLanguage.PYTHON,
      );
      expect(mockRegistry.registerServer).toHaveBeenCalled();
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.copyFile).toHaveBeenCalled();
      expect(mockTemplateEngine.validateVariables).toHaveBeenCalled();
      expect(mockTemplateEngine.process).toHaveBeenCalled();
      expect(mockRegistry.markServerReady).toHaveBeenCalled();

      // Verify success message
      expect(result.content[0].text).toContain(
        '🎉 Successfully wrapped script as MCP server: data-fetcher',
      );
      expect(result.content[0].text).toContain('Original script: /path/to/fetch-data.py');
      expect(result.content[0].text).toContain('Detected language: python');
      expect(result.content[0].text).toContain('Has imports: Yes');
      expect(result.content[0].text).toContain('Has functions: Yes');
    });
  });
});
