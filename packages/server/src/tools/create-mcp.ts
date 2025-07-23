/**
 * Create MCP server tool
 */

import { join } from 'path';
import { promises as fs } from 'fs';
import { TemplateSelector, DefaultTemplateEngine, logger } from '@context-pods/core';
import { BaseTool, type ToolResult } from './base-tool.js';
import { getRegistryOperations } from '../registry/index.js';
import { CONFIG } from '../config/index.js';

/**
 * Arguments for create-mcp tool
 */
interface CreateMCPArgs {
  name: string;
  template?: string;
  outputPath?: string;
  description?: string;
  language?: string;
  variables?: Record<string, unknown>;
}

/**
 * Template selection result with proper typing
 */
interface TypedTemplateSelectionResult {
  template: {
    name: string;
    language: string;
    tags?: string[];
    optimization: {
      turboRepo: boolean;
      hotReload: boolean;
      sharedDependencies: boolean;
      buildCaching: boolean;
    };
    variables: Record<string, {
      type: string;
      required: boolean;
      default?: unknown;
    }>;
  };
  templatePath: string;
  reasons: string[];
  score: number;
}

/**
 * Template processing result with proper typing
 */
interface TypedTemplateProcessingResult {
  success: boolean;
  outputPath: string;
  generatedFiles: string[];
  errors?: string[];
  warnings?: string[];
  buildCommand?: string;
  devCommand?: string;
}

/**
 * Create MCP server tool implementation
 */
export class CreateMCPTool extends BaseTool {
  private templateSelector: TemplateSelector;
  private templateEngine: DefaultTemplateEngine;

  constructor() {
    super('create-mcp');
    this.templateSelector = new TemplateSelector(CONFIG.templatesPath);
    this.templateEngine = new DefaultTemplateEngine();
  }

  /**
   * Validate create-mcp arguments
   */
  protected async validateArguments(args: unknown): Promise<string | null> {
    const typedArgs = args as CreateMCPArgs;

    // Validate required arguments
    let error = this.validateStringArgument(typedArgs, 'name', true, 1, 50);
    if (error) return error;

    // Validate optional arguments
    error = this.validateStringArgument(typedArgs, 'template', false);
    if (error) return error;

    error = this.validateStringArgument(typedArgs, 'outputPath', false);
    if (error) return error;

    error = this.validateStringArgument(typedArgs, 'description', false, 0, 500);
    if (error) return error;

    error = this.validateStringArgument(typedArgs, 'language', false);
    if (error) return error;

    if (typedArgs.variables !== undefined) {
      error = this.validateArgument(typedArgs, 'variables', 'object', false);
      if (error) return error;
    }

    // Validate name format (alphanumeric, hyphens, underscores)
    const namePattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
    if (!namePattern.test(typedArgs.name)) {
      return 'Server name must start with a letter and contain only letters, numbers, hyphens, and underscores';
    }

    // Check if name is available
    const registry = await getRegistryOperations();
    const isAvailable = await registry.isNameAvailable(typedArgs.name);
    if (!isAvailable) {
      return `Server name '${typedArgs.name}' is already taken`;
    }

    return null;
  }

  /**
   * Execute create-mcp tool
   */
  protected async execute(args: unknown): Promise<ToolResult> {
    const typedArgs = args as CreateMCPArgs;
    const warnings: string[] = [];

    try {
      // Step 1: Select template
      const template = await this.selectTemplate(typedArgs);
      if (!template) {
        return {
          success: false,
          error: 'No suitable template found',
        };
      }

      logger.info(`Selected template: ${template.template.name}`, {
        reasons: template.reasons,
        score: template.score,
      });

      // Step 2: Prepare output path
      const outputPath = this.prepareOutputPath(typedArgs);
      
      // Step 3: Check if output directory already exists
      try {
        await fs.access(outputPath);
        return {
          success: false,
          error: `Output directory already exists: ${outputPath}`,
        };
      } catch {
        // Directory doesn't exist, which is what we want
      }

      // Step 4: Prepare template variables
      const variables = this.prepareTemplateVariables(typedArgs, template.template);

      // Step 5: Validate template variables
      const isValid = await this.templateEngine.validateVariables(template.template, variables);
      if (!isValid) {
        return {
          success: false,
          error: 'Template variable validation failed',
        };
      }

      // Step 6: Register server in registry
      const registry = await getRegistryOperations();
      const serverMetadata = await registry.registerServer({
        name: typedArgs.name,
        template: template.template.name,
        path: outputPath,
        templateVariables: variables,
        description: typedArgs.description,
        tags: template.template.tags,
      });

      try {
        // Step 7: Mark as building
        await registry.markServerBuilding(serverMetadata.id);

        // Step 8: Process template
        const result = await this.templateEngine.process(template.template, {
          variables,
          outputPath,
          templatePath: template.templatePath,
          optimization: {
            turboRepo: template.template.optimization.turboRepo,
            hotReload: template.template.optimization.hotReload,
            sharedDependencies: template.template.optimization.sharedDependencies,
            buildCaching: template.template.optimization.buildCaching,
          },
        });

        if (!result.success) {
          await registry.markServerError(serverMetadata.id, result.errors?.join(', ') || 'Template processing failed');
          return {
            success: false,
            error: result.errors?.join(', ') || 'Template processing failed',
          };
        }

        // Step 9: Mark as ready
        await registry.markServerReady(
          serverMetadata.id,
          result.buildCommand,
          result.devCommand
        );

        // Add warnings from template processing
        if (result.warnings) {
          warnings.push(...result.warnings);
        }

        // Step 10: Create success message
        const successMessage = this.createSuccessMessage(
          typedArgs.name,
          template.template.name,
          outputPath,
          result
        );

        return {
          success: true,
          data: successMessage,
          warnings,
        };

      } catch (error) {
        // Mark server as error if processing failed
        await registry.markServerError(
          serverMetadata.id,
          error instanceof Error ? error.message : String(error)
        );
        throw error;
      }

    } catch (error) {
      logger.error('Error creating MCP server:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Select appropriate template
   */
  private async selectTemplate(args: CreateMCPArgs): Promise<TypedTemplateSelectionResult | null> {
    if (args.template) {
      // Specific template requested
      const templates = await this.templateSelector.getAvailableTemplates();
      const template = templates.find(t => t.template.name === args.template);
      
      if (!template) {
        throw new Error(`Template '${args.template}' not found`);
      }
      
      return template;
    }

    // Auto-select template based on language preference
    if (args.language) {
      const languageMap: Record<string, any> = {
        'typescript': 'typescript',
        'javascript': 'nodejs',
        'python': 'python',
        'rust': 'rust',
        'shell': 'shell',
      };
      
      const templateLanguage = languageMap[args.language.toLowerCase()];
      if (templateLanguage) {
        return await this.templateSelector.getRecommendedTemplate(templateLanguage);
      }
    }

    // Default to TypeScript advanced template
    const templates = await this.templateSelector.getAvailableTemplates();
    const defaultTemplate = templates.find(t => 
      t.template.name.includes('typescript') && 
      t.template.name.includes('advanced')
    );

    return defaultTemplate || templates[0] || null;
  }

  /**
   * Prepare output path
   */
  private prepareOutputPath(args: CreateMCPArgs): string {
    if (args.outputPath) {
      return args.outputPath;
    }

    // Use configured output path based on mode
    return join(CONFIG.generatedPackagesPath, args.name);
  }

  /**
   * Prepare template variables
   */
  private prepareTemplateVariables(
    args: CreateMCPArgs,
    template: any
  ): Record<string, unknown> {
    const variables: Record<string, unknown> = {
      serverName: args.name,
      serverDescription: args.description || `MCP server: ${args.name}`,
      ...args.variables,
    };

    // Add default values for common template variables
    if (!variables.packageName) {
      variables.packageName = args.name;
    }

    if (!variables.authorName) {
      variables.authorName = 'Context-Pods';
    }

    // Add template-specific defaults
    for (const [varName, varDef] of Object.entries(template.variables)) {
      if (!variables[varName] && (varDef as any).default !== undefined) {
        variables[varName] = (varDef as any).default;
      }
    }

    return variables;
  }

  /**
   * Create success message
   */
  private createSuccessMessage(
    name: string,
    templateName: string,
    outputPath: string,
    result: any
  ): string {
    let message = `🎉 Successfully created MCP server: ${name}\n\n`;
    message += `📋 Details:\n`;
    message += `- Template: ${templateName}\n`;
    message += `- Output: ${outputPath}\n`;
    message += `- Files generated: ${result.generatedFiles?.length || 0}\n`;
    
    if (result.buildCommand) {
      message += `- Build command: ${result.buildCommand}\n`;
    }
    
    if (result.devCommand) {
      message += `- Dev command: ${result.devCommand}\n`;
    }

    message += `\n🚀 Next steps:\n`;
    message += `1. Navigate to: cd ${outputPath}\n`;
    
    if (result.buildCommand) {
      message += `2. Build: ${result.buildCommand}\n`;
    }
    
    if (result.devCommand) {
      message += `3. Start development: ${result.devCommand}\n`;
    }

    return message;
  }
}