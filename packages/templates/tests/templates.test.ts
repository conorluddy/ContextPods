/**
 * Tests for @context-pods/templates package
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  getTemplatesPath,
  getAvailableTemplates,
  getTemplate,
  templateExists,
  templatesPath,
} from '../src/index.js';

describe('@context-pods/templates', () => {
  describe('getTemplatesPath', () => {
    it('should return a valid templates path', () => {
      const path = getTemplatesPath();
      expect(path).toBeTruthy();
      expect(path).toContain('templates');
    });

    it('should point to an existing directory', () => {
      const path = getTemplatesPath();
      expect(existsSync(path)).toBe(true);
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return an array of templates', () => {
      const templates = getAvailableTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should include basic template', () => {
      const templates = getAvailableTemplates();
      const basicTemplate = templates.find((t) => t.name === 'basic');
      expect(basicTemplate).toBeDefined();
      expect(basicTemplate?.language).toBe('typescript');
    });

    it('should include python-basic template', () => {
      const templates = getAvailableTemplates();
      const pythonTemplate = templates.find((t) => t.name === 'python-basic');
      expect(pythonTemplate).toBeDefined();
      expect(pythonTemplate?.language).toBe('python');
    });

    it('should include typescript-advanced template', () => {
      const templates = getAvailableTemplates();
      const advancedTemplate = templates.find((t) => t.name === 'typescript-advanced');
      expect(advancedTemplate).toBeDefined();
      expect(advancedTemplate?.language).toBe('typescript');
    });

    it('should return templates with all required fields', () => {
      const templates = getAvailableTemplates();
      templates.forEach((template) => {
        expect(template.name).toBeTruthy();
        expect(template.language).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.path).toBeTruthy();
        expect(existsSync(template.path)).toBe(true);
      });
    });
  });

  describe('getTemplate', () => {
    it('should return a specific template by name', () => {
      const template = getTemplate('basic');
      expect(template).toBeDefined();
      expect(template?.name).toBe('basic');
    });

    it('should return null for non-existent template', () => {
      const template = getTemplate('non-existent-template');
      expect(template).toBeNull();
    });
  });

  describe('templateExists', () => {
    it('should return true for existing templates', () => {
      expect(templateExists('basic')).toBe(true);
      expect(templateExists('python-basic')).toBe(true);
      expect(templateExists('typescript-advanced')).toBe(true);
    });

    it('should return false for non-existent templates', () => {
      expect(templateExists('non-existent')).toBe(false);
    });
  });

  describe('Template file structure', () => {
    const requiredTemplates = ['basic', 'python-basic', 'typescript-advanced'];

    requiredTemplates.forEach((templateName) => {
      describe(`${templateName} template`, () => {
        let templatePath: string;

        beforeAll(() => {
          const template = getTemplate(templateName);
          expect(template).toBeDefined();
          templatePath = template!.path;
        });

        it('should have a template.json file', () => {
          const templateJsonPath = join(templatePath, 'template.json');
          expect(existsSync(templateJsonPath)).toBe(true);

          // Validate it's valid JSON
          const content = readFileSync(templateJsonPath, 'utf8');
          expect(() => JSON.parse(content)).not.toThrow();
        });

        it('should have a README.md file', () => {
          const readmePath = join(templatePath, 'README.md');
          expect(existsSync(readmePath)).toBe(true);
        });

        if (templateName !== 'python-basic') {
          it('should have a package.json file', () => {
            const packageJsonPath = join(templatePath, 'package.json');
            expect(existsSync(packageJsonPath)).toBe(true);
          });

          it('should have a tsconfig.json file', () => {
            const tsconfigPath = join(templatePath, 'tsconfig.json');
            expect(existsSync(tsconfigPath)).toBe(true);
          });
        }

        if (templateName === 'python-basic') {
          it('should have requirements.txt file', () => {
            const requirementsPath = join(templatePath, 'requirements.txt');
            expect(existsSync(requirementsPath)).toBe(true);
          });

          it('should have main.py file', () => {
            const mainPath = join(templatePath, 'main.py');
            expect(existsSync(mainPath)).toBe(true);
          });
        }
      });
    });
  });

  describe('Template metadata validation', () => {
    it('should have valid metadata for all templates', () => {
      const templates = getAvailableTemplates();

      templates.forEach((template) => {
        const metadataPath = join(template.path, 'template.json');
        const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));

        // Check required fields
        expect(metadata.name).toBe(template.name);
        expect(metadata.language).toBe(template.language);
        expect(metadata.description).toBeTruthy();
        expect(metadata.version).toMatch(/^\d+\.\d+\.\d+$/);

        // Check optional but important fields
        if (metadata.variables) {
          expect(typeof metadata.variables).toBe('object');
        }

        if (metadata.files) {
          expect(Array.isArray(metadata.files)).toBe(true);
        }

        if (metadata.optimization) {
          expect(typeof metadata.optimization).toBe('object');
        }
      });
    });
  });

  describe('Export consistency', () => {
    it('should export templatesPath as an alias for getTemplatesPath', () => {
      expect(templatesPath).toBe(getTemplatesPath);
    });
  });
});
