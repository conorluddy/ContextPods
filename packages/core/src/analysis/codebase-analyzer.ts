/**
 * Main codebase analyzer that orchestrates the analysis process
 */

import { promises as fs } from 'fs';
import { join, relative, extname } from 'path';

import { logger } from '../logger.js';
import {
  type CodebaseAnalyzer,
  type CodebaseAnalysisResult,
  type AnalysisConfig,
  type AnalysisSummary,
  type MCPOpportunity,
  type TemplateRecommendation,
  type DetectedPattern,
  TemplateLanguage,
} from '../types.js';

/**
 * Default analysis configuration
 */
const DEFAULT_CONFIG: AnalysisConfig = {
  maxFileSize: 1024 * 1024, // 1MB
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**',
    '**/*.min.js',
    '**/*.d.ts',
    '**/test/**',
    '**/tests/**',
    '**/__tests__/**',
    '**/*.test.*',
    '**/*.spec.*',
  ],
  includeTests: false,
  languageSettings: {
    [TemplateLanguage.TYPESCRIPT]: {
      extensions: ['.ts', '.tsx'],
      excludePatterns: ['**/*.d.ts'],
      parsingStrategy: 'ast',
      complexity: {
        maxCyclomaticComplexity: 20,
        maxLinesOfCode: 200,
      },
    },
    [TemplateLanguage.NODEJS]: {
      extensions: ['.js', '.jsx', '.mjs'],
      excludePatterns: ['**/*.min.js'],
      parsingStrategy: 'ast',
      complexity: {
        maxCyclomaticComplexity: 20,
        maxLinesOfCode: 200,
      },
    },
    [TemplateLanguage.PYTHON]: {
      extensions: ['.py'],
      excludePatterns: ['**/__pycache__/**'],
      parsingStrategy: 'regex',
      complexity: {
        maxCyclomaticComplexity: 15,
        maxLinesOfCode: 150,
      },
    },
    [TemplateLanguage.RUST]: {
      extensions: ['.rs'],
      excludePatterns: ['**/target/**'],
      parsingStrategy: 'regex',
      complexity: {
        maxCyclomaticComplexity: 25,
        maxLinesOfCode: 300,
      },
    },
    [TemplateLanguage.SHELL]: {
      extensions: ['.sh', '.bash', '.zsh'],
      excludePatterns: [],
      parsingStrategy: 'regex',
      complexity: {
        maxCyclomaticComplexity: 10,
        maxLinesOfCode: 100,
      },
    },
  },
};

/**
 * Default codebase analyzer implementation
 */
export class DefaultCodebaseAnalyzer implements CodebaseAnalyzer {
  private config: AnalysisConfig;

  constructor(config?: Partial<AnalysisConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze a codebase directory
   */
  async analyze(
    path: string,
    config: Partial<AnalysisConfig> = {},
  ): Promise<CodebaseAnalysisResult> {
    const startTime = Date.now();
    const analysisConfig = { ...this.config, ...config };

    logger.info('Starting codebase analysis', { path, config: analysisConfig });

    try {
      // Validate path
      const isValid = await this.validatePath(path);
      if (!isValid) {
        throw new Error(`Invalid analysis path: ${path}`);
      }

      // Initialize summary
      const summary: AnalysisSummary = {
        totalFiles: 0,
        analyzedFiles: 0,
        skippedFiles: 0,
        languageBreakdown: {
          [TemplateLanguage.NODEJS]: 0,
          [TemplateLanguage.TYPESCRIPT]: 0,
          [TemplateLanguage.PYTHON]: 0,
          [TemplateLanguage.RUST]: 0,
          [TemplateLanguage.SHELL]: 0,
        },
        analysisTime: 0,
        errors: [],
        warnings: [],
      };

      // Discover files
      const files = await this.discoverFiles(path, analysisConfig);
      summary.totalFiles = files.length;

      logger.info(`Discovered ${files.length} files for analysis`);

      // Analyze files by language
      const opportunities: MCPOpportunity[] = [];
      const recommendations: TemplateRecommendation[] = [];

      for (const filePath of files) {
        try {
          const language = this.detectLanguageFromPath(filePath);
          if (!language) {
            summary.skippedFiles++;
            continue;
          }

          // Update language breakdown
          summary.languageBreakdown[language] = (summary.languageBreakdown[language] || 0) + 1;

          // Analyze file
          const fileOpportunities = await this.analyzeFile(filePath, language, analysisConfig);
          opportunities.push(...fileOpportunities);
          summary.analyzedFiles++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          summary.errors.push(`Error analyzing ${filePath}: ${errorMessage}`);
          summary.skippedFiles++;
          logger.warn(`Failed to analyze file: ${filePath}`, { error: errorMessage });
        }
      }

      // Generate template recommendations
      const templateRecommendations = this.generateTemplateRecommendations(opportunities);
      recommendations.push(...templateRecommendations);

      // Calculate analysis time
      summary.analysisTime = Date.now() - startTime;

      logger.info('Codebase analysis completed', {
        totalOpportunities: opportunities.length,
        analysisTime: summary.analysisTime,
        languageBreakdown: summary.languageBreakdown,
      });

      return {
        opportunities: opportunities.sort((a, b) => b.score - a.score), // Sort by score descending
        summary,
        recommendations,
        config: analysisConfig,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Codebase analysis failed', { error, path });
      throw error;
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): AnalysisConfig {
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Validate analysis path
   */
  async validatePath(path: string): Promise<boolean> {
    try {
      const stats = await fs.stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): TemplateLanguage[] {
    return Object.keys(this.config.languageSettings) as TemplateLanguage[];
  }

  /**
   * Discover files in the codebase
   */
  private async discoverFiles(basePath: string, config: AnalysisConfig): Promise<string[]> {
    const files: string[] = [];
    const stack: string[] = [basePath];

    while (stack.length > 0) {
      const currentPath = stack.pop();
      if (!currentPath) continue;

      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(currentPath, entry.name);
          const relativePath = relative(basePath, fullPath);

          // Check if excluded
          if (this.isExcluded(relativePath, config.excludePatterns)) {
            continue;
          }

          if (entry.isDirectory()) {
            stack.push(fullPath);
          } else if (entry.isFile()) {
            // Check file size
            const stats = await fs.stat(fullPath);
            if (stats.size > config.maxFileSize) {
              continue;
            }

            // Check if it's a supported file type
            const language = this.detectLanguageFromPath(fullPath);
            if (language) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        logger.warn(`Failed to read directory: ${currentPath}`, { error });
      }
    }

    return files;
  }

  /**
   * Check if a path should be excluded
   */
  private isExcluded(relativePath: string, excludePatterns: string[]): boolean {
    // Simple pattern matching (would use minimatch in production)
    return excludePatterns.some((pattern) => {
      // Convert glob pattern to regex (simplified)
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]');

      return new RegExp(regexPattern).test(relativePath);
    });
  }

  /**
   * Detect language from file path
   */
  private detectLanguageFromPath(filePath: string): TemplateLanguage | null {
    const ext = extname(filePath).toLowerCase();

    for (const [language, config] of Object.entries(this.config.languageSettings)) {
      if (config.extensions.includes(ext)) {
        return language as TemplateLanguage;
      }
    }

    return null;
  }

  /**
   * Analyze a single file for MCP opportunities
   */
  private async analyzeFile(
    filePath: string,
    language: TemplateLanguage,
    _config: AnalysisConfig,
  ): Promise<MCPOpportunity[]> {
    try {
      logger.debug(`Analyzing file: ${filePath} (${language})`);

      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');

      // Get appropriate parser
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parser = this.getParser(language);
      if (!parser) {
        logger.warn(`No parser available for language: ${language}`);
        return [];
      }

      // Parse functions from file
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const functions = await parser.parseFile(filePath, content);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (functions.length === 0) {
        return [];
      }

      // Detect patterns in the code
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const patterns = await parser.detectPatterns(content, functions);

      // Generate opportunities for each function
      const opportunities: MCPOpportunity[] = [];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      for (const func of functions) {
        // Filter patterns relevant to this function
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const funcPatterns = patterns.filter((pattern: DetectedPattern) =>
          pattern.evidence.some((evidence: string) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
            const functionIndex = content.indexOf(func.name);
            if (functionIndex === -1) return false;

            const functionSection = content.substring(
              functionIndex,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              functionIndex + func.complexity.linesOfCode * 50,
            );
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            return functionSection.includes(evidence.split('(')[0] || evidence);
          }),
        );

        // Score function for MCP suitability
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const score = parser.scoreFunctionForMCP(func, funcPatterns) as number;

        // Only include functions with decent scores
        if (score >= 30) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const opportunity = (await parser.generateOpportunity(
            func,
            funcPatterns,
            score,
          )) as MCPOpportunity;
          opportunities.push(opportunity);
        }
      }

      logger.debug(`Generated ${opportunities.length} opportunities from ${filePath}`);
      return opportunities;
    } catch (error) {
      logger.error(`Failed to analyze file: ${filePath}`, { error });
      return [];
    }
  }

  /**
   * Get appropriate parser for language
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getParser(language: TemplateLanguage): any {
    // For now, only TypeScript parser is implemented
    if (language === TemplateLanguage.TYPESCRIPT || language === TemplateLanguage.NODEJS) {
      // Lazy import to avoid circular dependencies
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
      const { TypeScriptParser } = require('./parsers/typescript-parser.js');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return new TypeScriptParser(language);
    }

    // TODO: Add other language parsers
    return null;
  }

  /**
   * Generate template recommendations based on opportunities
   */
  private generateTemplateRecommendations(
    opportunities: MCPOpportunity[],
  ): TemplateRecommendation[] {
    // For now, return basic recommendations - will implement logic next
    const recommendations: TemplateRecommendation[] = [];

    if (opportunities.length > 0) {
      const languageCount = opportunities.reduce(
        (acc, opp) => {
          acc[opp.language] = (acc[opp.language] || 0) + 1;
          return acc;
        },
        {} as Record<TemplateLanguage, number>,
      );

      // Recommend templates based on language distribution
      for (const [languageStr, count] of Object.entries(languageCount)) {
        const language = languageStr as TemplateLanguage;
        let templateName = 'basic';

        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        if (language === TemplateLanguage.TYPESCRIPT) {
          templateName = count > 3 ? 'typescript-advanced' : 'basic';
          // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        } else if (language === TemplateLanguage.PYTHON) {
          templateName = 'python-basic';
        }

        recommendations.push({
          templateName,
          confidence: Math.min(0.9, count * 0.1 + 0.3),
          reasoning: [`Found ${count} opportunities in ${language}`],
          estimatedVars: {
            serverName: 'generated-server',
            language: language,
          },
        });
      }
    }

    return recommendations;
  }
}
