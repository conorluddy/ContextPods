/**
 * Smoke test for analyze-codebase tool
 * Tests core functionality without complex mocking
 */

import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { AnalyzeCodebaseTool } from '../../src/tools/analyze-codebase.js';

describe('AnalyzeCodebase Smoke Test', () => {
  let tool: AnalyzeCodebaseTool;
  let tempDir: string;

  beforeEach(async () => {
    tool = new AnalyzeCodebaseTool();

    // Create a temporary directory for test files
    tempDir = join(tmpdir(), `context-pods-smoke-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  it('should successfully analyze a TypeScript file with API calls', async () => {
    // Create a test TypeScript file with API functionality
    const testFile = join(tempDir, 'api-service.ts');
    const content = `
      import axios from 'axios';
      
      /**
       * Fetches user data from API
       */
      export async function getUserData(userId: string): Promise<any> {
        const response = await axios.get(\`/api/users/\${userId}\`);
        return response.data;
      }
      
      export function simpleHelper(): string {
        return 'helper';
      }
    `;

    await fs.writeFile(testFile, content);

    // Run the analysis
    const result = await tool.safeExecute({
      path: tempDir,
      outputFormat: 'json',
      minScore: 30,
    });

    // Basic structure validation
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content[0]).toBeDefined();
    expect(result.content[0].type).toBe('text');

    // Should not contain error markers
    expect(result.content[0].text).not.toContain('❌ Error');

    // Should be valid JSON
    let jsonResult;
    expect(() => {
      jsonResult = JSON.parse(result.content[0].text);
    }).not.toThrow();

    // Should have the expected structure
    expect(jsonResult).toHaveProperty('opportunities');
    expect(jsonResult).toHaveProperty('summary');
    expect(jsonResult).toHaveProperty('recommendations');

    // Should find at least one opportunity (getUserData function)
    expect(Array.isArray(jsonResult.opportunities)).toBe(true);
    expect(jsonResult.opportunities.length).toBeGreaterThan(0);

    // Check that analysis found the main API function
    const functionNames = jsonResult.opportunities.map((opp: any) => opp.functionName);
    expect(functionNames).toContain('getUserData');

    // Verify opportunity structure
    const apiFunction = jsonResult.opportunities.find(
      (opp: any) => opp.functionName === 'getUserData',
    );
    expect(apiFunction).toBeDefined();
    expect(apiFunction).toHaveProperty('score');
    expect(apiFunction).toHaveProperty('category');
    expect(apiFunction).toHaveProperty('description');
    expect(apiFunction).toHaveProperty('suggestedTemplate');
    expect(apiFunction).toHaveProperty('implementation');

    // Score should be reasonable for an exported async API function
    expect(apiFunction.score).toBeGreaterThan(50);

    // Should have proper category
    expect(apiFunction.category).toBe('api-integration');
  });

  it('should handle empty directories gracefully', async () => {
    const result = await tool.safeExecute({
      path: tempDir,
      outputFormat: 'json',
    });

    expect(result.content).toBeDefined();
    expect(result.content[0].text).not.toContain('❌ Error');

    const jsonResult = JSON.parse(result.content[0].text);
    expect(jsonResult.opportunities).toEqual([]);
    expect(jsonResult.summary.totalFiles).toBe(0);
  });

  it('should handle invalid paths with proper error messages', async () => {
    const result = await tool.safeExecute({
      path: '/nonexistent/path/12345',
      outputFormat: 'json',
    });

    expect(result.content).toBeDefined();
    expect(result.content[0].text).toContain('❌ Error');
    expect(result.content[0].text).toContain('Invalid path');
  });

  it('should validate input parameters', async () => {
    // Test missing required path
    const missingPath = await tool.safeExecute({});
    expect(missingPath.content[0].text).toContain('❌ Error');
    expect(missingPath.content[0].text).toContain('path');

    // Test invalid score range
    const invalidScore = await tool.safeExecute({
      path: tempDir,
      minScore: 150,
    });
    expect(invalidScore.content[0].text).toContain('❌ Error');
    expect(invalidScore.content[0].text).toContain('minScore');
  });

  it('should support different output formats', async () => {
    // Create a simple test file
    const testFile = join(tempDir, 'test.ts');
    await fs.writeFile(
      testFile,
      `
      export async function testApi(): Promise<string> {
        const data = await fetch('/api/test');
        return data.text();
      }
    `,
    );

    // Test detailed format
    const detailedResult = await tool.safeExecute({
      path: tempDir,
      outputFormat: 'detailed',
    });

    expect(detailedResult.content[0].text).toContain('Codebase Analysis Results');
    expect(detailedResult.content[0].text).toContain('testApi');

    // Test summary format
    const summaryResult = await tool.safeExecute({
      path: tempDir,
      outputFormat: 'summary',
    });

    expect(summaryResult.content[0].text).toContain('Analysis Summary');
    expect(summaryResult.content[0].text).toContain('testApi');

    // Test JSON format
    const jsonResult = await tool.safeExecute({
      path: tempDir,
      outputFormat: 'json',
    });

    expect(() => JSON.parse(jsonResult.content[0].text)).not.toThrow();
  });
});
