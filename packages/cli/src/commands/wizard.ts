/**
 * Wizard command - Interactive guided setup for first-time users
 */

import { TemplateSelector } from '@context-pods/core';
import inquirer from 'inquirer';

import type { CommandContext } from '../types/cli-types.js';
import { output } from '../utils/output-formatter.js';

import { generateCommand } from './generate.js';

export interface WizardOptions {
  skipIntro?: boolean;
}

/**
 * Interactive wizard for first-time users
 */
export async function wizardCommand(
  options: WizardOptions,
  context: CommandContext,
): Promise<void> {
  if (!options.skipIntro) {
    await showWelcome();
  }

  try {
    // Step 1: Understand user's goal
    const { goal } = await inquirer.prompt([
      {
        type: 'list',
        name: 'goal',
        message: 'What would you like to do?',
        choices: [
          {
            name: 'Create a new MCP server from scratch',
            value: 'generate',
            short: 'Generate MCP server',
          },
          {
            name: 'Wrap an existing script as an MCP server',
            value: 'wrap',
            short: 'Wrap script',
          },
          {
            name: 'Set up project configuration',
            value: 'init',
            short: 'Initialize project',
          },
          {
            name: 'Explore available templates',
            value: 'templates',
            short: 'Browse templates',
          },
        ],
      },
    ]);

    switch (goal) {
      case 'generate':
        await runGenerateWizard(context);
        break;
      case 'wrap':
        await runWrapWizard(context);
        break;
      case 'init':
        await runInitWizard(context);
        break;
      case 'templates':
        await runTemplateExplorer(context);
        break;
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'User force closed the prompt') {
      output.warn('\n👋 Wizard cancelled by user');
      return;
    }
    throw error;
  }
}

/**
 * Show welcome message and introduction
 */
async function showWelcome(): Promise<void> {
  output.info('🚀 Welcome to Context-Pods Interactive Wizard!');
  output.info('==============================================');
  output.info('');
  output.info('This wizard will help you:');
  output.info('  • Create new MCP servers from templates');
  output.info('  • Wrap existing scripts as MCP servers');
  output.info('  • Set up project configuration');
  output.info('  • Explore available templates');
  output.info('');
  output.info('💡 You can exit anytime with Ctrl+C');
  output.info('');

  const { shouldContinue } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldContinue',
      message: 'Ready to get started?',
      default: true,
    },
  ]);

  if (!shouldContinue) {
    output.info("👋 Come back anytime when you're ready!");
    process.exit(0);
  }

  output.info('');
}

/**
 * Interactive template-based generation wizard
 */
async function runGenerateWizard(context: CommandContext): Promise<void> {
  output.info('📝 MCP Server Generation Wizard');
  output.info('================================');

  // Get server name and basic info
  const basicInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'serverName',
      message: 'What do you want to name your MCP server?',
      validate: (input: string): string | boolean => {
        if (!input.trim()) return 'Server name is required';
        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(input)) {
          return 'Server name must start with a letter and contain only letters, numbers, hyphens, and underscores';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'description',
      message: 'Describe what your MCP server will do (optional):',
    },
    {
      type: 'list',
      name: 'language',
      message: 'Which programming language do you prefer?',
      choices: [
        { name: 'TypeScript - Modern TypeScript with full type safety', value: 'typescript' },
        { name: 'JavaScript - Plain JavaScript with ES modules', value: 'javascript' },
        { name: 'Python - Python 3.8+ with async/await support', value: 'python' },
        { name: 'Rust - Rust with tokio async runtime', value: 'rust' },
        { name: 'Shell - POSIX shell script wrapper', value: 'shell' },
      ],
    },
  ]);

  const { serverName, description, language } = basicInfo;

  // Get available templates for the selected language
  output.info('\n🔍 Finding templates for your language...');
  const templateSelector = new TemplateSelector(context.templatePaths[0] || '.');
  const availableTemplates = await templateSelector.getAvailableTemplates();
  const languageTemplates = availableTemplates.filter((t) => t.template.language === language);

  if (languageTemplates.length === 0) {
    output.error(`❌ No templates found for ${language}`);
    output.info('Available languages:');
    const langs = [...new Set(availableTemplates.map((t) => t.template.language))];
    langs.forEach((lang) => output.info(`  • ${lang}`));
    return;
  }

  // Template selection with preview
  const templateSelection = await inquirer.prompt([
    {
      type: 'list',
      name: 'template',
      message: `Choose a ${language} template:`,
      choices: languageTemplates.map((t) => ({
        name: `${t.template.name} - ${t.template.description}`,
        value: t.template.name,
        short: t.template.name,
      })),
    },
    {
      type: 'confirm',
      name: 'wantsAdvancedOptions',
      message: 'Would you like to configure advanced options?',
      default: false,
    },
  ]);

  const { template, wantsAdvancedOptions } = templateSelection;

  let outputDir = context.outputPath;
  const variables: Record<string, string> = {};
  let generateConfig = false;

  if (wantsAdvancedOptions) {
    // Output directory
    const { outputDirectory } = await inquirer.prompt([
      {
        type: 'input',
        name: 'outputDirectory',
        message: 'Output directory:',
        default: context.outputPath,
      },
    ]);
    outputDir = outputDirectory;

    // Template variables (simplified)
    const selectedTemplate = languageTemplates.find((t) => t.template.name === template);
    if (
      selectedTemplate?.template.variables &&
      Object.keys(selectedTemplate.template.variables).length > 0
    ) {
      const { configureVars } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'configureVars',
          message: 'This template has customizable variables. Configure them?',
          default: false,
        },
      ]);

      if (configureVars) {
        for (const [key, varDef] of Object.entries(selectedTemplate.template.variables)) {
          const varDefTyped = varDef as any;
          const { [key]: value } = await inquirer.prompt([
            {
              type: 'input',
              name: key,
              message: `${varDefTyped.description || key}:`,
              default: varDefTyped.default as string,
            },
          ]);
          if (value) {
            variables[key] = value as string;
          }
        }
      }
    }

    // MCP configuration
    const { mcpConfig } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'mcpConfig',
        message: 'Generate .mcp.json configuration file?',
        default: false,
      },
    ]);
    generateConfig = mcpConfig;
  }

  // Summary
  output.info('\n📋 Generation Summary');
  output.info('====================');
  output.info(`Name: ${serverName}`);
  output.info(`Template: ${template}`);
  output.info(`Language: ${language}`);
  if (description) output.info(`Description: ${description}`);
  output.info(`Output: ${outputDir}`);
  if (Object.keys(variables).length > 0) {
    output.info('Variables:');
    Object.entries(variables).forEach(([key, value]) => {
      output.info(`  ${key}: ${value}`);
    });
  }
  if (generateConfig) output.info('Will generate: .mcp.json config file');

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Generate the MCP server?',
      default: true,
    },
  ]);

  if (!confirmed) {
    output.warn('❌ Generation cancelled');
    return;
  }

  // Generate the server
  output.info('\n🚀 Generating MCP server...');

  const generateOptions = {
    name: serverName,
    description: description || undefined,
    output: outputDir !== context.outputPath ? outputDir : undefined,
    var:
      Object.keys(variables).length > 0
        ? Object.entries(variables).map(([key, value]) => `${key}=${value}`)
        : undefined,
    'generate-mcp-config': generateConfig,
    force: false,
  };

  await generateCommand(template, generateOptions, context);

  output.success('\n🎉 MCP server generated successfully!');
  output.info('\nNext steps:');
  output.info('1. Navigate to your server directory');
  output.info('2. Install dependencies (npm install, pip install, cargo build, etc.)');
  output.info('3. Run your server to test it');
  output.info('4. Configure your MCP client to use the server');
}

/**
 * Interactive script wrapping wizard
 */
async function runWrapWizard(context: CommandContext): Promise<void> {
  output.info('🔧 Script Wrapping Wizard');
  output.info('========================');

  output.info('This wizard will help you wrap an existing script as an MCP server.');
  output.info(
    'Supported script types: Python (.py), Shell (.sh, .bash), JavaScript (.js), TypeScript (.ts)',
  );
  output.info('');

  // Get script information
  const scriptInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'scriptPath',
      message: 'Path to your script file:',
      validate: (input: string): string | boolean => {
        if (!input.trim()) return 'Script path is required';
        // Basic validation - actual file existence will be checked by wrap command
        return true;
      },
    },
    {
      type: 'input',
      name: 'wrapperName',
      message: 'Name for the MCP server wrapper:',
      validate: (input: string): string | boolean => {
        if (!input.trim()) return 'Wrapper name is required';
        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(input)) {
          return 'Name must start with a letter and contain only letters, numbers, hyphens, and underscores';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'description',
      message: 'Describe what this script does (optional):',
    },
    {
      type: 'input',
      name: 'outputDir',
      message: 'Output directory:',
      default: context.outputPath,
    },
  ]);

  const { scriptPath, wrapperName, description, outputDir } = scriptInfo;

  // Summary and confirmation
  output.info('\n📋 Wrapping Summary');
  output.info('==================');
  output.info(`Script: ${scriptPath}`);
  output.info(`Wrapper name: ${wrapperName}`);
  if (description) output.info(`Description: ${description}`);
  output.info(`Output: ${outputDir}`);

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Wrap the script?',
      default: true,
    },
  ]);

  if (!confirmed) {
    output.warn('❌ Wrapping cancelled');
    return;
  }

  // Import and run wrap command
  const { wrapCommand } = await import('./wrap.js');

  const wrapOptions = {
    script: scriptPath,
    name: wrapperName,
    description: description || undefined,
    output: outputDir !== context.outputPath ? outputDir : undefined,
    force: false,
  };

  await wrapCommand(scriptPath, wrapOptions, context);
}

/**
 * Interactive project initialization wizard
 */
async function runInitWizard(context: CommandContext): Promise<void> {
  output.info('⚙️  Project Configuration Wizard');
  output.info('================================');

  const projectInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: 'my-mcp-project',
    },
    {
      type: 'input',
      name: 'projectDescription',
      message: 'Project description:',
    },
    {
      type: 'list',
      name: 'preferredTemplate',
      message: 'Preferred template for new servers:',
      choices: [
        { name: 'TypeScript Basic', value: 'typescript-basic' },
        { name: 'TypeScript Advanced', value: 'typescript-advanced' },
        { name: 'Python Basic', value: 'python-basic' },
        { name: 'JavaScript Basic', value: 'javascript-basic' },
        { name: 'No preference', value: '' },
      ],
    },
  ]);

  const { projectName, projectDescription, preferredTemplate } = projectInfo;

  // Import and run init command
  const { initCommand } = await import('./init.js');

  const initOptions = {
    template: preferredTemplate || undefined,
    description: projectDescription || undefined,
    force: false,
  };

  await initCommand(projectName, initOptions, context);
}

/**
 * Interactive template explorer
 */
async function runTemplateExplorer(context: CommandContext): Promise<void> {
  output.info('🔍 Template Explorer');
  output.info('===================');

  const templateSelector = new TemplateSelector(context.templatePaths[0] || '.');
  const availableTemplates = await templateSelector.getAvailableTemplates();

  if (availableTemplates.length === 0) {
    output.warn('❌ No templates found');
    return;
  }

  // Group templates by language
  const templatesByLanguage = availableTemplates.reduce(
    (acc, t) => {
      const lang = t.template.language;
      if (!acc[lang]) acc[lang] = [];
      acc[lang].push(t);
      return acc;
    },
    {} as Record<string, typeof availableTemplates>,
  );

  // Show overview
  output.info('\n📊 Available Templates:');
  Object.entries(templatesByLanguage).forEach(([lang, templates]) => {
    output.info(`  ${lang}: ${templates.length} template(s)`);
  });
  output.info('');

  // Filter options
  const { viewOption } = await inquirer.prompt([
    {
      type: 'list',
      name: 'viewOption',
      message: 'How would you like to explore templates?',
      choices: [
        { name: 'View all templates', value: 'all' },
        { name: 'Filter by language', value: 'language' },
        { name: 'View template details', value: 'details' },
      ],
    },
  ]);

  switch (viewOption) {
    case 'all':
      await showAllTemplates(availableTemplates);
      break;
    case 'language':
      await showTemplatesByLanguage(templatesByLanguage);
      break;
    case 'details':
      await showTemplateDetails(availableTemplates);
      break;
  }
}

async function showAllTemplates(templates: any[]): Promise<void> {
  output.info('\n📋 All Available Templates:');
  templates.forEach((t, index) => {
    output.info(`\n${index + 1}. ${t.template.name}`);
    output.info(`   Language: ${t.template.language}`);
    output.info(`   Description: ${t.template.description}`);
    output.info(`   Optimization: ${t.template.optimization}`);
    if (t.template.tags?.length) {
      output.info(`   Tags: ${t.template.tags.join(', ')}`);
    }
  });
}

async function showTemplatesByLanguage(templatesByLanguage: Record<string, any[]>): Promise<void> {
  const { selectedLanguage } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedLanguage',
      message: 'Select a language to explore:',
      choices: Object.keys(templatesByLanguage).map((lang) => ({
        name: `${lang} (${templatesByLanguage[lang]?.length || 0} templates)`,
        value: lang,
      })),
    },
  ]);

  const templates = templatesByLanguage[selectedLanguage];
  if (!templates || templates.length === 0) {
    output.warn(`❌ No templates found for ${selectedLanguage}`);
    return;
  }

  output.info(`\n📋 ${selectedLanguage} Templates:`);

  templates.forEach((t, index) => {
    output.info(`\n${index + 1}. ${t.template.name}`);
    output.info(`   Description: ${t.template.description}`);
    output.info(`   Optimization: ${t.template.optimization}`);
    if (t.template.tags?.length) {
      output.info(`   Tags: ${t.template.tags.join(', ')}`);
    }
  });
}

async function showTemplateDetails(templates: any[]): Promise<void> {
  const { selectedTemplate } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedTemplate',
      message: 'Select a template to view details:',
      choices: templates.map((t) => ({
        name: `${t.template.name} (${t.template.language})`,
        value: t,
        short: t.template.name,
      })),
    },
  ]);

  const template = selectedTemplate.template;

  output.info(`\n📋 Template Details: ${template.name}`);
  output.info('='.repeat(20 + template.name.length));
  output.info(`Language: ${template.language}`);
  output.info(`Description: ${template.description}`);
  output.info(`Optimization: ${template.optimization}`);

  if (template.tags?.length) {
    output.info(`Tags: ${template.tags.join(', ')}`);
  }

  if (template.variables && Object.keys(template.variables).length > 0) {
    output.info('\nCustomizable Variables:');
    Object.entries(template.variables).forEach(([key, varDef]: [string, any]) => {
      output.info(`  ${key}: ${varDef.description || 'No description'}`);
      if (varDef.default) output.info(`    Default: ${varDef.default}`);
    });
  }

  output.info(`\nTemplate Path: ${selectedTemplate.templatePath}`);
}
