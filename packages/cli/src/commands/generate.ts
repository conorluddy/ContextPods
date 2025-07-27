/**
 * Generate command implementation
 */

import { promises as fs } from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import type { TemplateSelectionResult, TemplateVariable } from '@context-pods/core';
import { TemplateSelector, DefaultTemplateEngine } from '@context-pods/core';
import type { GenerateOptions, CommandContext, CommandResult } from '../types/cli-types.js';
import { output } from '../utils/output-formatter.js';

/**
 * Generate an MCP server from a template
 */
export async function generateCommand(
  templateName: string | undefined,
  options: GenerateOptions,
  context: CommandContext,
): Promise<CommandResult> {
  try {
    output.info('Generating MCP server from template...');

    // Step 1: Select template
    output.startSpinner('Loading templates...');
    const template = await selectTemplate(templateName, context);
    output.succeedSpinner(`Selected template: ${output.template(template.template.name)}`);

    if (context.verbose) {
      displayTemplateInfo(template);
    }

    // Step 2: Determine server name
    const serverName = await determineServerName(options);

    // Step 3: Prepare output path
    const outputPath = await prepareOutputPath(options, context, serverName);

    // Step 4: Check if output exists
    if (!options.force && (await pathExists(outputPath))) {
      const shouldOverwrite = await confirmOverwrite(outputPath);
      if (!shouldOverwrite) {
        return { success: false, message: 'Operation cancelled by user' };
      }
    }

    // Step 5: Collect template variables
    output.info('Configuring template variables...');
    const variables = await collectTemplateVariables(template, options, serverName, context);

    // Parse environment variables from CLI format
    const parsedEnv =
      options.env && Array.isArray(options.env) ? parseKeyValuePairs(options.env) : undefined;

    // Step 6: Validate variables
    output.startSpinner('Validating template variables...');
    await validateTemplateVariables(template, variables);
    output.succeedSpinner('Variables validated successfully');

    // Step 7: Generate MCP server
    output.startSpinner('Generating MCP server...');
    await generateMCPServer(template, variables, outputPath, context, options, parsedEnv);
    output.succeedSpinner('MCP server generated successfully');

    // Step 8: Display success information
    displaySuccess(serverName, outputPath, template.template.name, template);

    return {
      success: true,
      message: `MCP server '${serverName}' generated successfully`,
      data: {
        name: serverName,
        path: outputPath,
        template: template.template.name,
        variables,
      },
    };
  } catch (error) {
    output.stopSpinner();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    output.error('Failed to generate MCP server', error as Error);

    return {
      success: false,
      error: error as Error,
      message: errorMessage,
    };
  }
}

/**
 * Select template based on user input or interactive selection
 */
async function selectTemplate(
  templateName: string | undefined,
  context: CommandContext,
): Promise<TemplateSelectionResult> {
  const templateSelector = new TemplateSelector(context.templatePaths[0] || './templates');

  if (templateName) {
    // User specified template - find it in available templates
    const templates = await templateSelector.getAvailableTemplates();
    const template = templates.find((t) => t.template.name === templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    return template;
  }

  // Interactive template selection
  const availableTemplates = await templateSelector.getAvailableTemplates();

  if (availableTemplates.length === 0) {
    throw new Error('No templates found. Please check your templates directory.');
  }

  const choices = availableTemplates.map((template) => ({
    name: `${template.template.name} (${template.template.language}) - ${template.template.description || 'No description'}`,
    value: template,
    short: template.template.name,
  }));

  const { selectedTemplate } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedTemplate',
      message: 'Select a template:',
      choices,
      pageSize: 10,
    },
  ]);

  return selectedTemplate;
}

/**
 * Display template information
 */
function displayTemplateInfo(template: TemplateSelectionResult): void {
  output.info('Template Information:');
  output.table([
    { label: 'Name', value: template.template.name, color: 'cyan' },
    { label: 'Language', value: template.template.language || 'Unknown', color: 'yellow' },
    { label: 'Version', value: template.template.version || 'Unknown', color: 'gray' },
    { label: 'Description', value: template.template.description || 'No description' },
    {
      label: 'Optimized',
      value: template.template.optimization?.turboRepo ? 'Yes' : 'No',
      color: template.template.optimization?.turboRepo ? 'green' : 'gray',
    },
  ]);

  if (template.template.variables && Object.keys(template.template.variables).length > 0) {
    output.info('\nRequired Variables:');
    Object.entries(template.template.variables).forEach(
      ([name, config]: [string, TemplateVariable]) => {
        const required = config.required ? '(required)' : '(optional)';
        const defaultValue =
          config.default !== undefined ? ` [default: ${String(config.default)}]` : '';
        output.list([
          `${name}: ${config.description || 'No description'} ${required}${defaultValue}`,
        ]);
      },
    );
  }
}

/**
 * Determine server name
 */
async function determineServerName(options: GenerateOptions): Promise<string> {
  if (options.name) {
    return options.name;
  }

  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Enter MCP server name:',
      validate: (input: string): boolean | string => {
        if (!input.trim()) {
          return 'Server name is required';
        }

        const namePattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
        if (!namePattern.test(input)) {
          return 'Name must start with a letter and contain only letters, numbers, hyphens, and underscores';
        }

        return true;
      },
    },
  ]);

  return name;
}

/**
 * Prepare output path
 */
async function prepareOutputPath(
  options: GenerateOptions,
  context: CommandContext,
  serverName: string,
): Promise<string> {
  const baseOutputPath = options.output || context.outputPath;
  return path.resolve(context.workingDir, baseOutputPath, serverName);
}

/**
 * Check if path exists
 */
async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Confirm overwrite of existing directory
 */
async function confirmOverwrite(outputPath: string): Promise<boolean> {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Directory ${output.path(outputPath)} already exists. Overwrite?`,
      default: false,
    },
  ]);

  return confirm;
}

/**
 * Collect template variables through interactive prompts
 */
async function collectTemplateVariables(
  template: TemplateSelectionResult,
  options: GenerateOptions,
  serverName: string,
  _context: CommandContext,
): Promise<Record<string, any>> {
  const variables: Record<string, any> = {
    serverName,
    serverDescription:
      options.description || `MCP server generated from ${template.template.name} template`,
  };

  // Add user-provided variables from CLI options
  if (options.variables) {
    Object.assign(variables, options.variables);
  }

  // Process template-defined variables
  const templateVariables = template.template.variables || {};
  const missingVariables: Array<{ name: string; config: TemplateVariable }> = [];

  // Identify missing required variables
  for (const [name, config] of Object.entries(templateVariables)) {
    const varConfig = config;

    if (!(name in variables)) {
      if (varConfig.required || !varConfig.default) {
        missingVariables.push({ name, config: varConfig });
      } else {
        variables[name] = varConfig.default;
      }
    }
  }

  // Collect missing variables interactively
  if (missingVariables.length > 0) {
    output.info(`Collecting ${missingVariables.length} template variable(s)...`);

    for (const { name, config } of missingVariables) {
      const value = await promptForVariable(config);
      variables[name] = value;
    }
  }

  return variables;
}

/**
 * Prompt user for a single template variable
 */
async function promptForVariable(config: TemplateVariable): Promise<unknown> {
  const basePrompt = {
    name: 'value',
    message: `${config.description}:`,
    default: config.default,
  };

  let prompt: unknown;

  switch (config.type) {
    case 'boolean':
      prompt = {
        ...basePrompt,
        type: 'confirm',
      };
      break;

    case 'number':
      prompt = {
        ...basePrompt,
        type: 'number',
        validate: (input: unknown): boolean | string => {
          if (isNaN(input as number)) {
            return 'Please enter a valid number';
          }
          return true;
        },
      };
      break;

    case 'array':
      prompt = {
        ...basePrompt,
        type: 'input',
        filter: (input: string): string[] => input.split(',').map((s) => s.trim()),
        validate: (input: unknown): boolean | string => {
          if (!Array.isArray(input)) {
            return 'Please enter comma-separated values';
          }
          return true;
        },
      };
      break;

    default:
      if (config.validation?.options) {
        prompt = {
          ...basePrompt,
          type: 'list',
          choices: config.validation.options,
        };
      } else {
        prompt = {
          ...basePrompt,
          type: 'input',
        };
      }
  }

  const { value } = await inquirer.prompt([prompt]);
  return value;
}

/**
 * Validate template variables against template schema
 */
async function validateTemplateVariables(
  template: TemplateSelectionResult,
  variables: Record<string, any>,
): Promise<void> {
  const templateEngine = new DefaultTemplateEngine();

  const validationResult = await templateEngine.validateVariables(template.template, variables);
  if (!validationResult.isValid) {
    const errorDetails = validationResult.errors
      .map((err) => `• ${err.field}: ${err.message}`)
      .join('\n');

    throw new Error(`Template variable validation failed:\n${errorDetails}`);
  }
}

/**
 * Generate MCP server using template engine
 */
async function generateMCPServer(
  template: TemplateSelectionResult,
  variables: Record<string, any>,
  outputPath: string,
  context: CommandContext,
  options: GenerateOptions,
  parsedEnv?: Record<string, string>,
): Promise<void> {
  const templateEngine = new DefaultTemplateEngine();

  // Determine if MCP config should be generated
  const shouldGenerateConfig =
    options.generateMcpConfig ?? template.template.mcpConfig?.generateByDefault ?? false;

  await templateEngine.process(template.template, {
    variables,
    outputPath,
    templatePath: template.templatePath,
    optimization: {
      turboRepo: context.config.turbo.enabled,
      hotReload: context.config.dev.hotReload,
      sharedDependencies: context.config.turbo.enabled,
      buildCaching: context.config.turbo.caching,
    },
    mcpConfig: shouldGenerateConfig
      ? {
          generateConfig: true,
          configName: options.configName,
          configPath: options.configPath,
          command: options.command,
          args: options.args,
          env: parsedEnv,
        }
      : undefined,
  });
}

/**
 * Display success information
 */
function displaySuccess(
  serverName: string,
  outputPath: string,
  templateName: string,
  template: TemplateSelectionResult,
): void {
  output.success(`MCP server generated successfully!`);
  output.divider();

  output.table([
    { label: 'Server Name', value: serverName, color: 'cyan' },
    { label: 'Template', value: templateName, color: 'blue' },
    { label: 'Language', value: template.template.language || 'Unknown', color: 'yellow' },
    { label: 'Output Path', value: outputPath, color: 'yellow' },
  ]);

  output.divider();
  output.info('Next steps:');

  const isOptimized = template.template.optimization?.turboRepo;
  const steps = isOptimized
    ? [`cd ${path.relative(process.cwd(), outputPath)}`, 'npm install', 'turbo build', 'turbo dev']
    : [
        `cd ${path.relative(process.cwd(), outputPath)}`,
        'npm install',
        'npm run build',
        'npm run dev',
      ];

  output.list(steps);

  if (isOptimized) {
    output.info('\n💡 This template supports TurboRepo optimization for faster builds!');
  }
}

/**
 * Parse key=value pairs from CLI arguments
 */
function parseKeyValuePairs(pairs: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    const value = valueParts.join('='); // Handle values with = in them

    if (key && value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}
