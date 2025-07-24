/**
 * Templates command implementation
 */

import { TemplateSelector } from '@context-pods/core';
import type { CommandContext, CommandResult, TemplateInfo } from '../types/cli-types.js';
import { output } from '../utils/output-formatter.js';

/**
 * List available templates
 */
export async function templatesCommand(
  options: { all?: boolean; format?: 'table' | 'json' },
  context: CommandContext,
): Promise<CommandResult> {
  try {
    output.startSpinner('Loading templates...');

    const templates = await loadTemplates(context);

    output.stopSpinner();

    if (templates.length === 0) {
      output.warn('No templates found');
      output.info('Template directories searched:');
      context.templatePaths.forEach((path) => {
        output.list([output.path(path)]);
      });

      return {
        success: true,
        message: 'No templates found',
        data: [],
      };
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(templates, null, 2));
    } else {
      displayTemplatesTable(templates, context);
    }

    return {
      success: true,
      message: `Found ${templates.length} template(s)`,
      data: templates,
    };
  } catch (error) {
    output.stopSpinner();
    output.error('Failed to load templates', error as Error);
    return {
      success: false,
      error: error as Error,
      message: error instanceof Error ? error.message : 'Failed to load templates',
    };
  }
}

/**
 * Load templates from all template paths
 */
async function loadTemplates(context: CommandContext): Promise<TemplateInfo[]> {
  const allTemplates: TemplateInfo[] = [];

  for (const templatePath of context.templatePaths) {
    try {
      const templateSelector = new TemplateSelector(templatePath);
      const templates = await templateSelector.getAvailableTemplates();

      for (const template of templates) {
        const templateInfo: TemplateInfo = {
          name: template.template.name,
          path: template.templatePath,
          language: template.template.language || 'unknown',
          description: template.template.description,
          version: template.template.version,
          optimized: template.template.optimization?.turboRepo || false,
        };

        // Avoid duplicates (prefer first occurrence)
        if (!allTemplates.some((t) => t.name === templateInfo.name)) {
          allTemplates.push(templateInfo);
        }
      }
    } catch (error) {
      if (context.verbose) {
        output.debug(`Failed to load templates from ${templatePath}: ${(error as Error).message}`);
      }
      // Continue with other paths
    }
  }

  return allTemplates.sort((a, b) => {
    // Sort by optimized first, then by name
    if (a.optimized && !b.optimized) return -1;
    if (!a.optimized && b.optimized) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Display templates in table format
 */
function displayTemplatesTable(templates: TemplateInfo[], context: CommandContext): void {
  output.info(`Found ${templates.length} template(s):`);
  output.divider();

  // Group templates by category
  const optimized = templates.filter((t) => t.optimized);
  const standard = templates.filter((t) => !t.optimized);

  if (optimized.length > 0) {
    output.info('🚀 TurboRepo Optimized Templates:');
    displayTemplateGroup(optimized, context.verbose);

    if (standard.length > 0) {
      console.log();
    }
  }

  if (standard.length > 0) {
    output.info('📦 Standard Templates:');
    displayTemplateGroup(standard, context.verbose);
  }

  output.divider();

  // Show usage examples
  output.info('Usage examples:');
  output.list([
    `${output.command('context-pods generate')} ${output.template(templates[0]?.name || 'template-name')}`,
    `${output.command('context-pods wrap script.js')} --template ${output.template(templates[0]?.name || 'template-name')}`,
  ]);

  // Show template paths
  if (context.verbose) {
    console.log();
    output.info('Template search paths:');
    context.templatePaths.forEach((path) => {
      output.list([output.path(path)]);
    });
  }
}

/**
 * Display a group of templates
 */
function displayTemplateGroup(templates: TemplateInfo[], verbose = false): void {
  templates.forEach((template, index) => {
    const languageColor = getLanguageColor(template.language);
    const optimizedBadge = template.optimized ? ' ⚡' : '';

    output.info(`${index + 1}. ${output.template(template.name)}${optimizedBadge}`);

    const tableData = [
      { label: '  Language', value: template.language, color: languageColor },
      { label: '  Description', value: template.description || 'No description' },
    ];

    if (template.version) {
      tableData.push({ label: '  Version', value: template.version, color: 'gray' });
    }

    if (verbose) {
      tableData.push({ label: '  Path', value: template.path, color: 'yellow' });
    }

    output.table(tableData);

    if (index < templates.length - 1) {
      console.log();
    }
  });
}

/**
 * Get color for language
 */
function getLanguageColor(language: string): string {
  switch (language.toLowerCase()) {
    case 'typescript':
    case 'javascript':
    case 'javascript-es6':
      return 'blue';
    case 'python':
      return 'yellow';
    case 'rust':
      return 'red';
    case 'shell':
    case 'bash':
      return 'green';
    default:
      return 'gray';
  }
}
