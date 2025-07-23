/**
 * Wrap script as MCP server tool
 */

import { join, basename, extname } from 'path';
import { promises as fs } from 'fs';
import { TemplateSelector, DefaultTemplateEngine, logger, TemplateLanguage } from '@context-pods/core';
import { BaseTool, type ToolResult } from './base-tool.js';
import { getRegistryOperations } from '../registry/index.js';
import { CONFIG } from '../config/index.js';

/**
 * Arguments for wrap-script tool
 */
interface WrapScriptArgs {
  scriptPath: string;
  name: string;
  template?: string;
  outputPath?: string;
  description?: string;
  variables?: Record<string, unknown>;
}

/**
 * Wrap script as MCP server tool implementation
 */
export class WrapScriptTool extends BaseTool {
  private templateSelector: TemplateSelector;
  private templateEngine: DefaultTemplateEngine;

  constructor() {
    super('wrap-script');
    this.templateSelector = new TemplateSelector(CONFIG.templatesPath);
    this.templateEngine = new DefaultTemplateEngine();
  }

  /**
   * Validate wrap-script arguments
   */
  protected async validateArguments(args: unknown): Promise<string | null> {
    const typedArgs = args as WrapScriptArgs;

    // Validate required arguments
    let error = this.validateStringArgument(typedArgs, 'scriptPath', true, 1);
    if (error) return error;

    error = this.validateStringArgument(typedArgs, 'name', true, 1, 50);
    if (error) return error;

    // Validate optional arguments
    error = this.validateStringArgument(typedArgs, 'template', false);
    if (error) return error;

    error = this.validateStringArgument(typedArgs, 'outputPath', false);
    if (error) return error;

    error = this.validateStringArgument(typedArgs, 'description', false, 0, 500);
    if (error) return error;

    if (typedArgs.variables !== undefined) {
      error = this.validateArgument(typedArgs, 'variables', 'object', false);
      if (error) return error;
    }

    // Validate name format
    const namePattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
    if (!namePattern.test(typedArgs.name)) {
      return 'Server name must start with a letter and contain only letters, numbers, hyphens, and underscores';
    }

    // Check if script file exists
    try {
      const stat = await fs.stat(typedArgs.scriptPath);
      if (!stat.isFile()) {
        return 'Script path must point to a file';
      }
    } catch (error) {
      return `Script file not found: ${typedArgs.scriptPath}`;
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
   * Execute wrap-script tool
   */
  protected async execute(args: unknown): Promise<ToolResult> {
    const typedArgs = args as WrapScriptArgs;
    const warnings: string[] = [];

    try {
      // Step 1: Analyze script file
      const scriptAnalysis = await this.analyzeScript(typedArgs.scriptPath);
      logger.info('Script analysis complete', scriptAnalysis);

      // Step 2: Select appropriate template
      const template = await this.selectTemplate(typedArgs, scriptAnalysis);
      if (!template) {
        return {
          success: false,
          error: 'No suitable template found for script wrapping',
        };
      }

      logger.info(`Selected template: ${template.template.name}`, {
        reasons: template.reasons,
        score: template.score,
      });

      // Step 3: Prepare output path
      const outputPath = this.prepareOutputPath(typedArgs);
      
      // Step 4: Check if output directory already exists
      try {
        await fs.access(outputPath);
        return {
          success: false,
          error: `Output directory already exists: ${outputPath}`,
        };
      } catch {
        // Directory doesn't exist, which is what we want
      }

      // Step 5: Prepare template variables
      const variables = this.prepareTemplateVariables(typedArgs, template.template, scriptAnalysis);

      // Step 6: Validate template variables
      const isValid = await this.templateEngine.validateVariables(template.template, variables);
      if (!isValid) {
        return {
          success: false,
          error: 'Template variable validation failed',
        };
      }

      // Step 7: Register server in registry
      const registry = await getRegistryOperations();
      const serverMetadata = await registry.registerServer({
        name: typedArgs.name,
        template: template.template.name,
        path: outputPath,
        templateVariables: variables,
        description: typedArgs.description || `Wrapped script: ${basename(typedArgs.scriptPath)}`,
        tags: [...(template.template.tags || []), 'script-wrapper'],
      });

      try {
        // Step 8: Mark as building
        await registry.markServerBuilding(serverMetadata.id);

        // Step 9: Copy script to output directory
        await this.copyScriptToOutput(typedArgs.scriptPath, outputPath, scriptAnalysis.language);

        // Step 10: Process template
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

        // Step 11: Mark as ready
        await registry.markServerReady(
          serverMetadata.id,
          result.buildCommand,
          result.devCommand
        );

        // Add warnings from template processing
        if (result.warnings) {
          warnings.push(...result.warnings);
        }

        // Add script analysis warnings
        if (scriptAnalysis.warnings) {
          warnings.push(...scriptAnalysis.warnings);
        }

        // Step 12: Create success message
        const successMessage = this.createSuccessMessage(
          typedArgs.name,
          typedArgs.scriptPath,
          template.template.name,
          outputPath,
          result,
          scriptAnalysis
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
      logger.error('Error wrapping script:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Analyze script file to determine language and characteristics
   */
  private async analyzeScript(scriptPath: string) {
    const content = await fs.readFile(scriptPath, 'utf8');
    const language = await this.templateEngine.detectLanguage(scriptPath, content);
    const extension = extname(scriptPath).toLowerCase();
    const filename = basename(scriptPath);

    const analysis = {
      language,
      extension,
      filename,
      content,
      size: content.length,
      lines: content.split('\n').length,
      warnings: [] as string[],
      features: {
        hasShebang: content.startsWith('#!'),
        hasImports: false,
        hasFunctions: false,
        hasClasses: false,
        hasAsyncCode: false,
      },
    };

    // Language-specific analysis
    if (language === TemplateLanguage.PYTHON) {
      analysis.features.hasImports = /^(import|from)\s+/m.test(content);
      analysis.features.hasFunctions = /^def\s+\w+/m.test(content);
      analysis.features.hasClasses = /^class\s+\w+/m.test(content);
      analysis.features.hasAsyncCode = /\basync\s+def\b|\bawait\b/.test(content);
      
      if (!analysis.features.hasImports) {
        analysis.warnings.push('Script has no imports - may be a simple script');
      }
    } else if (language === TemplateLanguage.TYPESCRIPT || language === TemplateLanguage.NODEJS) {
      analysis.features.hasImports = /^(import|require)\s+/m.test(content);
      analysis.features.hasFunctions = /function\s+\w+|\w+\s*=\s*\([^)]*\)\s*=>/.test(content);
      analysis.features.hasClasses = /^class\s+\w+/m.test(content);
      analysis.features.hasAsyncCode = /\basync\s+function\b|\basync\s+\([^)]*\)\s*=>|\bawait\b/.test(content);
      
      if (!analysis.features.hasImports) {
        analysis.warnings.push('Script has no imports/requires - may be a simple script');
      }
    } else if (language === TemplateLanguage.SHELL) {
      analysis.features.hasShebang = content.startsWith('#!/');
      analysis.features.hasFunctions = /^\s*function\s+\w+|^\s*\w+\s*\(\s*\)\s*\{/m.test(content);
      
      if (!analysis.features.hasShebang) {
        analysis.warnings.push('Shell script missing shebang - may not be executable');
      }
    }

    // General warnings
    if (analysis.size > 10000) {
      analysis.warnings.push('Large script file - consider breaking into modules');
    }

    if (!language) {
      analysis.warnings.push('Could not detect script language - using default template');
    }

    return analysis;
  }

  /**
   * Select appropriate template for script wrapping
   */
  private async selectTemplate(args: WrapScriptArgs, scriptAnalysis: any) {
    if (args.template) {
      // Specific template requested
      const templates = await this.templateSelector.getAvailableTemplates();
      const template = templates.find(t => t.template.name === args.template);
      
      if (!template) {
        throw new Error(`Template '${args.template}' not found`);
      }
      
      return template;
    }

    // Auto-select based on detected language
    if (scriptAnalysis.language) {
      return await this.templateSelector.getRecommendedTemplate(scriptAnalysis.language);
    }

    // Fallback to basic TypeScript template for unknown languages
    const templates = await this.templateSelector.getAvailableTemplates();
    const fallbackTemplate = templates.find(t => 
      t.template.name.includes('typescript') && 
      t.template.name.includes('basic')
    );

    return fallbackTemplate || templates[0] || null;
  }

  /**
   * Prepare output path
   */
  private prepareOutputPath(args: WrapScriptArgs): string {
    if (args.outputPath) {
      return args.outputPath;
    }

    return join(CONFIG.generatedPackagesPath, args.name);
  }

  /**
   * Copy script to output directory
   */
  private async copyScriptToOutput(
    scriptPath: string,
    outputPath: string,
    language: TemplateLanguage | null
  ): Promise<void> {
    // Determine target filename based on language
    const originalFilename = basename(scriptPath);
    let targetFilename: string;

    if (language === TemplateLanguage.PYTHON) {
      targetFilename = 'script.py';
    } else if (language === TemplateLanguage.TYPESCRIPT) {
      targetFilename = 'script.ts';
    } else if (language === TemplateLanguage.NODEJS) {
      targetFilename = 'script.js';
    } else if (language === TemplateLanguage.SHELL) {
      targetFilename = 'script.sh';
    } else {
      // Keep original filename
      targetFilename = originalFilename;
    }

    // Create scripts directory
    const scriptsDir = join(outputPath, 'scripts');
    await fs.mkdir(scriptsDir, { recursive: true });

    // Copy script file
    const targetPath = join(scriptsDir, targetFilename);
    await fs.copyFile(scriptPath, targetPath);

    // Make executable if it's a shell script
    if (language === TemplateLanguage.SHELL) {
      await fs.chmod(targetPath, 0o755);
    }

    logger.info(`Copied script: ${scriptPath} -> ${targetPath}`);
  }

  /**
   * Prepare template variables for script wrapping
   */
  private prepareTemplateVariables(
    args: WrapScriptArgs,
    template: any,
    scriptAnalysis: any
  ): Record<string, unknown> {
    const originalFilename = basename(args.scriptPath);
    
    const variables: Record<string, unknown> = {
      serverName: args.name,
      serverDescription: args.description || `Wrapped script: ${originalFilename}`,
      scriptName: originalFilename,
      scriptLanguage: scriptAnalysis.language || 'unknown',
      scriptPath: `./scripts/${scriptAnalysis.filename}`,
      hasImports: scriptAnalysis.features.hasImports,
      hasFunctions: scriptAnalysis.features.hasFunctions,
      hasClasses: scriptAnalysis.features.hasClasses,
      hasAsyncCode: scriptAnalysis.features.hasAsyncCode,
      ...args.variables,
    };

    // Add default values
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
    scriptPath: string,
    templateName: string,
    outputPath: string,
    result: any,
    scriptAnalysis: any
  ): string {
    let message = `🎉 Successfully wrapped script as MCP server: ${name}\n\n`;
    message += `📋 Details:\n`;
    message += `- Original script: ${scriptPath}\n`;
    message += `- Detected language: ${scriptAnalysis.language || 'unknown'}\n`;
    message += `- Template: ${templateName}\n`;
    message += `- Output: ${outputPath}\n`;
    message += `- Files generated: ${result.generatedFiles?.length || 0}\n`;
    
    if (result.buildCommand) {
      message += `- Build command: ${result.buildCommand}\n`;
    }
    
    if (result.devCommand) {
      message += `- Dev command: ${result.devCommand}\n`;
    }

    // Add script analysis summary
    message += `\n📊 Script Analysis:\n`;
    message += `- Size: ${scriptAnalysis.size} bytes, ${scriptAnalysis.lines} lines\n`;
    message += `- Has imports: ${scriptAnalysis.features.hasImports ? 'Yes' : 'No'}\n`;
    message += `- Has functions: ${scriptAnalysis.features.hasFunctions ? 'Yes' : 'No'}\n`;
    message += `- Has async code: ${scriptAnalysis.features.hasAsyncCode ? 'Yes' : 'No'}\n`;

    message += `\n🚀 Next steps:\n`;
    message += `1. Navigate to: cd ${outputPath}\n`;
    
    if (result.buildCommand) {
      message += `2. Build: ${result.buildCommand}\n`;
    }
    
    if (result.devCommand) {
      message += `3. Start development: ${result.devCommand}\n`;
    }

    message += `4. Review the generated MCP server and customize as needed\n`;

    return message;
  }
}