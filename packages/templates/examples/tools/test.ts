/**
 * Tool Implementation Tests
 * 
 * Comprehensive tests for the example tool implementations demonstrating
 * proper testing patterns for MCP tools.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exampleToolHandlers, demonstrateTools } from './example.js';

describe('Example Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Calculator Tool', () => {
    const calculateHandler = exampleToolHandlers.get('calculate')!;

    it('should perform addition correctly', async () => {
      const result = await calculateHandler({
        operation: 'add',
        a: 5,
        b: 3,
      });

      expect(result.result).toBe(8);
      expect(result.expression).toBe('5 + 3 = 8');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should perform subtraction correctly', async () => {
      const result = await calculateHandler({
        operation: 'subtract',
        a: 10,
        b: 4,
      });

      expect(result.result).toBe(6);
      expect(result.expression).toBe('10 - 4 = 6');
    });

    it('should perform multiplication correctly', async () => {
      const result = await calculateHandler({
        operation: 'multiply',
        a: 7,
        b: 6,
      });

      expect(result.result).toBe(42);
      expect(result.expression).toBe('7 × 6 = 42');
    });

    it('should perform division correctly', async () => {
      const result = await calculateHandler({
        operation: 'divide',
        a: 15,
        b: 3,
      });

      expect(result.result).toBe(5);
      expect(result.expression).toBe('15 ÷ 3 = 5');
    });

    it('should handle division by zero', async () => {
      await expect(calculateHandler({
        operation: 'divide',
        a: 10,
        b: 0,
      })).rejects.toThrow('Division by zero is not allowed');
    });

    it('should handle decimal calculations', async () => {
      const result = await calculateHandler({
        operation: 'divide',
        a: 7,
        b: 3,
      });

      expect(result.result).toBeCloseTo(2.333, 3);
    });
  });

  describe('Text Analysis Tool', () => {
    const analyzeTextHandler = exampleToolHandlers.get('analyze-text')!;

    it('should analyze basic text metrics', async () => {
      const result = await analyzeTextHandler({
        text: 'Hello world! This is a test.',
      });

      expect(result.wordCount).toBe(6);
      expect(result.characterCount).toBe(28);
      expect(result.sentenceCount).toBe(2);
      expect(result.sentiment).toHaveProperty('score');
      expect(result.sentiment).toHaveProperty('label');
      expect(Array.isArray(result.keywords)).toBe(true);
    });

    it('should detect positive sentiment', async () => {
      const result = await analyzeTextHandler({
        text: 'This is amazing! Great work and excellent results.',
      });

      expect(result.sentiment.score).toBeGreaterThan(0);
      expect(result.sentiment.label).toBe('positive');
    });

    it('should detect negative sentiment', async () => {
      const result = await analyzeTextHandler({
        text: 'This is terrible and awful. Bad results and horrible experience.',
      });

      expect(result.sentiment.score).toBeLessThan(0);
      expect(result.sentiment.label).toBe('negative');
    });

    it('should include readability metrics when requested', async () => {
      const result = await analyzeTextHandler({
        text: 'Simple text for testing readability calculation.',
        includeReadability: true,
      });

      expect(result.readability).toBeDefined();
      expect(result.readability!.fleschScore).toBeTypeOf('number');
      expect(result.readability!.grade).toBeTypeOf('string');
    });

    it('should extract keywords correctly', async () => {
      const result = await analyzeTextHandler({
        text: 'Machine learning algorithms process data efficiently. Data processing with machine learning.',
      });

      expect(result.keywords).toContain('machine');
      expect(result.keywords).toContain('learning');
      expect(result.keywords).toContain('data');
      expect(result.keywords).not.toContain('with'); // Common word should be filtered
    });

    it('should handle empty text gracefully', async () => {
      await expect(analyzeTextHandler({
        text: '',
      })).rejects.toThrow();
    });
  });

  describe('Code Generator Tool', () => {
    const generateCodeHandler = exampleToolHandlers.get('generate-code')!;

    it('should generate TypeScript function', async () => {
      const result = await generateCodeHandler({
        language: 'typescript',
        template: 'function',
        name: 'testFunction',
        parameters: [
          { name: 'param1', type: 'string', optional: false },
          { name: 'param2', type: 'number', optional: true },
        ],
        description: 'Test function description',
      });

      expect(result.code).toContain('export function testFunction');
      expect(result.code).toContain('param1: string');
      expect(result.code).toContain('param2?: number');
      expect(result.code).toContain('Test function description');
      expect(result.language).toBe('typescript');
      expect(result.template).toBe('function');
    });

    it('should generate Python class', async () => {
      const result = await generateCodeHandler({
        language: 'python',
        template: 'class',
        name: 'TestClass',
        description: 'Test class description',
      });

      expect(result.code).toContain('class TestClass');
      expect(result.code).toContain('def __init__');
      expect(result.code).toContain('Test class description');
      expect(result.metadata.estimatedComplexity).toBe('medium');
    });

    it('should generate JavaScript function', async () => {
      const result = await generateCodeHandler({
        language: 'javascript',
        template: 'function',
        name: 'jsFunction',
      });

      expect(result.code).toContain('function jsFunction');
      expect(result.code).toContain('module.exports');
      expect(result.language).toBe('javascript');
    });

    it('should generate Rust code with high complexity', async () => {
      const result = await generateCodeHandler({
        language: 'rust',
        template: 'function',
        name: 'rust_function',
      });

      expect(result.code).toContain('pub fn rust_function');
      expect(result.metadata.estimatedComplexity).toBe('high');
    });

    it('should count lines correctly', async () => {
      const result = await generateCodeHandler({
        language: 'typescript',
        template: 'class',
        name: 'MultiLineClass',
      });

      const actualLines = result.code.split('\n').length;
      expect(result.metadata.lineCount).toBe(actualLines);
    });

    it('should handle unsupported language', async () => {
      await expect(generateCodeHandler({
        language: 'cobol' as any,
        template: 'function',
        name: 'test',
      })).rejects.toThrow('Unsupported language');
    });
  });

  describe('Integration Tests', () => {
    it('should demonstrate all tools without errors', async () => {
      // Mock console.log to avoid output during tests
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await expect(demonstrateTools()).resolves.not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔧 Tool Examples Demonstration\n');
      consoleSpy.mockRestore();
    });

    it('should have all required tool handlers', () => {
      expect(exampleToolHandlers.has('calculate')).toBe(true);
      expect(exampleToolHandlers.has('analyze-text')).toBe(true);
      expect(exampleToolHandlers.has('generate-code')).toBe(true);
    });

    it('should validate tool handler signatures', async () => {
      for (const [name, handler] of exampleToolHandlers) {
        expect(typeof handler).toBe('function');
        expect(handler.constructor.name).toBe('AsyncFunction');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle calculator errors gracefully', async () => {
      const calculateHandler = exampleToolHandlers.get('calculate')!;
      
      await expect(calculateHandler({
        operation: 'invalid' as any,
        a: 1,
        b: 2,
      })).rejects.toThrow('Calculation failed');
    });

    it('should handle text analysis errors gracefully', async () => {
      const analyzeTextHandler = exampleToolHandlers.get('analyze-text')!;
      
      // Test with invalid input that might cause processing errors
      const result = await analyzeTextHandler({
        text: 'Valid text for error handling test',
        language: 'invalid' as any, // Invalid language should not break the tool
      });

      expect(result).toBeDefined();
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should handle code generation errors gracefully', async () => {
      const generateCodeHandler = exampleToolHandlers.get('generate-code')!;
      
      await expect(generateCodeHandler({
        language: 'nonexistent' as any,
        template: 'function',
        name: 'test',
      })).rejects.toThrow('Code generation failed');
    });
  });
});