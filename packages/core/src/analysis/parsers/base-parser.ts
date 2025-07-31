/**
 * Base parser interface and utilities for language-specific code analysis
 */

import { promises as fs } from 'fs';

import { logger } from '../../logger.js';
import {
  type FunctionMetadata,
  type DetectedPattern,
  type MCPOpportunity,
  type OpportunityCategory,
  TemplateLanguage,
} from '../../types.js';

/**
 * Base parser abstract class
 */
export abstract class BaseParser {
  protected language: TemplateLanguage;

  constructor(language: TemplateLanguage) {
    this.language = language;
  }

  /**
   * Parse a file and extract function metadata
   */
  abstract parseFile(filePath: string, content: string): Promise<FunctionMetadata[]>;

  /**
   * Detect patterns in code that indicate MCP suitability
   */
  abstract detectPatterns(
    content: string,
    functions: FunctionMetadata[],
  ): Promise<DetectedPattern[]>;

  /**
   * Score a function for MCP suitability
   */
  protected scoreFunctionForMCP(func: FunctionMetadata, patterns: DetectedPattern[]): number {
    let score = 0;

    // Base score for exported functions
    if (func.isExported) {
      score += 20;
    }

    // Score based on complexity (sweet spot is medium complexity)
    const complexity = func.complexity.cyclomaticComplexity;
    if (complexity >= 3 && complexity <= 10) {
      score += 25; // Good complexity for MCP tools
    } else if (complexity > 10 && complexity <= 20) {
      score += 15; // Still usable but more complex
    } else if (complexity < 3) {
      score += 5; // Too simple, might not be worth it
    }

    // Score based on lines of code
    const loc = func.complexity.linesOfCode;
    if (loc >= 10 && loc <= 100) {
      score += 20; // Good size for MCP tools
    } else if (loc > 100 && loc <= 200) {
      score += 10; // Large but manageable
    }

    // Score based on parameters (clear inputs are good)
    const paramCount = func.parameters.length;
    if (paramCount >= 1 && paramCount <= 5) {
      score += 15; // Good number of parameters
    } else if (paramCount === 0) {
      score += 5; // No params might be less useful
    }

    // Score based on detected patterns
    for (const pattern of patterns) {
      switch (pattern.type) {
        case 'api-call':
          score += pattern.confidence * 30; // API calls are great for MCP tools
          break;
        case 'file-operation':
          score += pattern.confidence * 25; // File operations are useful
          break;
        case 'database-query':
          score += pattern.confidence * 25; // Database operations are valuable
          break;
        case 'validation-logic':
          score += pattern.confidence * 20; // Validation is useful
          break;
        case 'external-dependency':
          score += pattern.confidence * 15; // External deps can be good
          break;
      }
    }

    // Score based on documentation
    if (func.documentation && func.documentation.length > 20) {
      score += 10; // Well-documented functions are better
    }

    // Score based on async nature (async functions often do useful work)
    if (func.isAsync) {
      score += 15;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Categorize function based on patterns
   */
  protected categorizeFunctionFromPatterns(patterns: DetectedPattern[]): OpportunityCategory {
    const patternScores = patterns.reduce(
      (acc, pattern) => {
        acc[pattern.type] = (acc[pattern.type] || 0) + pattern.confidence;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topPattern = Object.entries(patternScores).sort(([, a], [, b]) => b - a)[0];

    if (!topPattern) {
      return 'utility';
    }

    switch (topPattern[0]) {
      case 'api-call':
        return 'api-integration';
      case 'file-operation':
        return 'file-processing';
      case 'database-query':
        return 'api-integration';
      case 'validation-logic':
        return 'validation';
      default:
        return 'utility';
    }
  }

  /**
   * Generate MCP opportunity from function and patterns
   */
  protected async generateOpportunity(
    func: FunctionMetadata,
    patterns: DetectedPattern[],
    score: number,
  ): Promise<MCPOpportunity> {
    const category = this.categorizeFunctionFromPatterns(patterns);

    // Generate reasoning
    const reasoning: string[] = [];

    if (func.isExported) {
      reasoning.push('Function is exported and accessible');
    }

    if (func.parameters.length > 0) {
      reasoning.push(
        `Has ${func.parameters.length} clear input parameter${func.parameters.length > 1 ? 's' : ''}`,
      );
    }

    if (func.isAsync) {
      reasoning.push('Async function likely performs I/O operations');
    }

    patterns.forEach((pattern) => {
      if (pattern.confidence > 0.7) {
        reasoning.push(`Contains ${pattern.type}: ${pattern.description}`);
      }
    });

    // Suggest template based on language and complexity
    let suggestedTemplate = 'basic';
    if (this.language === TemplateLanguage.TYPESCRIPT) {
      suggestedTemplate = score > 70 ? 'typescript-advanced' : 'basic';
    } else if (this.language === TemplateLanguage.PYTHON) {
      suggestedTemplate = 'python-basic';
    }

    // Generate tool name from function name
    const toolName = func.name
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
      .replace(/_/g, '-');

    return {
      id: `${func.location.filePath}:${func.name}:${func.location.startLine}`,
      functionName: func.name,
      filePath: func.location.filePath,
      language: this.language,
      score,
      category,
      description: func.documentation || `${category} function from ${func.name}`,
      suggestedTemplate,
      reasoning,
      implementation: {
        toolName,
        toolDescription: func.documentation || `Execute ${func.name} function`,
        inputSchema: this.generateInputSchema(func),
        outputDescription: func.returnType || 'Function execution result',
        dependencies: this.extractDependencies(patterns),
        complexity: this.getComplexityLevel(func.complexity.cyclomaticComplexity),
        estimatedEffort: this.getEffortLevel(score, func.complexity.cyclomaticComplexity),
      },
      function: func,
      patterns,
    };
  }

  /**
   * Generate input schema from function parameters
   */
  private generateInputSchema(func: FunctionMetadata): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const param of func.parameters) {
      properties[param.name] = {
        type: this.mapTypeToJsonSchema(param.type),
        description: `${param.name} parameter`,
      };

      if (!param.optional) {
        required.push(param.name);
      }
    }

    return {
      type: 'object',
      properties,
      required,
    };
  }

  /**
   * Map programming language types to JSON schema types
   */
  private mapTypeToJsonSchema(type?: string): string {
    if (!type) return 'string';

    const lowerType = type.toLowerCase();

    if (lowerType.includes('string') || lowerType.includes('str')) {
      return 'string';
    } else if (
      lowerType.includes('number') ||
      lowerType.includes('int') ||
      lowerType.includes('float')
    ) {
      return 'number';
    } else if (lowerType.includes('boolean') || lowerType.includes('bool')) {
      return 'boolean';
    } else if (lowerType.includes('array') || lowerType.includes('list')) {
      return 'array';
    } else if (lowerType.includes('object') || lowerType.includes('dict')) {
      return 'object';
    }

    return 'string'; // Default fallback
  }

  /**
   * Extract dependencies from patterns
   */
  private extractDependencies(patterns: DetectedPattern[]): string[] {
    const dependencies: string[] = [];

    patterns.forEach((pattern) => {
      pattern.evidence.forEach((evidence) => {
        // Simple dependency extraction (would be more sophisticated in production)
        const imports = evidence.match(/(?:import|require|from)\s+['"]([^'"]+)['"]/g);
        if (imports) {
          imports.forEach((imp) => {
            const match = imp.match(/['"]([^'"]+)['"]/);
            if (match?.[1]) {
              dependencies.push(match[1]);
            }
          });
        }
      });
    });

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Get complexity level description
   */
  private getComplexityLevel(cyclomaticComplexity: number): 'low' | 'medium' | 'high' {
    if (cyclomaticComplexity <= 5) return 'low';
    if (cyclomaticComplexity <= 15) return 'medium';
    return 'high';
  }

  /**
   * Get estimated effort level
   */
  private getEffortLevel(score: number, cyclomaticComplexity: number): 'low' | 'medium' | 'high' {
    if (score > 80 && cyclomaticComplexity <= 10) return 'low';
    if (score > 60 && cyclomaticComplexity <= 20) return 'medium';
    return 'high';
  }

  /**
   * Common utility to read file content
   */
  protected async readFileContent(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      logger.error(`Failed to read file: ${filePath}`, { error });
      throw error;
    }
  }
}
