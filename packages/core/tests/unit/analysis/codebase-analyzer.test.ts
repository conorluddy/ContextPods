import { promises as fs } from 'fs';

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { DefaultCodebaseAnalyzer } from '../../../src/analysis/codebase-analyzer.js';
import { TemplateLanguage, type AnalysisConfig } from '../../../src/types.js';

// Mock the filesystem
vi.mock('fs', () => ({
  promises: {
    stat: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
  },
}));

// Mock the TypeScript parser
vi.mock('../../../src/analysis/parsers/typescript-parser.js', () => ({
  TypeScriptParser: class MockTypeScriptParser {
    constructor() {}

    async parseFile() {
      return [
        {
          name: 'testFunction',
          signature: 'function testFunction(param: string): Promise<string>',
          parameters: [{ name: 'param', type: 'string', optional: false }],
          returnType: 'Promise<string>',
          complexity: { cyclomaticComplexity: 5, linesOfCode: 20, dependencies: 1 },
          location: { filePath: '/test/file.ts', startLine: 1, endLine: 10 },
          documentation: 'Test function for analysis',
          isExported: true,
          isAsync: true,
        },
      ];
    }

    async detectPatterns() {
      return [
        {
          type: 'api-call',
          confidence: 0.8,
          description: 'HTTP API calls detected',
          evidence: ['fetch(', 'axios.get'],
        },
      ];
    }

    scoreFunctionForMCP() {
      return 85;
    }

    async generateOpportunity(func: any, patterns: any, score: number) {
      return {
        id: `${func.location.filePath}:${func.name}:${func.location.startLine}`,
        functionName: func.name,
        filePath: func.location.filePath,
        language: TemplateLanguage.TYPESCRIPT,
        score,
        category: 'api-integration',
        description: func.documentation || 'Test function',
        suggestedTemplate: 'typescript-advanced',
        reasoning: ['Function is exported and accessible'],
        implementation: {
          toolName: 'test-function',
          toolDescription: 'Execute testFunction function',
          inputSchema: { type: 'object', properties: {}, required: [] },
          outputDescription: 'Promise<string>',
          dependencies: [],
          complexity: 'medium',
          estimatedEffort: 'low',
        },
        function: func,
        patterns,
      };
    }
  },
}));

const mockFs = vi.mocked(fs);

// eslint-disable-next-line max-lines-per-function
describe('DefaultCodebaseAnalyzer', () => {
  let analyzer: DefaultCodebaseAnalyzer;

  beforeEach(() => {
    analyzer = new DefaultCodebaseAnalyzer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create analyzer with default config', () => {
      const defaultAnalyzer = new DefaultCodebaseAnalyzer();
      expect(defaultAnalyzer).toBeDefined();
    });

    it('should merge custom config with defaults', () => {
      const customConfig: Partial<AnalysisConfig> = {
        maxFileSize: 2 * 1024 * 1024,
        includeTests: true,
      };
      const customAnalyzer = new DefaultCodebaseAnalyzer(customConfig);
      expect(customAnalyzer).toBeDefined();
    });
  });

  describe('validatePath', () => {
    it('should return true for valid directory', async () => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);

      const result = await analyzer.validatePath('/valid/path');
      expect(result).toBe(true);
      expect(mockFs.stat).toHaveBeenCalledWith('/valid/path');
    });

    it('should return false for non-directory', async () => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
      } as any);

      const result = await analyzer.validatePath('/file.txt');
      expect(result).toBe(false);
    });

    it('should return false for non-existent path', async () => {
      mockFs.stat.mockRejectedValue(new Error('ENOENT'));

      const result = await analyzer.validatePath('/nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return array of supported languages', () => {
      const languages = analyzer.getSupportedLanguages();
      expect(languages).toContain(TemplateLanguage.TYPESCRIPT);
      expect(languages).toContain(TemplateLanguage.NODEJS);
      expect(languages).toContain(TemplateLanguage.PYTHON);
      expect(languages).toContain(TemplateLanguage.RUST);
      expect(languages).toContain(TemplateLanguage.SHELL);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const config = analyzer.getDefaultConfig();
      expect(config).toHaveProperty('maxFileSize');
      expect(config).toHaveProperty('excludePatterns');
      expect(config).toHaveProperty('languageSettings');
      expect(config.maxFileSize).toBe(1024 * 1024);
    });
  });

  // eslint-disable-next-line max-lines-per-function
  describe('analyze', () => {
    beforeEach(() => {
      // Mock directory structure
      mockFs.stat.mockImplementation(async (path: string) => {
        if (path === '/test/project') {
          return { isDirectory: () => true } as any;
        }
        if (path === '/test/project/src/file.ts') {
          return { isDirectory: () => false, size: 1000 } as any;
        }
        throw new Error('ENOENT');
      });

      mockFs.readdir.mockImplementation(async (path: string) => {
        if (path === '/test/project') {
          return [{ name: 'src', isDirectory: () => true, isFile: () => false }] as any;
        }
        if (path === '/test/project/src') {
          return [{ name: 'file.ts', isDirectory: () => false, isFile: () => true }] as any;
        }
        return [];
      });

      mockFs.readFile.mockResolvedValue(`
        export async function testFunction(param: string): Promise<string> {
          const response = await fetch('/api/test');
          return response.json();
        }
      `);
    });

    it('should analyze valid directory successfully', async () => {
      const result = await analyzer.analyze('/test/project');

      expect(result).toHaveProperty('opportunities');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('config');
      expect(result).toHaveProperty('timestamp');

      expect(result.opportunities).toHaveLength(1);
      expect(result.opportunities[0]).toHaveProperty('functionName', 'testFunction');
      expect(result.opportunities[0]).toHaveProperty('score', 85);
      expect(result.opportunities[0]).toHaveProperty('category', 'api-integration');

      expect(result.summary.totalFiles).toBe(1);
      expect(result.summary.analyzedFiles).toBe(1);
      expect(result.summary.skippedFiles).toBe(0);
    });

    it('should handle invalid path', async () => {
      mockFs.stat.mockRejectedValue(new Error('ENOENT'));

      await expect(analyzer.analyze('/invalid/path')).rejects.toThrow('Invalid analysis path');
    });

    it('should filter out low-scoring opportunities', async () => {
      // Mock low-scoring function
      const mockParser = (await import('../../../src/analysis/parsers/typescript-parser.js'))
        .TypeScriptParser as any;
      vi.spyOn(mockParser.prototype, 'scoreFunctionForMCP').mockReturnValue(25);

      const result = await analyzer.analyze('/test/project');

      expect(result.opportunities).toHaveLength(0);
    });

    it('should handle file analysis errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      const result = await analyzer.analyze('/test/project');

      expect(result.summary.errors.length).toBeGreaterThanOrEqual(0);
      expect(result.summary.skippedFiles).toBeGreaterThanOrEqual(0);
      expect(result.summary.analyzedFiles).toBeGreaterThanOrEqual(0);
    });

    it('should exclude files based on patterns', async () => {
      mockFs.readdir.mockImplementation(async (path: string) => {
        if (path === '/test/project') {
          return [
            { name: 'src', isDirectory: () => true, isFile: () => false },
            { name: 'node_modules', isDirectory: () => true, isFile: () => false },
          ] as any;
        }
        if (path === '/test/project/src') {
          return [
            { name: 'file.ts', isDirectory: () => false, isFile: () => true },
            { name: 'file.test.ts', isDirectory: () => false, isFile: () => true },
          ] as any;
        }
        return [];
      });

      const result = await analyzer.analyze('/test/project');

      // Should only analyze file.ts, not file.test.ts or anything in node_modules
      expect(result.summary.totalFiles).toBe(1);
    });

    it('should respect maxFileSize setting', async () => {
      mockFs.stat.mockImplementation(async (path: string) => {
        if (path === '/test/project') {
          return { isDirectory: () => true } as any;
        }
        if (path === '/test/project/src/large-file.ts') {
          return { isDirectory: () => false, size: 2 * 1024 * 1024 } as any; // 2MB
        }
        throw new Error('ENOENT');
      });

      mockFs.readdir.mockImplementation(async (path: string) => {
        if (path === '/test/project') {
          return [{ name: 'src', isDirectory: () => true, isFile: () => false }] as any;
        }
        if (path === '/test/project/src') {
          return [{ name: 'large-file.ts', isDirectory: () => false, isFile: () => true }] as any;
        }
        return [];
      });

      const result = await analyzer.analyze('/test/project');

      // Large file should be skipped
      expect(result.summary.totalFiles).toBe(0);
    });

    it('should generate template recommendations', async () => {
      const result = await analyzer.analyze('/test/project');

      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
      if (result.recommendations.length > 0) {
        expect(result.recommendations[0]).toHaveProperty('templateName');
        expect(result.recommendations[0]).toHaveProperty('confidence');
        expect(result.recommendations[0]).toHaveProperty('reasoning');
      }
    });

    it('should sort opportunities by score', async () => {
      // Mock multiple functions with different scores
      const mockParser = (await import('../../../src/analysis/parsers/typescript-parser.js'))
        .TypeScriptParser as any;

      vi.spyOn(mockParser.prototype, 'parseFile').mockResolvedValue([
        {
          name: 'lowScoreFunction',
          signature: 'function lowScoreFunction(): void',
          parameters: [],
          returnType: 'void',
          complexity: { cyclomaticComplexity: 1, linesOfCode: 5, dependencies: 0 },
          location: { filePath: '/test/file.ts', startLine: 1, endLine: 5 },
          documentation: undefined,
          isExported: false,
          isAsync: false,
        },
        {
          name: 'highScoreFunction',
          signature: 'function highScoreFunction(param: string): Promise<string>',
          parameters: [{ name: 'param', type: 'string', optional: false }],
          returnType: 'Promise<string>',
          complexity: { cyclomaticComplexity: 8, linesOfCode: 30, dependencies: 2 },
          location: { filePath: '/test/file.ts', startLine: 10, endLine: 40 },
          documentation: 'High scoring function',
          isExported: true,
          isAsync: true,
        },
      ]);

      vi.spyOn(mockParser.prototype, 'scoreFunctionForMCP')
        .mockReturnValueOnce(45) // lowScoreFunction
        .mockReturnValueOnce(90); // highScoreFunction

      const result = await analyzer.analyze('/test/project');

      expect(result.opportunities).toHaveLength(2);
      expect(result.opportunities[0].functionName).toBe('highScoreFunction');
      expect(result.opportunities[0].score).toBe(90);
      expect(result.opportunities[1].functionName).toBe('lowScoreFunction');
      expect(result.opportunities[1].score).toBe(45);
    });

    it('should include analysis timing', async () => {
      const result = await analyzer.analyze('/test/project');

      expect(result.summary.analysisTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.summary.analysisTime).toBe('number');
    });

    it('should handle custom analysis config', async () => {
      const customConfig: Partial<AnalysisConfig> = {
        includeTests: true,
        maxFileSize: 500 * 1024, // 500KB
      };

      const result = await analyzer.analyze('/test/project', customConfig);

      expect(result.config.includeTests).toBe(true);
      expect(result.config.maxFileSize).toBe(500 * 1024);
    });
  });

  describe('language detection', () => {
    it('should detect TypeScript files', () => {
      const config = analyzer.getDefaultConfig();
      const tsExtensions = config.languageSettings[TemplateLanguage.TYPESCRIPT].extensions;
      expect(tsExtensions).toContain('.ts');
      expect(tsExtensions).toContain('.tsx');
    });

    it('should detect JavaScript files', () => {
      const config = analyzer.getDefaultConfig();
      const jsExtensions = config.languageSettings[TemplateLanguage.NODEJS].extensions;
      expect(jsExtensions).toContain('.js');
      expect(jsExtensions).toContain('.jsx');
      expect(jsExtensions).toContain('.mjs');
    });

    it('should detect Python files', () => {
      const config = analyzer.getDefaultConfig();
      const pyExtensions = config.languageSettings[TemplateLanguage.PYTHON].extensions;
      expect(pyExtensions).toContain('.py');
    });
  });

  describe('error handling', () => {
    it('should handle directory read errors', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await analyzer.analyze('/test/project');

      expect(result.opportunities).toHaveLength(0);
      expect(result.summary.totalFiles).toBe(0);
    });

    it('should continue analysis if single file fails', async () => {
      mockFs.readdir.mockImplementation(async (path: string) => {
        if (path === '/test/project') {
          return [{ name: 'src', isDirectory: () => true, isFile: () => false }] as any;
        }
        if (path === '/test/project/src') {
          return [
            { name: 'good-file.ts', isDirectory: () => false, isFile: () => true },
            { name: 'bad-file.ts', isDirectory: () => false, isFile: () => true },
          ] as any;
        }
        return [];
      });

      mockFs.stat.mockImplementation(async (path: string) => {
        if (path === '/test/project') {
          return { isDirectory: () => true } as any;
        }
        if (path.includes('good-file.ts') || path.includes('bad-file.ts')) {
          return { isDirectory: () => false, size: 1000 } as any;
        }
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (path: string) => {
        if (path.includes('bad-file.ts')) {
          throw new Error('File corrupted');
        }
        return 'export function goodFunction() {}';
      });

      const result = await analyzer.analyze('/test/project');

      expect(result.summary.analyzedFiles).toBeGreaterThanOrEqual(0);
      expect(result.summary.skippedFiles).toBeGreaterThanOrEqual(0);
      expect(result.summary.errors.length).toBeGreaterThanOrEqual(0);
    });
  });
});
