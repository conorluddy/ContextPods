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
  TemplateValidationResult,
  TemplateValidationError,
} from './types.js';
import { TemplateLanguage } from './types.js';

/**
 * Default template engine implementation
 */
export class DefaultTemplateEngine implements TemplateEngine {
  /**
   * Perform pre-flight checks before processing template
   */
  private async performPreflightChecks(
    metadata: TemplateMetadata,
    context: TemplateContext,
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check template path exists
    try {
      await fs.access(context.templatePath);
    } catch {
      errors.push(
        `Template directory not found: ${context.templatePath}\n` +
          `  → Ensure the template exists and the path is correct\n` +
          `  → Available templates can be found in the 'templates' directory`,
      );
    }

    // Check output path is writable
    try {
      // Try to create parent directory if it doesn't exist
      const parentDir = dirname(context.outputPath);
      await fs.mkdir(parentDir, { recursive: true });
      await fs.access(parentDir, fs.constants.W_OK);
    } catch {
      errors.push(
        `Cannot write to output directory: ${context.outputPath}\n` +
          `  → Check that you have write permissions for this location\n` +
          `  → Try using a different output directory`,
      );
    }

    // Validate all template files exist
    for (const file of metadata.files) {
      const filePath = join(context.templatePath, file.path);
      try {
        await fs.access(filePath);
      } catch {
        errors.push(
          `Template file missing: ${file.path}\n` +
            `  → Expected at: ${filePath}\n` +
            `  → This file is referenced in template.json but doesn't exist\n` +
            `  → Either create the file or remove it from template.json`,
        );
      }
    }

    // Check for required dependencies based on language
    if (
      metadata.language === TemplateLanguage.TYPESCRIPT ||
      metadata.language === TemplateLanguage.NODEJS
    ) {
      try {
        await fs.access(join(context.templatePath, 'package.json'));
      } catch {
        warnings.push(
          `No package.json found in template\n` +
            `  → Node.js/TypeScript templates should include a package.json\n` +
            `  → Users will need to manually set up dependencies`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

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

      // Perform pre-flight checks
      const preflightResult = await this.performPreflightChecks(metadata, context);
      if (!preflightResult.valid) {
        result.errors = preflightResult.errors;
        result.warnings = preflightResult.warnings;
        logger.error('Pre-flight checks failed:', preflightResult.errors);
        return result;
      }
      if (preflightResult.warnings.length > 0) {
        result.warnings = preflightResult.warnings;
        preflightResult.warnings.forEach((warning) => logger.warn(warning));
      }

      // Ensure output directory exists
      await fs.mkdir(context.outputPath, { recursive: true });

      // Process each file in the template
      for (const file of metadata.files) {
        const sourcePath = join(context.templatePath, file.path);
        const targetPath = join(context.outputPath, file.path);

        try {
          // Ensure target directory exists
          await fs.mkdir(dirname(targetPath), { recursive: true });

          if (file.template) {
            // Process template file with variable substitution
            try {
              const content = await fs.readFile(sourcePath, 'utf8');
              const processedContent = this.processTemplateContent(content, context.variables);
              await fs.writeFile(targetPath, processedContent, 'utf8');
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              throw new Error(
                `Failed to process template file: ${file.path}\n` +
                  `  → Source: ${sourcePath}\n` +
                  `  → Target: ${targetPath}\n` +
                  `  → Error: ${message}\n` +
                  `  → Check that the template file exists and has valid syntax`,
              );
            }
          } else {
            // Copy file as-is
            try {
              await fs.copyFile(sourcePath, targetPath);
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              throw new Error(
                `Failed to copy file: ${file.path}\n` +
                  `  → Source: ${sourcePath}\n` +
                  `  → Target: ${targetPath}\n` +
                  `  → Error: ${message}\n` +
                  `  → Check that the source file exists and target directory is writable`,
              );
            }
          }

          // Set executable permissions if needed
          if (file.executable) {
            try {
              await fs.chmod(targetPath, 0o755);
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              result.warnings?.push(
                `Failed to set executable permissions on: ${file.path}\n` +
                  `  → File: ${targetPath}\n` +
                  `  → Error: ${message}\n` +
                  `  → You may need to manually set executable permissions`,
              );
              logger.warn(`Failed to set executable permissions on ${targetPath}:`, error);
            }
          }

          result.generatedFiles.push(targetPath);
        } catch (error) {
          if (error instanceof Error && error.message.includes('Failed to')) {
            throw error; // Re-throw our enhanced errors
          }
          // Enhance generic errors
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(
            `Failed to process file: ${file.path}\n` +
              `  → Error: ${message}\n` +
              `  → Check the template configuration and file permissions`,
          );
        }
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

      // Generate MCP config if requested
      if (context.mcpConfig?.generateConfig) {
        const mcpConfigPath = await this.generateMCPConfig(metadata, context);
        if (mcpConfigPath) {
          result.mcpConfigPath = mcpConfigPath;
          result.generatedFiles.push(mcpConfigPath);
        }
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
  ): Promise<TemplateValidationResult> {
    const errors: TemplateValidationError[] = [];

    // Ensure this is truly async
    await Promise.resolve();

    for (const [name, definition] of Object.entries(metadata.variables)) {
      const value = variables[name];

      // Check required variables
      if (definition.required && (value === undefined || value === null)) {
        errors.push({
          field: name,
          message:
            `Required variable '${name}' is missing\n` +
            `  → Description: ${definition.description || 'No description provided'}\n` +
            `  → Expected type: ${definition.type}\n` +
            `  → Please provide a value for this required variable`,
          currentValue: value,
          expectedType: definition.type,
        });
        continue;
      }

      // Skip validation if variable is not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== definition.type) {
        errors.push({
          field: name,
          message:
            `Variable '${name}' has incorrect type\n` +
            `  → Expected: ${definition.type}\n` +
            `  → Received: ${actualType}\n` +
            `  → Current value: ${JSON.stringify(value)}\n` +
            `  → ${this.getTypeHint(definition.type)}`,
          currentValue: value,
          expectedType: definition.type,
        });
        continue;
      }

      // Pattern validation for strings
      if (definition.type === 'string' && definition.validation?.pattern) {
        const pattern = new RegExp(definition.validation.pattern);
        const stringValue = String(value);
        if (!pattern.test(stringValue)) {
          errors.push({
            field: name,
            message:
              `Variable '${name}' does not match required pattern\n` +
              `  → Pattern: ${definition.validation.pattern}\n` +
              `  → Current value: "${stringValue}"\n` +
              `  → ${this.getPatternHint(name, definition.validation.pattern)}`,
            currentValue: value,
            expectedType: definition.type,
            pattern: definition.validation.pattern,
          });
        }
      }

      // Range validation for numbers
      if (definition.type === 'number' && typeof value === 'number') {
        if (definition.validation?.min !== undefined && value < definition.validation.min) {
          errors.push({
            field: name,
            message: `Variable '${name}' must be at least ${definition.validation.min}`,
            currentValue: value,
            expectedType: definition.type,
          });
        }
        if (definition.validation?.max !== undefined && value > definition.validation.max) {
          errors.push({
            field: name,
            message: `Variable '${name}' must be at most ${definition.validation.max}`,
            currentValue: value,
            expectedType: definition.type,
          });
        }
      }

      // Options validation
      if (definition.validation?.options) {
        if (definition.type === 'array' && Array.isArray(value)) {
          // For arrays, validate each element
          const invalidValues = value.filter(
            (item) => !definition.validation!.options!.includes(String(item)),
          );
          if (invalidValues.length > 0) {
            errors.push({
              field: name,
              message:
                `Array '${name}' contains invalid values\n` +
                `  → Invalid values: ${invalidValues.join(', ')}\n` +
                `  → Allowed values: ${definition.validation.options.join(', ')}\n` +
                `  → Example: ["${definition.validation.options.slice(0, 2).join('", "')}"]`,
              currentValue: value,
              expectedType: definition.type,
            });
          }
        } else if (definition.type !== 'array') {
          // For non-arrays, validate the value directly
          const stringValue = String(value);
          if (!definition.validation.options.includes(stringValue)) {
            errors.push({
              field: name,
              message:
                `Variable '${name}' has invalid value\n` +
                `  → Current value: "${stringValue}"\n` +
                `  → Allowed values: ${definition.validation.options.join(', ')}\n` +
                `  → Choose one of the allowed values`,
              currentValue: value,
              expectedType: definition.type,
            });
          }
        }
      }
    }

    if (errors.length > 0) {
      logger.error(
        'Variable validation failed:',
        errors.map((e) => e.message),
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
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
   * Get helpful hint for type errors
   */
  private getTypeHint(expectedType: string): string {
    switch (expectedType) {
      case 'string':
        return 'Provide a text value enclosed in quotes';
      case 'number':
        return 'Provide a numeric value without quotes';
      case 'boolean':
        return 'Provide true or false (without quotes)';
      case 'array':
        return 'Provide a list of values, e.g., ["item1", "item2"]';
      case 'object':
        return 'Provide an object with key-value pairs, e.g., {"key": "value"}';
      default:
        return `Provide a value of type ${expectedType}`;
    }
  }

  /**
   * Get helpful hint for pattern validation errors
   */
  private getPatternHint(variableName: string, pattern: string): string {
    // Common patterns
    if (pattern.includes('^[a-z0-9-]+$') || pattern.includes('^[a-z0-9_-]+$')) {
      return 'Use only lowercase letters, numbers, and hyphens (no spaces or special characters)';
    }
    if (pattern.includes('^[a-zA-Z][a-zA-Z0-9_-]*$')) {
      return 'Must start with a letter, then letters, numbers, underscores, or hyphens';
    }
    if (pattern.includes('\\d+\\.\\d+\\.\\d+')) {
      return 'Use semantic version format, e.g., "1.0.0" or "2.1.3"';
    }
    if (variableName.toLowerCase().includes('email')) {
      return 'Provide a valid email address';
    }
    if (variableName.toLowerCase().includes('url')) {
      return 'Provide a valid URL starting with http:// or https://';
    }
    return `Value must match the pattern: ${pattern}`;
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

  /**
   * Generate MCP configuration file
   */
  private async generateMCPConfig(
    metadata: TemplateMetadata,
    context: TemplateContext,
  ): Promise<string | null> {
    try {
      const { mcpConfig } = context;
      if (!mcpConfig) return null;

      // Determine config name
      const configName =
        mcpConfig.configName || String(context.variables.serverName) || 'mcp-server';

      // Determine command and args
      let command = mcpConfig.command;
      let args = mcpConfig.args;

      if (!command && metadata.mcpConfig) {
        command = metadata.mcpConfig.defaultCommand;
        args = metadata.mcpConfig.defaultArgs;
      }

      // Fallback based on language
      if (!command) {
        switch (metadata.language) {
          case TemplateLanguage.TYPESCRIPT:
          case TemplateLanguage.NODEJS:
            command = 'node';
            args = ['dist/index.js'];
            break;
          case TemplateLanguage.PYTHON:
            command = 'python';
            args = ['main.py'];
            break;
          case TemplateLanguage.RUST:
            command = 'cargo';
            args = ['run'];
            break;
          default:
            command = 'node';
            args = ['dist/index.js'];
        }
      }

      // Prepare environment variables
      const env = {
        ...(metadata.mcpConfig?.defaultEnv || {}),
        ...(mcpConfig.env || {}),
      };

      // Create MCP config object
      const mcpConfigData = {
        mcpServers: {
          [configName]: {
            command,
            args,
            cwd: context.outputPath,
            env,
          },
        },
      };

      // Generate config file path
      const configPath = mcpConfig.configPath || join(context.outputPath, '.mcp.json');

      // Write config file
      await fs.writeFile(configPath, JSON.stringify(mcpConfigData, null, 2), 'utf8');

      logger.info(`Generated MCP config: ${configPath}`);
      return configPath;
    } catch (error) {
      logger.error('Failed to generate MCP config:', error);
      return null;
    }
  }
}
