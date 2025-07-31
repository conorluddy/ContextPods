/**
 * Analyze codebase tool for identifying MCP opportunities
 */

import { promises as fs } from 'fs';
import { resolve } from 'path';

import { DefaultCodebaseAnalyzer, logger } from '@context-pods/core';

import { BaseTool, type ToolResult } from './base-tool.js';

/**
 * Arguments for analyze-codebase tool
 */
interface AnalyzeCodebaseArgs extends Record<string, unknown> {
  path: string;
  languages?: string[];
  excludePatterns?: string[];
  minScore?: number;
  includeTests?: boolean;
  outputFormat?: 'detailed' | 'summary' | 'json';
  maxResults?: number;
}

/**
 * Analyze codebase tool implementation
 */
export class AnalyzeCodebaseTool extends BaseTool {
  private analyzer: DefaultCodebaseAnalyzer;

  constructor() {
    super('analyze-codebase');
    this.analyzer = new DefaultCodebaseAnalyzer();
  }

  /**
   * Validate analyze-codebase arguments
   */
  protected async validateArguments(args: unknown): Promise<string | null> {
    const typedArgs = args as AnalyzeCodebaseArgs;

    // Validate required arguments
    let error = this.validateStringArgument(typedArgs, 'path', true, 1, 500);
    if (error) return error;

    // Validate optional arguments
    if (typedArgs.languages !== undefined) {
      error = this.validateArgument(typedArgs, 'languages', 'object', false);
      if (error) return error;

      if (Array.isArray(typedArgs.languages)) {
        const supportedLanguages = [
          'typescript',
          'javascript',
          'python',
          'rust',
          'shell',
          'go',
          'java',
        ];
        for (const lang of typedArgs.languages) {
          if (typeof lang !== 'string' || !supportedLanguages.includes(lang)) {
            return `Invalid language: ${lang}. Supported languages: ${supportedLanguages.join(', ')}`;
          }
        }
      } else {
        return 'languages must be an array of strings';
      }
    }

    if (typedArgs.excludePatterns !== undefined) {
      error = this.validateArgument(typedArgs, 'excludePatterns', 'object', false);
      if (error) return error;

      if (!Array.isArray(typedArgs.excludePatterns)) {
        return 'excludePatterns must be an array of strings';
      }
    }

    if (typedArgs.minScore !== undefined) {
      error = this.validateArgument(typedArgs, 'minScore', 'number', false);
      if (error) return error;

      const minScore = Number(typedArgs.minScore);
      if (minScore < 0 || minScore > 100) {
        return 'minScore must be between 0 and 100';
      }
    }

    if (typedArgs.includeTests !== undefined) {
      error = this.validateArgument(typedArgs, 'includeTests', 'boolean', false);
      if (error) return error;
    }

    if (typedArgs.outputFormat !== undefined) {
      const validFormats = ['detailed', 'summary', 'json'];
      if (!validFormats.includes(typedArgs.outputFormat as string)) {
        return `Invalid outputFormat. Must be one of: ${validFormats.join(', ')}`;
      }
    }

    if (typedArgs.maxResults !== undefined) {
      error = this.validateArgument(typedArgs, 'maxResults', 'number', false);
      if (error) return error;

      const maxResults = Number(typedArgs.maxResults);
      if (maxResults < 1 || maxResults > 100) {
        return 'maxResults must be between 1 and 100';
      }
    }

    // Validate path exists and is directory
    try {
      const absolutePath = resolve(typedArgs.path);
      const stats = await fs.stat(absolutePath);
      if (!stats.isDirectory()) {
        return `Path is not a directory: ${typedArgs.path}`;
      }
    } catch (error) {
      return `Invalid path: ${typedArgs.path}. ${error instanceof Error ? error.message : String(error)}`;
    }

    return null;
  }

  /**
   * Execute analyze-codebase tool
   */
  protected async execute(args: unknown): Promise<ToolResult> {
    const typedArgs = args as AnalyzeCodebaseArgs;
    const warnings: string[] = [];

    try {
      logger.info('Starting codebase analysis', {
        path: typedArgs.path,
        options: {
          languages: typedArgs.languages,
          minScore: typedArgs.minScore,
          outputFormat: typedArgs.outputFormat,
        },
      });

      // Resolve path
      const absolutePath = resolve(typedArgs.path);

      // Prepare analysis configuration
      const analysisConfig = {
        maxFileSize: 1024 * 1024, // 1MB
        excludePatterns: [
          ...this.analyzer.getDefaultConfig().excludePatterns,
          ...(typedArgs.excludePatterns || []),
        ],
        includeTests: typedArgs.includeTests || false,
      };

      // Run analysis
      const result = await this.analyzer.analyze(absolutePath, analysisConfig);

      // Filter results
      const minScore = typedArgs.minScore || 50;
      const filteredOpportunities = result.opportunities
        .filter((opp) => opp.score >= minScore)
        .slice(0, typedArgs.maxResults || 10);

      // Filter by languages if specified
      let finalOpportunities = filteredOpportunities;
      if (typedArgs.languages && typedArgs.languages.length > 0) {
        finalOpportunities = filteredOpportunities.filter((opp) =>
          typedArgs.languages!.includes(opp.language),
        );
      }

      // Add warnings from analysis
      if (result.summary.warnings.length > 0) {
        warnings.push(...result.summary.warnings);
      }

      if (result.summary.errors.length > 0) {
        warnings.push(`Analysis encountered ${result.summary.errors.length} errors`);
      }

      // Format output based on requested format
      const outputFormat = typedArgs.outputFormat || 'detailed';
      const formattedResult = this.formatOutput(
        {
          ...result,
          opportunities: finalOpportunities,
        },
        outputFormat,
      );

      logger.info('Codebase analysis completed', {
        totalOpportunities: finalOpportunities.length,
        analysisTime: result.summary.analysisTime,
        languageBreakdown: result.summary.languageBreakdown,
      });

      return {
        success: true,
        data: formattedResult,
        warnings,
      };
    } catch (error) {
      logger.error('Codebase analysis failed', { error, args });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Format analysis output based on requested format
   */
  private formatOutput(result: any, format: 'detailed' | 'summary' | 'json'): string {
    if (format === 'json') {
      return JSON.stringify(result, null, 2);
    }

    if (format === 'summary') {
      return this.formatSummaryOutput(result);
    }

    return this.formatDetailedOutput(result);
  }

  /**
   * Format detailed output
   */
  private formatDetailedOutput(result: any): string {
    let output = '';

    // Header
    output += '🔍 Codebase Analysis Results\n';
    output += '='.repeat(50) + '\n\n';

    // Summary
    output += '📊 Analysis Summary:\n';
    output += `- Total files scanned: ${result.summary.totalFiles}\n`;
    output += `- Files analyzed: ${result.summary.analyzedFiles}\n`;
    output += `- Files skipped: ${result.summary.skippedFiles}\n`;
    output += `- Analysis time: ${result.summary.analysisTime}ms\n`;
    output += `- Opportunities found: ${result.opportunities.length}\n\n`;

    // Language breakdown
    if (Object.keys(result.summary.languageBreakdown).length > 0) {
      output += '📋 Language Breakdown:\n';
      for (const [language, count] of Object.entries(result.summary.languageBreakdown)) {
        const fileCount = Number(count);
        if (fileCount > 0) {
          output += `- ${language}: ${fileCount} files\n`;
        }
      }
      output += '\n';
    }

    // Top opportunities
    if (result.opportunities.length > 0) {
      output += '🎯 MCP Opportunities (sorted by score):\n\n';

      result.opportunities.forEach((opp: any, index: number) => {
        output += `${index + 1}. ${opp.functionName} (Score: ${opp.score})\n`;
        output += `   📁 File: ${opp.filePath}\n`;
        output += `   🏷️  Category: ${opp.category}\n`;
        output += `   📝 Description: ${opp.description}\n`;
        output += `   🎨 Suggested Template: ${opp.suggestedTemplate}\n`;

        if (opp.reasoning.length > 0) {
          output += `   💡 Reasoning:\n`;
          opp.reasoning.forEach((reason: string) => {
            output += `      • ${reason}\n`;
          });
        }

        output += `   🔧 Implementation:\n`;
        output += `      • Tool Name: ${opp.implementation.toolName}\n`;
        output += `      • Complexity: ${opp.implementation.complexity}\n`;
        output += `      • Estimated Effort: ${opp.implementation.estimatedEffort}\n`;

        if (opp.implementation.dependencies.length > 0) {
          output += `      • Dependencies: ${opp.implementation.dependencies.join(', ')}\n`;
        }

        output += '\n';
      });
    } else {
      output += '⚠️  No MCP opportunities found with the current criteria.\n';
      output += 'Try lowering the minimum score or adjusting the language filters.\n\n';
    }

    // Template recommendations
    if (result.recommendations.length > 0) {
      output += '🎯 Template Recommendations:\n';
      result.recommendations.forEach((rec: any, index: number) => {
        output += `${index + 1}. ${rec.templateName} (Confidence: ${Math.round(rec.confidence * 100)}%)\n`;
        rec.reasoning.forEach((reason: string) => {
          output += `   • ${reason}\n`;
        });
        output += '\n';
      });
    }

    return output;
  }

  /**
   * Format summary output
   */
  private formatSummaryOutput(result: any): string {
    let output = '';

    output += `🔍 Analysis Summary: ${result.opportunities.length} opportunities found\n`;
    output += `📊 ${result.summary.analyzedFiles}/${result.summary.totalFiles} files analyzed in ${result.summary.analysisTime}ms\n\n`;

    if (result.opportunities.length > 0) {
      output += 'Top 5 Opportunities:\n';
      result.opportunities.slice(0, 5).forEach((opp: any, index: number) => {
        output += `${index + 1}. ${opp.functionName} (${opp.score}) - ${opp.category}\n`;
      });
    } else {
      output += 'No opportunities found. Try adjusting your criteria.\n';
    }

    return output;
  }
}
