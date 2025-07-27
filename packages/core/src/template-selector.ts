/**
 * Template selection logic with language detection
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';
import { DefaultTemplateEngine } from './template-engine.js';
import type { TemplateMetadata } from './types.js';
import { TemplateLanguage } from './types.js';
import { TemplateMetadataSchema } from './schemas.js';

/**
 * Template selection criteria
 */
export interface TemplateSelectionCriteria {
  language?: TemplateLanguage;
  optimization?: {
    turboRepo?: boolean;
    hotReload?: boolean;
    sharedDependencies?: boolean;
    buildCaching?: boolean;
  };
  tags?: string[];
  complexity?: 'basic' | 'advanced';
}

/**
 * Template selection result
 */
export interface TemplateSelectionResult {
  template: TemplateMetadata;
  templatePath: string;
  score: number;
  reasons: string[];
}

/**
 * Template selector for Context-Pods
 */
export class TemplateSelector {
  private engine: DefaultTemplateEngine;
  private templatesPath: string;

  constructor(templatesPath: string) {
    this.engine = new DefaultTemplateEngine();
    this.templatesPath = templatesPath;
  }

  /**
   * Auto-detect language from script file
   */
  async detectLanguageFromScript(scriptPath: string): Promise<TemplateLanguage | null> {
    try {
      const content = await fs.readFile(scriptPath, 'utf8');
      return await this.engine.detectLanguage(scriptPath, content);
    } catch (error) {
      logger.warn(`Failed to read script file for language detection: ${scriptPath}`, error);
      return await this.engine.detectLanguage(scriptPath);
    }
  }

  /**
   * Get all available templates
   */
  async getAvailableTemplates(): Promise<TemplateSelectionResult[]> {
    const templates: TemplateSelectionResult[] = [];

    try {
      logger.info(`Scanning templates directory: ${this.templatesPath}`);
      const templateDirs = await fs.readdir(this.templatesPath, { withFileTypes: true });
      logger.info(`Found ${templateDirs.length} items in templates directory`);

      for (const dir of templateDirs) {
        if (!dir.isDirectory()) {
          logger.debug(`Skipping non-directory item: ${dir.name}`);
          continue;
        }

        const templatePath = join(this.templatesPath, dir.name);
        const metadataPath = join(templatePath, 'template.json');
        logger.debug(`Processing template directory: ${dir.name}`);

        try {
          const metadataContent = await fs.readFile(metadataPath, 'utf8');
          const metadata = TemplateMetadataSchema.parse(
            JSON.parse(metadataContent),
          ) as TemplateMetadata;

          templates.push({
            template: metadata,
            templatePath,
            score: 0,
            reasons: [],
          });
          logger.debug(`Successfully loaded template: ${metadata.name}`);
        } catch (error) {
          logger.warn(`Failed to load template metadata: ${metadataPath}`, error);
        }
      }
    } catch (error) {
      logger.error(`Failed to scan templates directory: ${this.templatesPath}`, error);
      logger.error(
        'This usually indicates a path resolution issue. Check that the templates directory exists.',
      );

      // Provide helpful debugging information
      const fs = await import('fs');
      if (!fs.existsSync(this.templatesPath)) {
        logger.error(`Templates directory does not exist: ${this.templatesPath}`);
        logger.error('Possible solutions:');
        logger.error('1. Set CONTEXT_PODS_TEMPLATES_PATH environment variable');
        logger.error('2. Ensure you are running from the correct directory');
        logger.error('3. Check that the project build completed successfully');
      }
    }

    logger.info(`Loaded ${templates.length} templates successfully`);
    return templates;
  }

  /**
   * Select best template based on criteria
   */
  async selectTemplate(
    criteria: TemplateSelectionCriteria,
  ): Promise<TemplateSelectionResult | null> {
    const templates = await this.getAvailableTemplates();

    if (templates.length === 0) {
      logger.warn('No templates available');
      return null;
    }

    // Score each template
    for (const template of templates) {
      this.scoreTemplate(template, criteria);
    }

    // Sort by score (highest first)
    templates.sort((a, b) => b.score - a.score);

    const best = templates[0];
    if (best && best.score > 0) {
      logger.info(`Selected template: ${best.template.name} (score: ${best.score})`);
      logger.info(`Selection reasons: ${best.reasons.join(', ')}`);
      return best;
    }

    logger.warn('No suitable template found for criteria');
    return null;
  }

  /**
   * Get recommended template for a language
   */
  async getRecommendedTemplate(
    language: TemplateLanguage,
  ): Promise<TemplateSelectionResult | null> {
    const criteria: TemplateSelectionCriteria = {
      language,
      optimization: {
        turboRepo: language === TemplateLanguage.TYPESCRIPT || language === TemplateLanguage.NODEJS,
        hotReload: true,
        sharedDependencies:
          language === TemplateLanguage.TYPESCRIPT || language === TemplateLanguage.NODEJS,
        buildCaching: true,
      },
      complexity: 'advanced',
    };

    return await this.selectTemplate(criteria);
  }

  /**
   * Score a template based on selection criteria
   */
  private scoreTemplate(
    result: TemplateSelectionResult,
    criteria: TemplateSelectionCriteria,
  ): void {
    const { template } = result;
    let score = 0;
    const reasons: string[] = [];

    // Language match (highest priority)
    if (criteria.language && template.language === criteria.language) {
      score += 100;
      reasons.push(`matches language: ${criteria.language}`);
    }

    // Optimization preferences
    if (criteria.optimization) {
      if (criteria.optimization.turboRepo && template.optimization.turboRepo) {
        score += 20;
        reasons.push('supports TurboRepo optimization');
      }
      if (criteria.optimization.hotReload && template.optimization.hotReload) {
        score += 15;
        reasons.push('supports hot reloading');
      }
      if (criteria.optimization.sharedDependencies && template.optimization.sharedDependencies) {
        score += 15;
        reasons.push('supports shared dependencies');
      }
      if (criteria.optimization.buildCaching && template.optimization.buildCaching) {
        score += 10;
        reasons.push('supports build caching');
      }
    }

    // Tag matching
    if (criteria.tags && template.tags) {
      const matchingTags = criteria.tags.filter((tag) => template.tags!.includes(tag));
      score += matchingTags.length * 5;
      if (matchingTags.length > 0) {
        reasons.push(`matches tags: ${matchingTags.join(', ')}`);
      }
    }

    // Complexity preference
    if (criteria.complexity) {
      const isAdvanced = template.tags?.includes('advanced') || template.name.includes('advanced');
      const isBasic = template.tags?.includes('basic') || template.name.includes('basic');

      if (criteria.complexity === 'advanced' && isAdvanced) {
        score += 10;
        reasons.push('matches advanced complexity');
      } else if (criteria.complexity === 'basic' && isBasic) {
        score += 10;
        reasons.push('matches basic complexity');
      }
    }

    // Prefer TypeScript for Node.js projects (Context-Pods optimization)
    if (
      criteria.language === TemplateLanguage.NODEJS &&
      template.language === TemplateLanguage.TYPESCRIPT
    ) {
      score += 25;
      reasons.push('TypeScript preferred for Node.js projects');
    }

    result.score = score;
    result.reasons = reasons;
  }

  /**
   * Get template suggestions for a script file
   */
  async getTemplateSuggestions(scriptPath: string): Promise<TemplateSelectionResult[]> {
    const detectedLanguage = await this.detectLanguageFromScript(scriptPath);

    if (!detectedLanguage) {
      logger.warn(`Could not detect language for script: ${scriptPath}`);
      return await this.getAvailableTemplates();
    }

    logger.info(`Detected language: ${detectedLanguage} for script: ${scriptPath}`);

    // Get templates for the detected language
    const criteria: TemplateSelectionCriteria = {
      language: detectedLanguage,
      optimization: {
        turboRepo:
          detectedLanguage === TemplateLanguage.TYPESCRIPT ||
          detectedLanguage === TemplateLanguage.NODEJS,
        hotReload: true,
        sharedDependencies:
          detectedLanguage === TemplateLanguage.TYPESCRIPT ||
          detectedLanguage === TemplateLanguage.NODEJS,
        buildCaching: true,
      },
    };

    const templates = await this.getAvailableTemplates();

    // Score all templates
    for (const template of templates) {
      this.scoreTemplate(template, criteria);
    }

    // Return sorted by score
    return templates.sort((a, b) => b.score - a.score);
  }
}
