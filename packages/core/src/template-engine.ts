/**
 * Template processing engine for Context-Pods
 */

import { promises as fs } from 'fs';
import { join, dirname, extname } from 'path';
import { logger } from './logger.js';
import type {
  TemplateEngine,
  TemplateMetadata,
  TemplateContext,
  TemplateProcessingResult,
} from './types.js';
import { TemplateLanguage } from './types.js';

/**
 * Default template engine implementation
 */
export class DefaultTemplateEngine implements TemplateEngine {
  /**
   * Process a template with given context
   */
  async process(
    metadata: TemplateMetadata,
    context: TemplateContext,
  ): Promise<TemplateProcessingResult> {
    const result: TemplateProcessingResult = {
      success: false,
      outputPath: context.outputPath,
      generatedFiles: [],
      errors: [],
      warnings: [],
    };

    try {
      logger.info(`Processing template: ${metadata.name}`);

      // Ensure output directory exists
      await fs.mkdir(context.outputPath, { recursive: true });

      // Process each file in the template
      for (const file of metadata.files) {
        const sourcePath = join(context.templatePath, file.path);
        const targetPath = join(context.outputPath, file.path);

        // Ensure target directory exists
        await fs.mkdir(dirname(targetPath), { recursive: true });

        if (file.template) {
          // Process template file with variable substitution
          const content = await fs.readFile(sourcePath, 'utf8');
          const processedContent = this.processTemplateContent(content, context.variables);
          await fs.writeFile(targetPath, processedContent, 'utf8');
        } else {
          // Copy file as-is
          await fs.copyFile(sourcePath, targetPath);
        }

        // Set executable permissions if needed
        if (file.executable) {
          await fs.chmod(targetPath, 0o755);
        }

        result.generatedFiles.push(targetPath);
      }

      // Set build and dev commands based on optimization
      if (context.optimization.turboRepo && metadata.language === TemplateLanguage.TYPESCRIPT) {
        result.buildCommand = 'npm run build';
        result.devCommand = 'npm run dev';
      } else if (metadata.language === TemplateLanguage.PYTHON) {
        result.buildCommand = 'pip install -r requirements.txt';
        result.devCommand = 'python main.py';
      } else if (metadata.language === TemplateLanguage.RUST) {
        result.buildCommand = 'cargo build';
        result.devCommand = 'cargo run';
      }

      result.success = true;
      logger.info(
        `Template processed successfully: ${result.generatedFiles.length} files generated`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors?.push(errorMessage);
      logger.error('Template processing failed:', error);
    }

    return result;
  }

  /**
   * Validate template variables
   */
  async validateVariables(
    metadata: TemplateMetadata,
    variables: Record<string, unknown>,
  ): Promise<boolean> {
    const errors: string[] = [];

    // Ensure this is truly async
    await Promise.resolve();

    for (const [name, definition] of Object.entries(metadata.variables)) {
      const value = variables[name];

      // Check required variables
      if (definition.required && (value === undefined || value === null)) {
        errors.push(`Required variable '${name}' is missing`);
        continue;
      }

      // Skip validation if variable is not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== definition.type) {
        errors.push(
          `Variable '${name}' should be of type '${definition.type}', got '${actualType}'`,
        );
        continue;
      }

      // Pattern validation for strings
      if (definition.type === 'string' && definition.validation?.pattern) {
        const pattern = new RegExp(definition.validation.pattern);
        if (!pattern.test(String(value))) {
          errors.push(
            `Variable '${name}' does not match required pattern: ${definition.validation.pattern}`,
          );
        }
      }

      // Range validation for numbers
      if (definition.type === 'number' && typeof value === 'number') {
        if (definition.validation?.min !== undefined && value < definition.validation.min) {
          errors.push(`Variable '${name}' must be at least ${definition.validation.min}`);
        }
        if (definition.validation?.max !== undefined && value > definition.validation.max) {
          errors.push(`Variable '${name}' must be at most ${definition.validation.max}`);
        }
      }

      // Options validation
      if (
        definition.validation?.options &&
        !definition.validation.options.includes(String(value))
      ) {
        errors.push(
          `Variable '${name}' must be one of: ${definition.validation.options.join(', ')}`,
        );
      }
    }

    if (errors.length > 0) {
      logger.error('Variable validation failed:', errors);
      return false;
    }

    return true;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): TemplateLanguage[] {
    return [
      TemplateLanguage.NODEJS,
      TemplateLanguage.TYPESCRIPT,
      TemplateLanguage.PYTHON,
      TemplateLanguage.RUST,
      TemplateLanguage.SHELL,
    ];
  }

  /**
   * Detect language from file extension or content
   */
  async detectLanguage(filePath: string, content?: string): Promise<TemplateLanguage | null> {
    const ext = extname(filePath).toLowerCase();

    // Ensure this is truly async
    await Promise.resolve();

    // Extension-based detection
    switch (ext) {
      case '.ts':
        return TemplateLanguage.TYPESCRIPT;
      case '.js':
        return TemplateLanguage.NODEJS;
      case '.py':
        return TemplateLanguage.PYTHON;
      case '.rs':
        return TemplateLanguage.RUST;
      case '.sh':
      case '.bash':
        return TemplateLanguage.SHELL;
    }

    // Content-based detection if extension is not conclusive
    if (content) {
      if (content.includes('#!/usr/bin/env python') || content.includes('import ')) {
        return TemplateLanguage.PYTHON;
      }
      if (content.includes('#!/bin/bash') || content.includes('#!/bin/sh')) {
        return TemplateLanguage.SHELL;
      }
      if (content.includes('fn main()') || content.includes('use std::')) {
        return TemplateLanguage.RUST;
      }
      if (content.includes('import type') || content.includes('interface ')) {
        return TemplateLanguage.TYPESCRIPT;
      }
      if (content.includes('require(') || content.includes('module.exports')) {
        return TemplateLanguage.NODEJS;
      }
    }

    return null;
  }

  /**
   * Process template content with variable substitution
   */
  private processTemplateContent(content: string, variables: Record<string, unknown>): string {
    let processed = content;

    // Simple mustache-style variable substitution
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return processed;
  }
}
