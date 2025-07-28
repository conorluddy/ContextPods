/**
 * Comprehensive tests for template generation
 * Phase 7: Add Comprehensive Testing Framework
 *
 * Tests cover:
 * 1. Template generation with various configurations
 * 2. Error scenarios and edge cases
 * 3. Template variable edge cases
 * 4. Pre-flight validation scenarios
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { Volume } from 'memfs';
import { DefaultTemplateEngine } from '../../src/template-engine.js';
import { templateBuilder } from '../../../../tests/utils/builders.js';
import type { TemplateContext, TemplateMetadata } from '../../src/types.js';
import { TemplateLanguage } from '../../src/types.js';

// Mock fs module
vi.mock('fs');

describe('TemplateEngine - Comprehensive Generation Tests', () => {
  let engine: DefaultTemplateEngine;
  let mockVolume: Volume;

  beforeEach(() => {
    engine = new DefaultTemplateEngine();
    mockVolume = new Volume();

    // Mock fs methods
    vi.mocked(fs).access = vi
      .fn()
      .mockImplementation((path: string) => mockVolume.promises.access(path));
    vi.mocked(fs).mkdir = vi
      .fn()
      .mockImplementation((path: string, options?: any) =>
        mockVolume.promises.mkdir(path, options),
      );
    vi.mocked(fs).writeFile = vi
      .fn()
      .mockImplementation((path: string, data: any, options?: any) =>
        mockVolume.promises.writeFile(path, data, options),
      );
    vi.mocked(fs).readFile = vi
      .fn()
      .mockImplementation((path: string, options?: any) =>
        mockVolume.promises.readFile(path, options),
      );
    vi.mocked(fs).copyFile = vi
      .fn()
      .mockImplementation((src: string, dest: string, flags?: number) =>
        mockVolume.promises.copyFile(src, dest, flags),
      );
    vi.mocked(fs).chmod = vi
      .fn()
      .mockImplementation((path: string, mode: string | number) =>
        mockVolume.promises.chmod(path, mode),
      );

    // Reset the mock file system
    vi.clearAllMocks();
    mockVolume.reset();
  });

  afterEach(() => {
    mockVolume.reset();
    vi.restoreAllMocks();
  });

  /**
   * Test 1: Complete template generation with all variable types
   */
  it('should generate template with all variable types', async () => {
    const metadata: TemplateMetadata = {
      ...templateBuilder.basic(),
      variables: {
        serverName: {
          description: 'Name of the MCP server',
          type: 'string',
          required: true,
          validation: {
            pattern: '^[a-z][a-z0-9-]*$',
          },
        },
        port: {
          description: 'Server port',
          type: 'number',
          required: true,
          validation: {
            min: 1000,
            max: 9999,
          },
        },
        enableFeatures: {
          description: 'Enable advanced features',
          type: 'boolean',
          required: false,
          default: false,
        },
        toolCategories: {
          description: 'Tool categories to include',
          type: 'array',
          required: false,
          default: ['file', 'data'],
          validation: {
            options: ['file', 'data', 'utility', 'network', 'system'],
          },
        },
      },
      files: [
        { path: 'config.json', template: true },
        { path: 'src/server.ts', template: true },
        { path: 'README.md', template: true },
      ],
    };

    const context: TemplateContext = {
      templatePath: '/templates/comprehensive',
      outputPath: '/output',
      variables: {
        serverName: 'test-server',
        port: 3000,
        enableFeatures: true,
        toolCategories: ['file', 'data', 'network'],
      },
      optimization: {
        turboRepo: false,
        hotReload: true,
        sharedDependencies: false,
        buildCaching: true,
      },
    };

    // Mock template files
    await mockVolume.promises.mkdir('/templates/comprehensive/src', { recursive: true });

    await mockVolume.promises.writeFile(
      '/templates/comprehensive/config.json',
      '{"name": "{{serverName}}", "port": {{port}}, "features": {{enableFeatures}}, "tools": {{toolCategories}}}',
    );

    await mockVolume.promises.writeFile(
      '/templates/comprehensive/src/server.ts',
      `const config = {
  name: '{{serverName}}',
  port: {{port}},
  features: {{enableFeatures}},
  tools: [{{toolCategories}}]
};`,
    );

    await mockVolume.promises.writeFile(
      '/templates/comprehensive/README.md',
      '# {{serverName}}\nPort: {{port}}\nFeatures: {{enableFeatures}}\nTools: {{toolCategories}}',
    );

    // Process template
    const result = await engine.process(metadata, context);

    // Assert success
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.generatedFiles).toHaveLength(3);

    // Verify file contents
    const configContent = await mockVolume.promises.readFile('/output/config.json', 'utf8');
    expect(configContent).toContain('"name": "test-server"');
    expect(configContent).toContain('"port": 3000');
    expect(configContent).toContain('"features": true');

    const serverContent = await mockVolume.promises.readFile('/output/src/server.ts', 'utf8');
    expect(serverContent).toContain("name: 'test-server'");
    expect(serverContent).toContain('port: 3000');
    expect(serverContent).toContain('features: true');
  });

  /**
   * Test 2: Pre-flight validation failures
   */
  it('should fail pre-flight checks appropriately', async () => {
    const metadata: TemplateMetadata = {
      ...templateBuilder.basic(),
      files: [
        { path: 'missing-file.txt', template: true },
        { path: 'valid-file.txt', template: false },
      ],
    };

    const context: TemplateContext = {
      templatePath: '/templates/invalid',
      outputPath: '/readonly/output',
      variables: { name: 'test' },
      optimization: {
        turboRepo: false,
        hotReload: false,
        sharedDependencies: false,
        buildCaching: false,
      },
    };

    // Mock only valid-file.txt exists
    await mockVolume.promises.mkdir('/templates/invalid', { recursive: true });
    await mockVolume.promises.writeFile('/templates/invalid/valid-file.txt', 'content');

    // Process should fail
    const result = await engine.process(metadata, context);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    // Should have specific error messages
    expect(result.errors.some((e) => e.includes('Template file missing: missing-file.txt'))).toBe(
      true,
    );
  });

  /**
   * Test 3: Edge case - Empty template files
   */
  it('should handle empty template files', async () => {
    const metadata: TemplateMetadata = {
      ...templateBuilder.basic(),
      files: [
        { path: 'empty.txt', template: true },
        { path: 'also-empty.md', template: false },
      ],
    };

    const context: TemplateContext = {
      templatePath: '/templates/empty',
      outputPath: '/output',
      variables: { name: 'test' },
      optimization: {
        turboRepo: false,
        hotReload: false,
        sharedDependencies: false,
        buildCaching: false,
      },
    };

    // Create empty files
    await mockVolume.promises.mkdir('/templates/empty', { recursive: true });
    await mockVolume.promises.writeFile('/templates/empty/empty.txt', '');
    await mockVolume.promises.writeFile('/templates/empty/also-empty.md', '');

    const result = await engine.process(metadata, context);

    expect(result.success).toBe(true);
    expect(result.generatedFiles).toHaveLength(2);

    // Verify empty files were created
    const emptyContent = await mockVolume.promises.readFile('/output/empty.txt', 'utf8');
    expect(emptyContent).toBe('');
  });

  /**
   * Test 4: Complex nested directory structure
   */
  it('should preserve complex nested directory structures', async () => {
    const metadata: TemplateMetadata = {
      ...templateBuilder.basic(),
      files: [
        { path: 'src/index.ts', template: true },
        { path: 'src/utils/logger.ts', template: true },
        { path: 'src/utils/helpers/string.ts', template: true },
        { path: 'tests/unit/index.test.ts', template: true },
        { path: 'docs/api/reference.md', template: true },
        { path: 'config/env/development.json', template: true },
      ],
    };

    const context: TemplateContext = {
      templatePath: '/templates/nested',
      outputPath: '/output',
      variables: { serverName: 'complex-server' },
      optimization: {
        turboRepo: false,
        hotReload: false,
        sharedDependencies: false,
        buildCaching: false,
      },
    };

    // Create nested structure
    const dirs = [
      '/templates/nested/src',
      '/templates/nested/src/utils',
      '/templates/nested/src/utils/helpers',
      '/templates/nested/tests/unit',
      '/templates/nested/docs/api',
      '/templates/nested/config/env',
    ];

    for (const dir of dirs) {
      await mockVolume.promises.mkdir(dir, { recursive: true });
    }

    // Create files with template content
    for (const file of metadata.files) {
      await mockVolume.promises.writeFile(
        `/templates/nested/${file.path}`,
        `// {{serverName}} - ${file.path}`,
      );
    }

    const result = await engine.process(metadata, context);

    expect(result.success).toBe(true);
    expect(result.generatedFiles).toHaveLength(6);

    // Verify nested structure preserved
    for (const file of metadata.files) {
      const content = await mockVolume.promises.readFile(`/output/${file.path}`, 'utf8');
      expect(content).toBe(`// complex-server - ${file.path}`);
    }
  });

  /**
   * Test 5: Special characters in variable values
   */
  it('should handle special characters in variable values', async () => {
    const metadata: TemplateMetadata = {
      ...templateBuilder.basic(),
      files: [
        { path: 'test.txt', template: true },
        { path: 'script.sh', template: true },
      ],
    };

    const context: TemplateContext = {
      templatePath: '/templates/special',
      outputPath: '/output',
      variables: {
        name: 'test-server@2.0',
        description: 'Server with "quotes" and \'apostrophes\'',
        regex: '^[a-z]+\\d{2,4}$',
        path: 'C:\\Users\\Test\\Documents',
        command: 'echo "Hello $USER" && ls -la | grep test',
      },
      optimization: {
        turboRepo: false,
        hotReload: false,
        sharedDependencies: false,
        buildCaching: false,
      },
    };

    // Create template files
    await mockVolume.promises.mkdir('/templates/special', { recursive: true });

    await mockVolume.promises.writeFile(
      '/templates/special/test.txt',
      `Name: {{name}}
Description: {{description}}
Pattern: {{regex}}
Path: {{path}}
Command: {{command}}`,
    );

    await mockVolume.promises.writeFile(
      '/templates/special/script.sh',
      `#!/bin/bash
# {{description}}
SERVER_NAME="{{name}}"
PATTERN='{{regex}}'
echo "{{command}}"`,
    );

    const result = await engine.process(metadata, context);

    expect(result.success).toBe(true);

    // Verify special characters preserved
    const testContent = await mockVolume.promises.readFile('/output/test.txt', 'utf8');
    expect(testContent).toContain('test-server@2.0');
    expect(testContent).toContain('Server with "quotes" and \'apostrophes\'');
    expect(testContent).toContain('^[a-z]+\\d{2,4}$');
    expect(testContent).toContain('C:\\Users\\Test\\Documents');
    expect(testContent).toContain('echo "Hello $USER" && ls -la | grep test');
  });

  /**
   * Test 6: Binary file handling
   */
  it('should copy binary files without processing', async () => {
    const metadata: TemplateMetadata = {
      ...templateBuilder.basic(),
      files: [
        { path: 'assets/logo.png', template: false },
        { path: 'assets/icon.ico', template: false },
        { path: 'README.md', template: true },
      ],
    };

    const context: TemplateContext = {
      templatePath: '/templates/binary',
      outputPath: '/output',
      variables: { name: 'binary-test' },
      optimization: {
        turboRepo: false,
        hotReload: false,
        sharedDependencies: false,
        buildCaching: false,
      },
    };

    // Create binary files (mock binary data)
    await mockVolume.promises.mkdir('/templates/binary/assets', { recursive: true });

    const binaryData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await mockVolume.promises.writeFile('/templates/binary/assets/logo.png', binaryData);
    await mockVolume.promises.writeFile('/templates/binary/assets/icon.ico', binaryData);
    await mockVolume.promises.writeFile('/templates/binary/README.md', '# {{name}}');

    const result = await engine.process(metadata, context);

    expect(result.success).toBe(true);

    // Verify binary files copied exactly
    const logoCopy = await mockVolume.promises.readFile('/output/assets/logo.png');
    expect(Buffer.compare(logoCopy as Buffer, binaryData)).toBe(0);

    // Verify template file processed
    const readmeContent = await mockVolume.promises.readFile('/output/README.md', 'utf8');
    expect(readmeContent).toBe('# binary-test');
  });

  /**
   * Test 7: Variable validation with enhanced error messages
   */
  it('should provide helpful error messages for validation failures', async () => {
    const metadata: TemplateMetadata = {
      ...templateBuilder.basic(),
      variables: {
        serverName: {
          description: 'Server name',
          type: 'string',
          required: true,
          validation: {
            pattern: '^[a-z][a-z0-9-]*$',
          },
        },
        port: {
          description: 'Port number',
          type: 'number',
          required: true,
          validation: {
            min: 1000,
            max: 9999,
          },
        },
        environment: {
          description: 'Deployment environment',
          type: 'string',
          required: true,
          validation: {
            options: ['development', 'staging', 'production'],
          },
        },
        features: {
          description: 'Features to enable',
          type: 'array',
          required: false,
          validation: {
            options: ['auth', 'logging', 'metrics', 'tracing'],
          },
        },
      },
      files: [],
    };

    // Test various validation failures
    const testCases = [
      {
        variables: { serverName: 'Test_Server', port: 3000, environment: 'production' },
        expectedError: 'does not match required pattern',
      },
      {
        variables: { serverName: 'test-server', port: 99, environment: 'production' },
        expectedError: 'must be at least 1000',
      },
      {
        variables: { serverName: 'test-server', port: 3000, environment: 'testing' },
        expectedError: 'has invalid value',
      },
      {
        variables: {
          serverName: 'test-server',
          port: 3000,
          environment: 'production',
          features: ['auth', 'invalid-feature'],
        },
        expectedError: 'Invalid values: invalid-feature',
      },
    ];

    for (const testCase of testCases) {
      const result = await engine.validateVariables(metadata, testCase.variables);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes(testCase.expectedError))).toBe(true);
    }
  });

  /**
   * Test 8: MCP config generation
   */
  it('should generate MCP configuration file', async () => {
    const metadata: TemplateMetadata = {
      ...templateBuilder.basic(),
      language: TemplateLanguage.TYPESCRIPT,
      mcpConfig: {
        defaultCommand: 'node',
        defaultArgs: ['dist/index.js'],
        defaultEnv: {
          NODE_ENV: 'production',
        },
      },
      files: [{ path: 'src/index.ts', template: true }],
    };

    const context: TemplateContext = {
      templatePath: '/templates/mcp',
      outputPath: '/output',
      variables: { serverName: 'test-mcp-server' },
      optimization: {
        turboRepo: false,
        hotReload: false,
        sharedDependencies: false,
        buildCaching: false,
      },
      mcpConfig: {
        generateConfig: true,
        configName: 'test-mcp-server',
        env: {
          LOG_LEVEL: 'debug',
        },
      },
    };

    // Create template files
    await mockVolume.promises.mkdir('/templates/mcp/src', { recursive: true });
    await mockVolume.promises.writeFile(
      '/templates/mcp/src/index.ts',
      'console.log("{{serverName}}");',
    );

    const result = await engine.process(metadata, context);

    expect(result.success).toBe(true);
    expect(result.mcpConfigPath).toBeDefined();

    // Verify MCP config generated
    const mcpConfig = JSON.parse(
      (await mockVolume.promises.readFile('/output/.mcp.json', 'utf8')) as string,
    );

    expect(mcpConfig.mcpServers).toBeDefined();
    expect(mcpConfig.mcpServers['test-mcp-server']).toBeDefined();
    expect(mcpConfig.mcpServers['test-mcp-server'].command).toBe('node');
    expect(mcpConfig.mcpServers['test-mcp-server'].args).toEqual(['dist/index.js']);
    expect(mcpConfig.mcpServers['test-mcp-server'].env.NODE_ENV).toBe('production');
    expect(mcpConfig.mcpServers['test-mcp-server'].env.LOG_LEVEL).toBe('debug');
  });
});
