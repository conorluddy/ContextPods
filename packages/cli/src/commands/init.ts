/**
 * Init command implementation
 */

import inquirer from 'inquirer';
import { configManager } from '../config/index.js';
import { TemplateSelector } from '@context-pods/core';
import { CommandContext, CommandResult } from '../types/cli-types.js';
import { output } from '../utils/output-formatter.js';

/**
 * Initialize Context-Pods project configuration
 */
export async function initCommand(
  name: string | undefined,
  options: { template?: string; description?: string; force?: boolean },
  context: CommandContext
): Promise<CommandResult> {
  try {
    output.info('Initializing Context-Pods project configuration...');
    
    // Check if project config already exists
    const existingConfig = await configManager.loadProjectConfig();
    if (existingConfig && !options.force) {
      const shouldOverwrite = await confirmOverwrite();
      if (!shouldOverwrite) {
        return { success: false, message: 'Initialization cancelled by user' };
      }
    }
    
    // Collect project information
    const projectInfo = await collectProjectInfo(name, options, context);
    
    // Create project configuration
    output.startSpinner('Creating project configuration...');
    const config = await configManager.initProjectConfig(projectInfo);
    output.succeedSpinner('Project configuration created');
    
    // Display success information
    displaySuccess(config);
    
    return {
      success: true,
      message: 'Project initialized successfully',
      data: config,
    };
    
  } catch (error) {
    output.stopSpinner();
    output.error('Failed to initialize project', error as Error);
    return {
      success: false,
      error: error as Error,
      message: error instanceof Error ? error.message : 'Initialization failed',
    };
  }
}

/**
 * Confirm overwrite of existing configuration
 */
async function confirmOverwrite(): Promise<boolean> {
  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: 'Project configuration already exists. Overwrite?',
    default: false,
  }]);
  
  return confirm;
}

/**
 * Collect project information interactively
 */
async function collectProjectInfo(
  name: string | undefined,
  options: { template?: string; description?: string },
  context: CommandContext
): Promise<{ name: string; description?: string; template?: string }> {
  const questions: any[] = [];
  
  // Project name
  if (!name) {
    questions.push({
      type: 'input',
      name: 'name',
      message: 'Project name:',
      default: require('path').basename(context.workingDir),
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Project name is required';
        }
        
        const namePattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
        if (!namePattern.test(input)) {
          return 'Name must start with a letter and contain only letters, numbers, hyphens, and underscores';
        }
        
        return true;
      },
    });
  }
  
  // Project description
  if (!options.description) {
    questions.push({
      type: 'input',
      name: 'description',
      message: 'Project description (optional):',
    });
  }
  
  // Preferred template
  if (!options.template) {
    try {
      const templateSelector = new TemplateSelector(context.templatePaths[0] || './templates');
      const availableTemplates = await templateSelector.getAvailableTemplates();
      
      if (availableTemplates.length > 0) {
        const templateChoices = [
          { name: 'No preference (auto-select)', value: undefined },
          ...availableTemplates.map(template => ({
            name: `${template.template.name} (${template.template.language}) - ${template.template.description || 'No description'}`,
            value: template.template.name,
            short: template.template.name,
          })),
        ];
        
        questions.push({
          type: 'list',
          name: 'template',
          message: 'Preferred template:',
          choices: templateChoices,
          default: undefined,
        });
      }
    } catch (error) {
      output.debug(`Failed to load templates: ${(error as Error).message}`);
    }
  }
  
  const answers = await inquirer.prompt(questions);
  
  return {
    name: name || answers.name,
    description: options.description || answers.description || undefined,
    template: options.template || answers.template || undefined,
  };
}

/**
 * Display success information
 */
function displaySuccess(config: any): void {
  output.success('Project initialized successfully!');
  output.divider();
  
  output.table([
    { label: 'Project Name', value: config.name, color: 'cyan' },
    { label: 'Version', value: config.version, color: 'gray' },
    { label: 'Description', value: config.description || 'No description' },
    { label: 'Preferred Template', value: config.templates.preferred || 'Auto-select', color: 'blue' },
    { label: 'Output Directory', value: config.output.directory, color: 'yellow' },
  ]);
  
  output.divider();
  output.info('Next steps:');
  output.list([
    `${output.command('context-pods generate')} - Generate a new MCP server`,
    `${output.command('context-pods wrap script.js')} - Wrap an existing script`,
    `${output.command('context-pods templates')} - List available templates`,
  ]);
  
  output.info('\n💡 Configuration saved to context-pods.json');
}