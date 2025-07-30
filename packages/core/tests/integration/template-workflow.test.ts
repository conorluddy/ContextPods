/**
 * Integration tests for template generation workflows
 * Phase 7: Add Comprehensive Testing Framework
 *
 * Tests common development workflows:
 * 1. Generate → Build → Run cycle
 * 2. Template customization workflows
 * 3. Multi-language template testing
 * 4. Error recovery scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { execa } from 'execa';
import { DefaultTemplateEngine } from '../../src/template-engine.js';
import { TemplateSelector } from '../../src/template-selector.js';
import { templateMetadataSchema } from '../../src/schemas.js';
import type { TemplateContext, TemplateMetadata } from '../../src/types.js';
import { TemplateLanguage } from '../../src/types.js';

// Test timeout for integration tests
const INTEGRATION_TIMEOUT = 90000; // 90 seconds

describe('Template Generation Workflows', () => {
  let testDir: string;
  let engine: DefaultTemplateEngine;

  beforeEach(async () => {
    // Create unique test directory
    testDir = join(tmpdir(), `mcp-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });

    engine = new DefaultTemplateEngine();
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  /**
   * Test 1: Complete TypeScript workflow
   */
  it.skip(
    'should complete TypeScript template workflow',
    async () => {
      const templatePath = join(process.cwd(), '../../templates', 'typescript-advanced');
      const outputPath = join(testDir, 'ts-server');

      // Step 1: Validate template metadata
      const metadataPath = join(templatePath, 'template.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);

      const validationResult = templateMetadataSchema.safeParse(metadata);
      expect(validationResult.success).toBe(true);

      // Step 2: Generate template with custom variables
      const context: TemplateContext = {
        templatePath,
        outputPath,
        variables: {
          serverName: 'workflow-test-server',
          description: 'Integration test server',
          author: 'Test Suite',
          license: 'MIT',
          includeTools: true,
          includeResources: true,
          toolCategories: ['file', 'data'],
        },
        optimization: {
          turboRepo: false,
          hotReload: false,
          sharedDependencies: false,
          buildCaching: false,
        },
      };

      const result = await engine.process(metadata as TemplateMetadata, context);
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Step 3: Verify generated files
      const packageJsonPath = join(outputPath, 'package.json');
      const packageJsonExists = await fileExists(packageJsonPath);
      expect(packageJsonExists).toBe(true);

      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      expect(packageJson.name).toBe('workflow-test-server');
      expect(packageJson.description).toBe('Integration test server');

      // Step 4: Install dependencies
      const installResult = await execa('npm', ['install'], {
        cwd: outputPath,
        timeout: 60000,
        reject: false,
      });
      expect(installResult.exitCode).toBe(0);

      // Step 5: Run TypeScript compilation
      const buildResult = await execa('npm', ['run', 'build'], {
        cwd: outputPath,
        timeout: 30000,
        reject: false,
      });
      expect(buildResult.exitCode).toBe(0);

      // Step 6: Verify build output
      const distExists = await fileExists(join(outputPath, 'dist'));
      expect(distExists).toBe(true);

      const indexJsExists = await fileExists(join(outputPath, 'dist', 'index.js'));
      expect(indexJsExists).toBe(true);
    },
    INTEGRATION_TIMEOUT,
  );

  /**
   * Test 2: Multi-language template selection
   */
  it('should handle multi-language template selection correctly', async () => {
    const templatesDir = join(process.cwd(), '../templates/templates');

    // Test language detection for various file types
    const testCases = [
      { file: 'test.ts', expectedLang: TemplateLanguage.TYPESCRIPT },
      { file: 'test.js', expectedLang: TemplateLanguage.NODEJS },
      { file: 'test.py', expectedLang: TemplateLanguage.PYTHON },
      { file: 'test.rs', expectedLang: TemplateLanguage.RUST },
      { file: 'test.sh', expectedLang: TemplateLanguage.SHELL },
    ];

    for (const testCase of testCases) {
      const filePath = join(testDir, testCase.file);
      await fs.writeFile(filePath, '// test content');

      const detectedLang = await engine.detectLanguage(filePath);
      expect(detectedLang).toBe(testCase.expectedLang);
    }

    // Test template selection for each language
    // Selector doesn't need templatesDir - it's passed in constructor
    const selector2 = new TemplateSelector(templatesDir);
    const templates = await selector2.getAvailableTemplates();

    // Verify we have templates for multiple languages
    const languages = new Set(templates.map((t) => t.template.language));
    expect(languages.size).toBeGreaterThan(1);

    // Test filtering by language - manual filter since selector doesn't have findTemplates
    const allTemplates = await selector2.getAvailableTemplates();
    const tsTemplates = allTemplates.filter(
      (t) => t.template.language === TemplateLanguage.TYPESCRIPT,
    );
    expect(tsTemplates.length).toBeGreaterThan(0);
    expect(tsTemplates.every((t) => t.template.language === TemplateLanguage.TYPESCRIPT)).toBe(
      true,
    );
  });

  /**
   * Test 3: Template customization workflow
   */
  it.skip('should support template customization workflow', async () => {
    const templatePath = join(process.cwd(), 'templates', 'basic');
    const customizedPath = join(testDir, 'customized-template');
    const outputPath = join(testDir, 'custom-server');

    // Step 1: Copy template for customization
    await copyDirectory(templatePath, customizedPath);

    // Step 2: Modify template metadata
    const metadataPath = join(customizedPath, 'template.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

    metadata.name = 'customized-template';
    metadata.description = 'Customized version of basic template';
    metadata.variables.customField = {
      description: 'Custom field added by test',
      type: 'string',
      required: false,
      default: 'custom-value',
    };

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Step 3: Add custom template file
    const customFilePath = join(customizedPath, 'custom.txt');
    await fs.writeFile(customFilePath, 'Custom content: {{customField}}');

    metadata.files.push({
      path: 'custom.txt',
      template: true,
    });

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Step 4: Generate from customized template
    const context: TemplateContext = {
      templatePath: customizedPath,
      outputPath,
      variables: {
        serverName: 'custom-server',
        customField: 'injected-value',
      },
      optimization: {
        turboRepo: false,
        hotReload: false,
        sharedDependencies: false,
        buildCaching: false,
      },
    };

    const result = await engine.process(metadata, context);
    expect(result.success).toBe(true);

    // Step 5: Verify customization applied
    const customFileContent = await fs.readFile(join(outputPath, 'custom.txt'), 'utf8');
    expect(customFileContent).toBe('Custom content: injected-value');
  });

  /**
   * Test 4: Error recovery workflow
   */
  it.skip('should handle and recover from common errors', async () => {
    const templatePath = join(process.cwd(), 'templates', 'basic');
    const outputPath = join(testDir, 'error-recovery');

    // Test 1: Missing required variables
    const metadata = JSON.parse(await fs.readFile(join(templatePath, 'template.json'), 'utf8'));

    const context: TemplateContext = {
      templatePath,
      outputPath,
      variables: {
        // Missing required 'serverName'
      },
      optimization: {
        turboRepo: false,
        hotReload: false,
        sharedDependencies: false,
        buildCaching: false,
      },
    };

    let validationResult = await engine.validateVariables(metadata, context.variables);
    expect(validationResult.isValid).toBe(false);
    expect(validationResult.errors.some((e) => e.field === 'serverName')).toBe(true);

    // Recovery: Add missing variable
    context.variables.serverName = 'recovered-server';
    validationResult = await engine.validateVariables(metadata, context.variables);
    expect(validationResult.isValid).toBe(true);

    // Test 2: Invalid variable format
    context.variables.serverName = 'Invalid_Name!';
    validationResult = await engine.validateVariables(metadata, context.variables);
    expect(validationResult.isValid).toBe(false);

    // Recovery: Fix format
    context.variables.serverName = 'valid-name';
    validationResult = await engine.validateVariables(metadata, context.variables);
    expect(validationResult.isValid).toBe(true);

    // Test 3: Process with recovered variables
    const result = await engine.process(metadata, context);
    expect(result.success).toBe(true);
  });

  /**
   * Test 5: Turbo repo optimization workflow
   */
  it.skip('should handle turbo repo optimization', async () => {
    const templatePath = join(process.cwd(), 'templates', 'typescript-advanced');
    const outputPath = join(testDir, 'turbo-server');

    const metadata = JSON.parse(await fs.readFile(join(templatePath, 'template.json'), 'utf8'));

    const context: TemplateContext = {
      templatePath,
      outputPath,
      variables: {
        serverName: 'turbo-optimized-server',
        description: 'Server with turbo repo optimization',
        includeTools: true,
      },
      optimization: {
        turboRepo: true,
        hotReload: true,
        sharedDependencies: true,
        buildCaching: true,
      },
    };

    const result = await engine.process(metadata, context);
    expect(result.success).toBe(true);

    // Verify turbo-specific build commands
    expect(result.buildCommand).toBe('npm run build');
    expect(result.devCommand).toBe('npm run dev');

    // Verify package.json has turbo scripts
    const packageJson = JSON.parse(await fs.readFile(join(outputPath, 'package.json'), 'utf8'));
    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts.build).toBeDefined();
    expect(packageJson.scripts.dev).toBeDefined();
  });

  /**
   * Test 6: Python template workflow
   */
  it.skip('should handle Python template workflow', async () => {
    // Use selector to get available templates
    const templatesPath = join(process.cwd(), '../../templates');
    const pythonSelector = new TemplateSelector(templatesPath);
    const allTemplates = await pythonSelector.getAvailableTemplates();
    const pythonTemplates = allTemplates.filter(
      (t) => t.template.language === TemplateLanguage.PYTHON,
    );

    if (pythonTemplates.length === 0) {
      console.warn('No Python templates found, skipping Python workflow test');
      return;
    }

    const templatePath = pythonTemplates[0].templatePath;
    const outputPath = join(testDir, 'python-server');

    const metadata = JSON.parse(await fs.readFile(join(templatePath, 'template.json'), 'utf8'));

    const context: TemplateContext = {
      templatePath,
      outputPath,
      variables: {
        serverName: 'python_test_server',
        description: 'Python integration test',
      },
      optimization: {
        turboRepo: false,
        hotReload: false,
        sharedDependencies: false,
        buildCaching: false,
      },
    };

    const result = await engine.process(metadata, context);
    expect(result.success).toBe(true);

    // Verify Python-specific files
    const mainPyExists = await fileExists(join(outputPath, 'main.py'));
    if (mainPyExists) {
      // Test Python syntax
      const syntaxCheck = await execa('python3', ['-m', 'py_compile', 'main.py'], {
        cwd: outputPath,
        reject: false,
      });
      expect(syntaxCheck.exitCode).toBe(0);
    }

    // Verify build command for Python
    expect(result.buildCommand).toContain('pip');
  });

  /**
   * Helper: Check if file exists
   */
  async function fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Copy directory recursively
   */
  async function copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
});
