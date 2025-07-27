/**
 * Unit tests for TemplateEngine - File Operations
 * Checkpoint 1.2: Template Engine File Operations Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { Volume } from 'memfs';
import { DefaultTemplateEngine } from '../../src/template-engine.js';
import { templateBuilder } from '../../../../tests/utils/builders.js';
import type { TemplateContext, TemplateMetadata } from '../../src/types.js';
import { TemplateLanguage } from '../../src/types.js';
import type { MakeDirectoryOptions, WriteFileOptions, ObjectEncodingOptions, Mode } from 'fs';

// Mock fs module
vi.mock('fs');

describe('TemplateEngine - File Operations', () => {
  let engine: DefaultTemplateEngine;
  let mockVolume: Volume;

  beforeEach(() => {
    engine = new DefaultTemplateEngine();
    mockVolume = new Volume();

    // Mock fs.promises methods with proper typing
    vi.mocked(fs).mkdir = vi
      .fn()
      .mockImplementation((path: string, options?: MakeDirectoryOptions) =>
        mockVolume.promises.mkdir(path, options),
      );
    vi.mocked(fs).writeFile = vi
      .fn()
      .mockImplementation((path: string, data: string | Buffer, options?: WriteFileOptions) =>
        mockVolume.promises.writeFile(path, data, options),
      );
    vi.mocked(fs).readFile = vi
      .fn()
      .mockImplementation((path: string, options?: ObjectEncodingOptions) =>
        mockVolume.promises.readFile(path, options),
      );
    vi.mocked(fs).copyFile = vi
      .fn()
      .mockImplementation((src: string, dest: string, flags?: number) =>
        mockVolume.promises.copyFile(src, dest, flags),
      );
    vi.mocked(fs).chmod = vi
      .fn()
      .mockImplementation((path: string, mode: Mode) => mockVolume.promises.chmod(path, mode));
    vi.mocked(fs).stat = vi
      .fn()
      .mockImplementation((path: string) => mockVolume.promises.stat(path));

    // Reset the mock file system
    vi.clearAllMocks();
    mockVolume.reset();
  });

  afterEach(() => {
    mockVolume.reset();
    vi.restoreAllMocks();
  });

  /**
   * Test 1: Output Directory Creation
   */
  it('should create output directory if not exists', async () => {
    // Setup: Mock template with nested output path
    const templateContent = 'Hello {{name}}!';

    const metadata: TemplateMetadata = {
      ...templateBuilder.basic(),
      files: [
        {
          path: 'README.md',
          template: true,
        },
      ],
    };

    const context: TemplateContext = {
      templatePath: '/templates/basic',
      outputPath: '/output/nested/deep',
      variables: { name: 'TestServer' },
      optimization: {
        turboRepo: false,
        hotReload: false,
        sharedDependencies: false,
        buildCaching: false,
      },
    };

    // Mock template files
    await mockVolume.promises.mkdir('/templates/basic', { recursive: true });
    await mockVolume.promises.writeFile('/templates/basic/README.md', templateContent);

    // Action: Process template to nested output directory
    const result = await engine.process(metadata, context);

    // Assert: Directory creation was called with correct path and recursive option
    expect(result.success).toBe(true);
    expect(vi.mocked(fs).mkdir).toHaveBeenCalledWith('/output/nested/deep', { recursive: true });

    // Assert: Output file was created
    const outputContent = await mockVolume.promises.readFile(
      '/output/nested/deep/README.md',
      'utf8',
    );
    expect(outputContent).toBe('Hello TestServer!');
  });

  /**
   * Test 2: Template File Structure Preservation
   */
  it('should copy template files preserving structure', async () => {
    // Setup: Template with nested directory structure
    const metadata: TemplateMetadata = {
      ...templateBuilder.basic(),
      files: [
        { path: 'README.md', template: true },
        { path: 'src/index.ts', template: true },
        { path: 'src/utils/helper.ts', template: false },
        { path: 'docs/api.md', template: true },
      ],
    };

    const context: TemplateContext = {
      templatePath: '/templates/nested',
      outputPath: '/output',
      variables: { name: 'NestedServer' },
      optimization: {
        turboRepo: false,
        hotReload: false,
        sharedDependencies: false,
        buildCaching: false,
      },
    };

    // Mock nested template structure
    await mockVolume.promises.mkdir('/templates/nested/src/utils', { recursive: true });
    await mockVolume.promises.mkdir('/templates/nested/docs', { recursive: true });

    await mockVolume.promises.writeFile('/templates/nested/README.md', '# {{name}}');
    await mockVolume.promises.writeFile(
      '/templates/nested/src/index.ts',
      'const name = "{{name}}";',
    );
    await mockVolume.promises.writeFile(
      '/templates/nested/src/utils/helper.ts',
      'export const helper = () => {};',
    );
    await mockVolume.promises.writeFile('/templates/nested/docs/api.md', '## {{name}} API');

    // Action: Process entire template structure
    const result = await engine.process(metadata, context);

    // Assert: All output directories were created preserving structure
    expect(result.success).toBe(true);
    expect(vi.mocked(fs).mkdir).toHaveBeenCalledWith('/output', { recursive: true });

    // Assert: All files exist with correct structure
    const readmeContent = await mockVolume.promises.readFile('/output/README.md', 'utf8');
    expect(readmeContent).toBe('# NestedServer');

    const indexContent = await mockVolume.promises.readFile('/output/src/index.ts', 'utf8');
    expect(indexContent).toBe('const name = "NestedServer";');

    const helperContent = await mockVolume.promises.readFile('/output/src/utils/helper.ts', 'utf8');
    expect(helperContent).toBe('export const helper = () => {};');

    const docsContent = await mockVolume.promises.readFile('/output/docs/api.md', 'utf8');
    expect(docsContent).toBe('## NestedServer API');
  });

  /**
   * Test 3: Template vs Non-Template File Processing
   */
  it('should process template files and copy non-template files', async () => {
    // Setup: Mix of template and non-template files
    const metadata: TemplateMetadata = {
      ...templateBuilder.basic(),
      language: TemplateLanguage.TYPESCRIPT,
      files: [
        { path: 'src/server.ts', template: true },
        { path: 'package.json', template: true },
        { path: 'static/logo.png', template: false },
        { path: 'config/settings.json', template: false },
      ],
    };

    const context: TemplateContext = {
      templatePath: '/templates/mixed',
      outputPath: '/output',
      variables: {
        serverName: 'MyMCPServer',
        version: '1.0.0',
      },
      optimization: {
        turboRepo: false,
        hotReload: false,
        sharedDependencies: false,
        buildCaching: false,
      },
    };

    // Mock template and static files
    await mockVolume.promises.mkdir('/templates/mixed/src', { recursive: true });
    await mockVolume.promises.mkdir('/templates/mixed/static', { recursive: true });
    await mockVolume.promises.mkdir('/templates/mixed/config', { recursive: true });

    // Template files (will be processed)
    await mockVolume.promises.writeFile(
      '/templates/mixed/src/server.ts',
      'export const serverName = "{{serverName}}";',
    );
    await mockVolume.promises.writeFile(
      '/templates/mixed/package.json',
      '{"name": "{{serverName}}", "version": "{{version}}"}',
    );

    // Non-template files (will be copied as-is)
    await mockVolume.promises.writeFile('/templates/mixed/static/logo.png', 'fake-binary-data');
    await mockVolume.promises.writeFile('/templates/mixed/config/settings.json', '{"debug": true}');

    // Action: Process mixed template
    const result = await engine.process(metadata, context);

    // Assert: Processing succeeded
    expect(result.success).toBe(true);

    // Assert: Template files were processed with variable substitution
    const serverContent = await mockVolume.promises.readFile('/output/src/server.ts', 'utf8');
    expect(serverContent).toBe('export const serverName = "MyMCPServer";');

    const packageContent = await mockVolume.promises.readFile('/output/package.json', 'utf8');
    expect(packageContent).toBe('{"name": "MyMCPServer", "version": "1.0.0"}');

    // Assert: Non-template files were copied exactly as-is
    const logoContent = await mockVolume.promises.readFile('/output/static/logo.png', 'utf8');
    expect(logoContent).toBe('fake-binary-data');

    const settingsContent = await mockVolume.promises.readFile(
      '/output/config/settings.json',
      'utf8',
    );
    expect(settingsContent).toBe('{"debug": true}');
  });

  /**
   * Test 4: File Permission Preservation
   */
  it('should preserve file permissions', async () => {
    // Setup: Template with executable files
    const metadata: TemplateMetadata = {
      ...templateBuilder.basic(),
      files: [
        { path: 'scripts/start.sh', template: true, executable: true },
        { path: 'scripts/deploy.sh', template: false, executable: true },
        { path: 'src/index.ts', template: true, executable: false },
      ],
    };

    const context: TemplateContext = {
      templatePath: '/templates/permissions',
      outputPath: '/output',
      variables: { scriptName: 'my-script' },
      optimization: {
        turboRepo: false,
        hotReload: false,
        sharedDependencies: false,
        buildCaching: false,
      },
    };

    // Mock template files
    await mockVolume.promises.mkdir('/templates/permissions/scripts', { recursive: true });
    await mockVolume.promises.mkdir('/templates/permissions/src', { recursive: true });

    await mockVolume.promises.writeFile(
      '/templates/permissions/scripts/start.sh',
      '#!/bin/bash\necho "Starting {{scriptName}}"',
    );
    await mockVolume.promises.writeFile(
      '/templates/permissions/scripts/deploy.sh',
      '#!/bin/bash\necho "Deploying"',
    );
    await mockVolume.promises.writeFile(
      '/templates/permissions/src/index.ts',
      'console.log("{{scriptName}}");',
    );

    // Action: Process template
    const result = await engine.process(metadata, context);

    // Assert: Processing succeeded
    expect(result.success).toBe(true);

    // Assert: Executable permissions were set for files marked as executable
    expect(vi.mocked(fs).chmod).toHaveBeenCalledWith('/output/scripts/start.sh', 0o755);
    expect(vi.mocked(fs).chmod).toHaveBeenCalledWith('/output/scripts/deploy.sh', 0o755);

    // Assert: Non-executable files did not have chmod called
    expect(vi.mocked(fs).chmod).not.toHaveBeenCalledWith(
      '/output/src/index.ts',
      expect.any(Number),
    );

    // Assert: File contents are correct
    const startContent = await mockVolume.promises.readFile('/output/scripts/start.sh', 'utf8');
    expect(startContent).toBe('#!/bin/bash\necho "Starting my-script"');

    const indexContent = await mockVolume.promises.readFile('/output/src/index.ts', 'utf8');
    expect(indexContent).toBe('console.log("my-script");');
  });

  /**
   * Test 5: File Operation Error Handling
   */
  it('should handle file operation errors gracefully', async () => {
    // Setup: Template that will cause file operation errors
    const metadata: TemplateMetadata = {
      ...templateBuilder.basic(),
      files: [{ path: 'test.txt', template: true }],
    };

    const context: TemplateContext = {
      templatePath: '/templates/error',
      outputPath: '/readonly/output',
      variables: { name: 'ErrorTest' },
      optimization: {
        turboRepo: false,
        hotReload: false,
        sharedDependencies: false,
        buildCaching: false,
      },
    };

    // Mock template file
    await mockVolume.promises.mkdir('/templates/error', { recursive: true });
    await mockVolume.promises.writeFile('/templates/error/test.txt', 'Hello {{name}}');

    // Mock mkdir to throw an error (simulating read-only filesystem)
    vi.mocked(fs).mkdir.mockRejectedValueOnce(new Error('Permission denied: read-only filesystem'));

    // Action: Attempt to process template
    const result = await engine.process(metadata, context);

    // Assert: Processing failed gracefully with enhanced error message
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Cannot write to output directory');
    expect(result.errors[0]).toContain('/readonly/output');
    expect(result.errors[0]).toContain('Check that you have write permissions');
  });
});
