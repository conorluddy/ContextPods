/**
 * Unit tests for TemplateSelector - Template Selection Logic
 * Checkpoint 1.3: Template Selector Logic Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { Volume } from 'memfs';
import { TemplateSelector } from '../../src/template-selector.js';
import { TemplateLanguage } from '../../src/types.js';
import type { TemplateMetadata } from '../../src/types.js';

// Mock fs module
vi.mock('fs');

describe('TemplateSelector - Template Selection Logic', () => {
  let selector: TemplateSelector;
  let mockVolume: Volume;

  beforeEach(() => {
    mockVolume = new Volume();
    selector = new TemplateSelector('/templates');

    // Mock fs.promises methods
    vi.mocked(fs).readdir = vi
      .fn()
      .mockImplementation((path: string, options?: { withFileTypes?: boolean }) =>
        mockVolume.promises.readdir(path, options),
      );
    vi.mocked(fs).readFile = vi
      .fn()
      .mockImplementation((path: string, options?: { encoding?: string }) =>
        mockVolume.promises.readFile(path, options),
      );

    // Reset mocks and filesystem
    vi.clearAllMocks();
    mockVolume.reset();
  });

  afterEach(() => {
    mockVolume.reset();
    vi.restoreAllMocks();
  });

  /**
   * Test 1: Language Detection from Files
   */
  describe('Language Detection', () => {
    it('should detect TypeScript from .ts extension', async () => {
      // Setup: TypeScript file with content
      const scriptContent = `
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
const server = new Server({ name: 'test-server' });
export default server;
      `;

      await mockVolume.promises.mkdir('/scripts', { recursive: true });
      await mockVolume.promises.writeFile('/scripts/server.ts', scriptContent);

      // Action: Detect language
      const language = await selector.detectLanguageFromScript('/scripts/server.ts');

      // Assert: Returns TypeScript
      expect(language).toBe(TemplateLanguage.TYPESCRIPT);
    });

    it('should detect Python from .py extension', async () => {
      // Setup: Python file with content
      const scriptContent = `
#!/usr/bin/env python3
import mcp.server.stdio

def main():
    print("Hello MCP Server")

if __name__ == "__main__":
    main()
      `;

      await mockVolume.promises.mkdir('/scripts', { recursive: true });
      await mockVolume.promises.writeFile('/scripts/server.py', scriptContent);

      // Action: Detect language
      const language = await selector.detectLanguageFromScript('/scripts/server.py');

      // Assert: Returns Python
      expect(language).toBe(TemplateLanguage.PYTHON);
    });

    it('should detect JavaScript from .js extension and Node.js shebang', async () => {
      // Setup: JavaScript file with Node.js shebang
      const scriptContent = `
#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server');
const server = new Server({ name: 'test-server' });
module.exports = server;
      `;

      await mockVolume.promises.mkdir('/scripts', { recursive: true });
      await mockVolume.promises.writeFile('/scripts/server.js', scriptContent);

      // Action: Detect language
      const language = await selector.detectLanguageFromScript('/scripts/server.js');

      // Assert: Returns Node.js/JavaScript
      expect(language).toBe(TemplateLanguage.NODEJS);
    });

    it('should handle unreadable files gracefully', async () => {
      // Setup: Mock readFile to throw error
      vi.mocked(fs).readFile.mockRejectedValueOnce(new Error('Permission denied'));

      // Action: Attempt to detect language
      const language = await selector.detectLanguageFromScript('/nonexistent/script.ts');

      // Assert: Falls back to extension-based detection
      expect(language).toBe(TemplateLanguage.TYPESCRIPT);
    });
  });

  /**
   * Test 2: Template Scoring Algorithm
   */
  describe('Template Scoring', () => {
    let typescriptTemplate: TemplateMetadata;
    let pythonTemplate: TemplateMetadata;
    let basicTemplate: TemplateMetadata;

    beforeEach(() => {
      // Setup different template types for scoring tests
      typescriptTemplate = {
        name: 'typescript-advanced',
        description: 'Advanced TypeScript template with TurboRepo optimization',
        version: '1.0.0',
        language: TemplateLanguage.TYPESCRIPT,
        tags: ['advanced', 'typescript'],
        optimization: {
          turboRepo: true,
          hotReload: true,
          sharedDependencies: true,
          buildCaching: true,
        },
        variables: {
          serverName: {
            description: 'The name of your MCP server',
            type: 'string',
            required: true,
          },
        },
        files: [
          { path: 'package.json.mustache', template: true },
          { path: 'src/index.ts.mustache', template: true },
        ],
      };

      pythonTemplate = {
        name: 'python-basic',
        description: 'Basic Python MCP server template',
        version: '1.0.0',
        language: TemplateLanguage.PYTHON,
        tags: ['basic', 'python'],
        optimization: {
          turboRepo: false,
          hotReload: false,
          sharedDependencies: false,
          buildCaching: false,
        },
        variables: {
          serverName: {
            description: 'The name of your MCP server',
            type: 'string',
            required: true,
          },
        },
        files: [
          { path: 'main.py.mustache', template: true },
          { path: 'requirements.txt.mustache', template: true },
        ],
      };

      basicTemplate = {
        name: 'basic-nodejs',
        description: 'Basic Node.js template',
        version: '1.0.0',
        language: TemplateLanguage.NODEJS,
        tags: ['basic'],
        optimization: {
          turboRepo: false,
          hotReload: true,
          sharedDependencies: false,
          buildCaching: false,
        },
        variables: {},
        files: [{ path: 'package.json.mustache', template: true }],
      };
    });

    it('should score templates based on language match', async () => {
      // Setup: Mock templates directory with different language templates
      await setupMockTemplates([typescriptTemplate, pythonTemplate]);

      // Action: Select template with TypeScript criteria
      const result = await selector.selectTemplate({
        language: TemplateLanguage.TYPESCRIPT,
      });

      // Assert: TypeScript template selected with high score
      expect(result).toBeTruthy();
      expect(result!.template.language).toBe(TemplateLanguage.TYPESCRIPT);
      expect(result!.score).toBeGreaterThanOrEqual(100); // Language match = 100 points
      expect(result!.reasons).toContain('matches language: typescript');
    });

    it('should add points for optimization flags', async () => {
      // Setup: Mock templates with different optimization levels
      await setupMockTemplates([typescriptTemplate, basicTemplate]);

      // Action: Select template preferring TurboRepo optimization
      const result = await selector.selectTemplate({
        language: TemplateLanguage.TYPESCRIPT,
        optimization: {
          turboRepo: true,
          hotReload: true,
          sharedDependencies: true,
          buildCaching: true,
        },
      });

      // Assert: Optimized template selected with higher score
      expect(result).toBeTruthy();
      expect(result!.template.name).toBe('typescript-advanced');
      expect(result!.score).toBeGreaterThanOrEqual(160); // Language (100) + optimizations (60+)
      expect(result!.reasons).toContain('supports TurboRepo optimization');
      expect(result!.reasons).toContain('supports hot reloading');
    });

    it('should handle tag matching in scoring', async () => {
      // Setup: Mock templates with different tags
      await setupMockTemplates([typescriptTemplate, basicTemplate]);

      // Action: Select template matching specific tags
      const result = await selector.selectTemplate({
        language: TemplateLanguage.TYPESCRIPT,
        tags: ['advanced', 'typescript'],
      });

      // Assert: Template with matching tags scores higher
      expect(result).toBeTruthy();
      expect(result!.template.name).toBe('typescript-advanced');
      expect(result!.reasons.some((reason) => reason.includes('matches tags'))).toBe(true);
    });

    it('should prefer TypeScript for Node.js projects', async () => {
      // Setup: Mock Node.js and TypeScript templates (without exact Node.js match)
      const tsTemplate = {
        name: 'typescript-preferred',
        description: 'TypeScript template',
        version: '1.0.0',
        language: TemplateLanguage.TYPESCRIPT,
        optimization: {
          turboRepo: true,
          hotReload: true,
          sharedDependencies: true,
          buildCaching: true,
        },
        variables: {},
        files: [{ path: 'package.json.mustache', template: true }],
      };

      const pythonTemplate = {
        name: 'python-alt',
        description: 'Python template',
        version: '1.0.0',
        language: TemplateLanguage.PYTHON,
        optimization: {
          turboRepo: false,
          hotReload: false,
          sharedDependencies: false,
          buildCaching: false,
        },
        variables: {},
        files: [{ path: 'main.py.mustache', template: true }],
      };

      await setupMockTemplates([tsTemplate, pythonTemplate]);

      // Action: Select template for Node.js project
      const result = await selector.selectTemplate({
        language: TemplateLanguage.NODEJS,
      });

      // Assert: TypeScript template gets preference bonus for Node.js
      expect(result).toBeTruthy();
      expect(result!.template.language).toBe(TemplateLanguage.TYPESCRIPT);
      expect(result!.reasons).toContain('TypeScript preferred for Node.js projects');
      expect(result!.score).toBe(25); // Only the preference bonus, no language match
    });
  });

  /**
   * Test 3: Best Template Selection
   */
  describe('Template Selection', () => {
    it('should select highest scoring template', async () => {
      // Setup: Multiple templates with different characteristics
      const templates = [
        {
          name: 'basic-js',
          description: 'Basic JavaScript template',
          version: '1.0.0',
          language: TemplateLanguage.NODEJS,
          optimization: {
            turboRepo: false,
            hotReload: false,
            sharedDependencies: false,
            buildCaching: false,
          },
          variables: {},
          files: [{ path: 'package.json.mustache', template: true }],
        },
        {
          name: 'ts-advanced',
          description: 'Advanced TypeScript template',
          version: '1.0.0',
          language: TemplateLanguage.TYPESCRIPT,
          optimization: {
            turboRepo: true,
            hotReload: true,
            sharedDependencies: true,
            buildCaching: true,
          },
          variables: {},
          files: [{ path: 'package.json.mustache', template: true }],
          tags: ['advanced'],
        },
        {
          name: 'python-basic',
          description: 'Basic Python template',
          version: '1.0.0',
          language: TemplateLanguage.PYTHON,
          optimization: {
            turboRepo: false,
            hotReload: false,
            sharedDependencies: false,
            buildCaching: false,
          },
          variables: {},
          files: [{ path: 'main.py.mustache', template: true }],
        },
      ];

      await setupMockTemplates(templates);

      // Action: Select best template for TypeScript with optimizations
      const result = await selector.selectTemplate({
        language: TemplateLanguage.TYPESCRIPT,
        optimization: { turboRepo: true, hotReload: true },
        complexity: 'advanced',
      });

      // Assert: TypeScript advanced template selected
      expect(result).toBeTruthy();
      expect(result!.template.name).toBe('ts-advanced');
      expect(result!.template.language).toBe(TemplateLanguage.TYPESCRIPT);
    });

    it('should return null when no templates match criteria', async () => {
      // Setup: Only Python templates available
      const pythonOnlyTemplate = {
        name: 'python-only',
        description: 'Python only template',
        version: '1.0.0',
        language: TemplateLanguage.PYTHON,
        optimization: {
          turboRepo: false,
          hotReload: false,
          sharedDependencies: false,
          buildCaching: false,
        },
        variables: {},
        files: [{ path: 'main.py.mustache', template: true }],
      };
      await setupMockTemplates([pythonOnlyTemplate]);

      // Action: Request Rust template (not available)
      const result = await selector.selectTemplate({
        language: TemplateLanguage.RUST,
      });

      // Assert: No template selected
      expect(result).toBeNull();
    });

    it('should return null when no templates are available', async () => {
      // Setup: Empty templates directory
      await mockVolume.promises.mkdir('/templates', { recursive: true });

      // Action: Attempt to select any template
      const result = await selector.selectTemplate({
        language: TemplateLanguage.TYPESCRIPT,
      });

      // Assert: No template available
      expect(result).toBeNull();
    });
  });

  /**
   * Test 4: Template Recommendations
   */
  describe('Template Recommendations', () => {
    beforeEach(async () => {
      // Setup: Multiple templates for recommendation testing
      const templates = [
        {
          name: 'basic-ts',
          description: 'Basic TypeScript template',
          version: '1.0.0',
          language: TemplateLanguage.TYPESCRIPT,
          tags: ['basic'],
          optimization: {
            turboRepo: false,
            hotReload: false,
            sharedDependencies: false,
            buildCaching: false,
          },
          variables: {},
          files: [{ path: 'package.json.mustache', template: true }],
        },
        {
          name: 'advanced-ts',
          description: 'Advanced TypeScript template',
          version: '1.0.0',
          language: TemplateLanguage.TYPESCRIPT,
          tags: ['advanced'],
          optimization: {
            turboRepo: true,
            hotReload: true,
            sharedDependencies: true,
            buildCaching: true,
          },
          variables: {},
          files: [{ path: 'package.json.mustache', template: true }],
        },
        {
          name: 'python-basic',
          description: 'Basic Python template',
          version: '1.0.0',
          language: TemplateLanguage.PYTHON,
          tags: ['basic'],
          optimization: {
            turboRepo: false,
            hotReload: false,
            sharedDependencies: false,
            buildCaching: false,
          },
          variables: {},
          files: [{ path: 'main.py.mustache', template: true }],
        },
      ];

      await setupMockTemplates(templates);
    });

    it('should recommend TypeScript template with optimizations', async () => {
      // Action: Get recommendation for TypeScript
      const result = await selector.getRecommendedTemplate(TemplateLanguage.TYPESCRIPT);

      // Assert: Advanced TypeScript template recommended
      expect(result).toBeTruthy();
      expect(result!.template.name).toBe('advanced-ts');
      expect(result!.template.language).toBe(TemplateLanguage.TYPESCRIPT);
      expect(result!.reasons).toContain('supports TurboRepo optimization');
    });

    it('should recommend appropriate template for Python', async () => {
      // Action: Get recommendation for Python
      const result = await selector.getRecommendedTemplate(TemplateLanguage.PYTHON);

      // Assert: Python template recommended
      expect(result).toBeTruthy();
      expect(result!.template.language).toBe(TemplateLanguage.PYTHON);
      expect(result!.template.name).toBe('python-basic');
    });

    it('should recommend with complexity preference', async () => {
      // Action: Get recommendation for Node.js (should prefer TypeScript)
      const result = await selector.getRecommendedTemplate(TemplateLanguage.NODEJS);

      // Assert: TypeScript template recommended for Node.js
      expect(result).toBeTruthy();
      expect(result!.template.language).toBe(TemplateLanguage.TYPESCRIPT);
      expect(result!.reasons).toContain('TypeScript preferred for Node.js projects');
    });
  });

  /**
   * Test 5: Template Suggestions for Scripts
   */
  describe('Template Suggestions', () => {
    beforeEach(async () => {
      // Setup: Multiple templates for suggestion testing
      const templates = [
        {
          name: 'ts-advanced',
          description: 'Advanced TypeScript template',
          version: '1.0.0',
          language: TemplateLanguage.TYPESCRIPT,
          tags: ['advanced', 'typescript'],
          optimization: {
            turboRepo: true,
            hotReload: true,
            sharedDependencies: true,
            buildCaching: true,
          },
          variables: {},
          files: [{ path: 'package.json.mustache', template: true }],
        },
        {
          name: 'ts-basic',
          description: 'Basic TypeScript template',
          version: '1.0.0',
          language: TemplateLanguage.TYPESCRIPT,
          tags: ['basic'],
          optimization: {
            turboRepo: false,
            hotReload: false,
            sharedDependencies: false,
            buildCaching: false,
          },
          variables: {},
          files: [{ path: 'package.json.mustache', template: true }],
        },
        {
          name: 'python-basic',
          description: 'Basic Python template',
          version: '1.0.0',
          language: TemplateLanguage.PYTHON,
          tags: ['basic', 'python'],
          optimization: {
            turboRepo: false,
            hotReload: false,
            sharedDependencies: false,
            buildCaching: false,
          },
          variables: {},
          files: [{ path: 'main.py.mustache', template: true }],
        },
      ];

      await setupMockTemplates(templates);
    });

    it('should return sorted suggestions by score', async () => {
      // Setup: TypeScript script file
      const scriptContent = 'export const server = new Server();';
      await mockVolume.promises.mkdir('/scripts', { recursive: true });
      await mockVolume.promises.writeFile('/scripts/server.ts', scriptContent);

      // Action: Get suggestions for TypeScript script
      const suggestions = await selector.getTemplateSuggestions('/scripts/server.ts');

      // Assert: Suggestions returned in score order
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].score).toBeGreaterThanOrEqual(suggestions[1].score);
      expect(suggestions[1].score).toBeGreaterThanOrEqual(suggestions[2].score);

      // Assert: TypeScript templates ranked higher
      expect(suggestions[0].template.language).toBe(TemplateLanguage.TYPESCRIPT);
      expect(suggestions[1].template.language).toBe(TemplateLanguage.TYPESCRIPT);
    });

    it('should handle undetectable language gracefully', async () => {
      // Setup: File with no clear language indicators
      await mockVolume.promises.mkdir('/scripts', { recursive: true });
      await mockVolume.promises.writeFile('/scripts/unknown.txt', 'some random content');

      // Action: Get suggestions for unknown file type
      const suggestions = await selector.getTemplateSuggestions('/scripts/unknown.txt');

      // Assert: All available templates returned
      expect(suggestions).toHaveLength(3);
      // All templates should have score 0 since no language detected
      expect(suggestions.every((s) => s.score === 0)).toBe(true);
    });

    it('should provide detailed scoring reasons', async () => {
      // Setup: Python script file
      const scriptContent = '#!/usr/bin/env python3\nprint("Hello MCP")';
      await mockVolume.promises.mkdir('/scripts', { recursive: true });
      await mockVolume.promises.writeFile('/scripts/server.py', scriptContent);

      // Action: Get suggestions for Python script
      const suggestions = await selector.getTemplateSuggestions('/scripts/server.py');

      // Assert: Python template has highest score with reasons
      const pythonSuggestion = suggestions.find(
        (s) => s.template.language === TemplateLanguage.PYTHON,
      );
      expect(pythonSuggestion).toBeTruthy();
      expect(pythonSuggestion!.score).toBeGreaterThan(0);
      expect(pythonSuggestion!.reasons).toContain('matches language: python');
    });
  });

  /**
   * Helper function to setup mock templates directory
   */
  async function setupMockTemplates(templates: TemplateMetadata[]): Promise<void> {
    await mockVolume.promises.mkdir('/templates', { recursive: true });

    for (const template of templates) {
      const templateDir = `/templates/${template.name}`;
      await mockVolume.promises.mkdir(templateDir, { recursive: true });
      await mockVolume.promises.writeFile(
        `${templateDir}/template.json`,
        JSON.stringify(template, null, 2),
      );
    }
  }
});
