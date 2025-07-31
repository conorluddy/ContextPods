/**
 * Performance test for analyze-codebase tool
 * Tests performance with real codebase
 */

import { join } from 'path';

import { describe, it, expect } from 'vitest';

import { AnalyzeCodebaseTool } from '../../src/tools/analyze-codebase.js';

describe('AnalyzeCodebase Performance Test', () => {
  it('should analyze the Context-Pods project in reasonable time', async () => {
    const tool = new AnalyzeCodebaseTool();
    const projectRoot = join(process.cwd(), '../..');

    const startTime = Date.now();

    const result = await tool.safeExecute({
      path: projectRoot,
      outputFormat: 'json',
      minScore: 60,
      maxResults: 20,
    });

    const duration = Date.now() - startTime;

    // Should complete within 30 seconds for a reasonably sized project
    expect(duration).toBeLessThan(30000);

    // Should not error
    expect(result.content[0].text).not.toContain('❌ Error');

    // Should find some opportunities in this codebase
    const jsonResult = JSON.parse(result.content[0].text);
    expect(jsonResult.opportunities.length).toBeGreaterThan(0);

    // Performance info available in jsonResult.summary
    expect(jsonResult.summary.analysisTime).toBeGreaterThan(0);
    expect(jsonResult.summary.analyzedFiles).toBeGreaterThan(0);
  }, 35000); // 35 second timeout
});
