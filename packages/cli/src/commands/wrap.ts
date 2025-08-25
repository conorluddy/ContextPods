/**
 * Wrap command implementation
 */

import { promises as fs } from 'fs';
import path from 'path';

import type { TemplateSelectionResult } from '@context-pods/core';
import { TemplateSelector, DefaultTemplateEngine } from '@context-pods/core';
import inquirer from 'inquirer';

import type { WrapOptions, CommandContext, CommandResult } from '../types/cli-types.js';
import { CacheManager } from '../utils/cache-manager.js';
import { output } from '../utils/output-formatter.js';

/**
 * Script analysis result
 */
interface ScriptAnalysis {
  language: string;
  features: string[];
  dependencies: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  hasExports: boolean;
  hasImports: boolean;
}

/**
 * Wrap a script as an MCP server
 */
export async function wrapCommand(
  scriptPath: string,
  options: WrapOptions,
  context: CommandContext,
): Promise<CommandResult> {
  try {
    output.info(`Wrapping script: ${output.path(scriptPath)}`);

    // Step 1: Validate script path
    const resolvedScriptPath = path.resolve(context.workingDir, scriptPath);
    await validateScriptPath(resolvedScriptPath);

    // Step 2: Analyze script
    output.startSpinner('Analyzing script...');
    const analysis = await analyzeScript(resolvedScriptPath, context);
    output.succeedSpinner('Script analysis complete');

    if (context.verbose) {
      displayAnalysis(analysis);
    }

    // Step 3: Determine server name
    const serverName = await determineServerName(options, resolvedScriptPath);

    // Step 4: Select template
    output.startSpinner('Selecting optimal template...');
    const template = await selectTemplate(options, analysis, context, resolvedScriptPath);
    output.succeedSpinner(`Selected template: ${output.template(template.template.name)}`);

    // Step 5: Prepare output path
    const outputPath = await prepareOutputPath(options, context, serverName);

    // Step 6: Check if output exists
    if (!options.force && (await pathExists(outputPath))) {
      const shouldOverwrite = await confirmOverwrite(outputPath);
      if (!shouldOverwrite) {
        return { success: false, message: 'Operation cancelled by user' };
      }
    }

    // Step 7: Prepare template variables
    const variables = await prepareTemplateVariables(
      serverName,
      options,
      analysis,
      resolvedScriptPath,
      template,
    );

    // Step 8: Generate MCP server
    output.startSpinner('Generating MCP server...');
    await generateMCPServer(template, variables, outputPath, context);
    output.succeedSpinner('MCP server generated successfully');

    // Step 9: Display success information
    displaySuccess(serverName, outputPath, template.template.name);

    return {
      success: true,
      message: `MCP server '${serverName}' created successfully`,
      data: {
        name: serverName,
        path: outputPath,
        template: template.template.name,
        language: analysis.language,
      },
    };
  } catch (error) {
    output.stopSpinner();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    output.error('Failed to wrap script', error as Error);

    return {
      success: false,
      error: error as Error,
      message: errorMessage,
    };
  }
}

/**
 * Validate script path exists and is accessible
 */
async function validateScriptPath(scriptPath: string): Promise<void> {
  try {
    const stat = await fs.stat(scriptPath);
    if (!stat.isFile()) {
      throw new Error(`Path is not a file: ${scriptPath}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Script file not found: ${scriptPath}`);
    }
    throw error;
  }
}

/**
 * Analyze script to determine language and characteristics
 */
async function analyzeScript(scriptPath: string, context: CommandContext): Promise<ScriptAnalysis> {
  const cacheManager = new CacheManager(context.config);

  // Check cache first
  const cached = await cacheManager.getCachedAnalysis(scriptPath);
  if (cached) {
    output.debug('Using cached script analysis');
    return cached;
  }

  const content = await fs.readFile(scriptPath, 'utf-8');
  const ext = path.extname(scriptPath).toLowerCase();

  const analysis: ScriptAnalysis = {
    language: detectLanguage(ext, content),
    features: detectFeatures(content),
    dependencies: detectDependencies(content, ext),
    complexity: assessComplexity(content),
    hasExports: hasExports(content, ext),
    hasImports: hasImports(content, ext),
  };

  // Cache the analysis
  await cacheManager.cacheAnalysis(scriptPath, analysis);

  return analysis;
}

/**
 * Detect script language from extension and content
 */
function detectLanguage(ext: string, content: string): string {
  switch (ext) {
    case '.js':
    case '.mjs':
      return content.includes('import ') || content.includes('export ')
        ? 'javascript-es6'
        : 'javascript';
    case '.ts':
      return 'typescript';
    case '.py':
      return 'python';
    case '.sh':
    case '.bash':
      return 'shell';
    case '.rs':
      return 'rust';
    default:
      // Try to detect from shebang
      const lines = content.split('\n');
      if (lines.length > 0) {
        const firstLine = lines[0];
        if (firstLine?.startsWith('#!')) {
          if (firstLine.includes('node')) return 'javascript';
          if (firstLine.includes('python')) return 'python';
          if (firstLine.includes('bash') || firstLine.includes('sh')) return 'shell';
        }
      }
      return 'unknown';
  }
}

/**
 * Detect script features
 */
function detectFeatures(content: string): string[] {
  const features: string[] = [];

  if (content.includes('async ') || content.includes('await ')) {
    features.push('async');
  }

  if (content.includes('class ')) {
    features.push('classes');
  }

  if (content.includes('function ') || content.includes('=>')) {
    features.push('functions');
  }

  if (content.includes('import ') || content.includes('require(')) {
    features.push('modules');
  }

  if (content.includes('process.argv') || content.includes('sys.argv')) {
    features.push('cli-args');
  }

  if (content.includes('fs.') || content.includes('open(')) {
    features.push('file-io');
  }

  if (content.includes('http') || content.includes('fetch') || content.includes('requests')) {
    features.push('network');
  }

  return features;
}

/**
 * Detect dependencies
 */
function detectDependencies(content: string, ext: string): string[] {
  const dependencies: string[] = [];

  if (ext === '.js' || ext === '.ts' || ext === '.mjs') {
    // Node.js dependencies
    const requireMatches = content.match(/require\(['"`]([^'"`]+)['"`]\)/g);
    const importMatches = content.match(/import .+ from ['"`]([^'"`]+)['"`]/g);

    const allMatches = [...(requireMatches || []), ...(importMatches || [])];
    allMatches.forEach((match) => {
      const dep = match.match(/['"`]([^'"`]+)['"`]/)?.[1];
      if (dep && !dep.startsWith('.') && !dep.startsWith('/')) {
        dependencies.push(dep);
      }
    });
  } else if (ext === '.py') {
    // Python dependencies
    const importMatches = content.match(/^import\s+(\w+)/gm);
    const fromMatches = content.match(/^from\s+(\w+)/gm);

    const allMatches = [...(importMatches || []), ...(fromMatches || [])];
    allMatches.forEach((match) => {
      const dep = match.split(/\s+/)[1];
      if (dep && !['os', 'sys', 'json', 'time', 'datetime', 're'].includes(dep)) {
        dependencies.push(dep);
      }
    });
  }

  return [...new Set(dependencies)];
}

/**
 * Assess script complexity
 */
function assessComplexity(content: string): 'simple' | 'moderate' | 'complex' {
  const lines = content.split('\n').filter((line) => line.trim().length > 0);
  const functionCount = (content.match(/function\s+\w+|def\s+\w+|=>\s*{/g) || []).length;
  const classCount = (content.match(/class\s+\w+/g) || []).length;

  if (lines.length < 50 && functionCount <= 3 && classCount === 0) {
    return 'simple';
  } else if (lines.length < 200 && functionCount <= 10 && classCount <= 2) {
    return 'moderate';
  } else {
    return 'complex';
  }
}

/**
 * Check if script has exports
 */
function hasExports(content: string, ext: string): boolean {
  if (ext === '.js' || ext === '.ts' || ext === '.mjs') {
    return content.includes('export ') || content.includes('module.exports');
  } else if (ext === '.py') {
    return content.includes('__all__') || content.includes('def ') || content.includes('class ');
  }
  return false;
}

/**
 * Check if script has imports
 */
function hasImports(content: string, ext: string): boolean {
  if (ext === '.js' || ext === '.ts' || ext === '.mjs') {
    return content.includes('import ') || content.includes('require(');
  } else if (ext === '.py') {
    return content.includes('import ') || content.includes('from ');
  }
  return false;
}

/**
 * Display script analysis results
 */
function displayAnalysis(analysis: ScriptAnalysis): void {
  output.info('Script Analysis:');
  output.table([
    { label: 'Language', value: analysis.language, color: 'cyan' },
    {
      label: 'Complexity',
      value: analysis.complexity,
      color:
        analysis.complexity === 'simple'
          ? 'green'
          : analysis.complexity === 'moderate'
            ? 'yellow'
            : 'red',
    },
    {
      label: 'Has Exports',
      value: analysis.hasExports ? 'Yes' : 'No',
      color: analysis.hasExports ? 'green' : 'gray',
    },
    {
      label: 'Has Imports',
      value: analysis.hasImports ? 'Yes' : 'No',
      color: analysis.hasImports ? 'green' : 'gray',
    },
    { label: 'Features', value: analysis.features.join(', ') || 'None detected' },
    { label: 'Dependencies', value: analysis.dependencies.join(', ') || 'None detected' },
  ]);
}

/**
 * Determine server name
 */
async function determineServerName(options: WrapOptions, scriptPath: string): Promise<string> {
  if (options.name) {
    return options.name;
  }

  const basename = path.basename(scriptPath, path.extname(scriptPath));
  const defaultName = basename.replace(/[^a-zA-Z0-9_-]/g, '-');

  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Enter MCP server name:',
      default: defaultName,
      validate: (input: string): boolean | string => {
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
 * Select appropriate template
 */
async function selectTemplate(
  options: WrapOptions,
  _analysis: ScriptAnalysis,
  context: CommandContext,
  scriptPath: string,
): Promise<TemplateSelectionResult> {
  const templateSelector = new TemplateSelector(context.templatePaths[0] || './templates');

  if (options.template) {
    // User specified template - find it in available templates
    const templates = await templateSelector.getAvailableTemplates();
    const template = templates.find((t) => t.template.name === options.template);
    if (!template) {
      throw new Error(`Template not found: ${options.template}`);
    }
    return template;
  }

  // Auto-select template based on analysis
  const suggestions = await templateSelector.getTemplateSuggestions(scriptPath);

  if (suggestions.length === 0) {
    throw new Error('No suitable templates found for this script');
  }

  // Use the highest-scored template
  const bestTemplate = suggestions[0];
  if (!bestTemplate) {
    throw new Error('No suitable templates found after suggestions');
  }
  return bestTemplate;
}

/**
 * Prepare output path
 */
async function prepareOutputPath(
  options: WrapOptions,
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
 * Prepare template variables
 */
async function prepareTemplateVariables(
  serverName: string,
  options: WrapOptions,
  analysis: ScriptAnalysis,
  scriptPath: string,
  _template: TemplateSelectionResult,
): Promise<Record<string, any>> {
  const variables: Record<string, any> = {
    serverName,
    serverDescription: options.description || `MCP server wrapping ${path.basename(scriptPath)}`,
    scriptPath: path.relative(process.cwd(), scriptPath),
    language: analysis.language,
    features: analysis.features,
    dependencies: analysis.dependencies,
    complexity: analysis.complexity,
    hasExports: analysis.hasExports,
    hasImports: analysis.hasImports,
  };

  // Add any user-provided variables
  if (options.variables) {
    Object.assign(variables, options.variables);
  }

  return variables;
}

/**
 * Generate MCP server using template engine
 */
async function generateMCPServer(
  template: TemplateSelectionResult,
  variables: Record<string, any>,
  outputPath: string,
  context: CommandContext,
): Promise<void> {
  const templateEngine = new DefaultTemplateEngine();

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
  });
}

/**
 * Display success information
 */
function displaySuccess(serverName: string, outputPath: string, templateName: string): void {
  output.success(`MCP server created successfully!`);
  output.divider();

  output.table([
    { label: 'Server Name', value: serverName, color: 'cyan' },
    { label: 'Output Path', value: outputPath, color: 'yellow' },
    { label: 'Template Used', value: templateName, color: 'blue' },
  ]);

  output.divider();
  output.info('Next steps:');
  output.list([
    `cd ${path.relative(process.cwd(), outputPath)}`,
    'npm install',
    'npm run build',
    'npm run dev',
  ]);
}
