/**
 * @context-pods/templates - Template collection for MCP server generation
 *
 * This package provides:
 * - Template metadata and discovery
 * - Template validation
 * - Template path resolution
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Get the directory containing this module
 */
function getModuleDir(): string {
  // Handle both CommonJS and ES modules
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }

  // ES module fallback
  const __filename = fileURLToPath(import.meta.url);
  return dirname(__filename);
}

/**
 * Get the path to the templates directory
 */
export function getTemplatesPath(): string {
  const moduleDir = getModuleDir();
  // Templates are copied to the package root during build
  return join(dirname(moduleDir), 'templates');
}

/**
 * Template metadata interface
 */
export interface TemplateMetadata {
  name: string;
  language: string;
  description: string;
  path: string;
}

/**
 * Get all available templates
 */
export function getAvailableTemplates(): TemplateMetadata[] {
  const templatesPath = getTemplatesPath();

  if (!existsSync(templatesPath)) {
    throw new Error(`Templates directory not found: ${templatesPath}`);
  }

  const templates: TemplateMetadata[] = [];
  const items = readdirSync(templatesPath, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      const templatePath = join(templatesPath, item.name);
      const metadataPath = join(templatePath, 'template.json');

      if (existsSync(metadataPath)) {
        try {
          const metadataContent = readFileSync(metadataPath, 'utf8');
          const metadata = JSON.parse(metadataContent) as {
            language?: string;
            description?: string;
          };
          templates.push({
            name: item.name,
            language: metadata.language ?? 'unknown',
            description: metadata.description ?? 'No description available',
            path: templatePath,
          });
        } catch (error) {
          console.warn(`Failed to load template metadata for ${item.name}:`, error);
        }
      }
    }
  }

  return templates;
}

/**
 * Get a specific template by name
 */
export function getTemplate(name: string): TemplateMetadata | null {
  const templates = getAvailableTemplates();
  return templates.find((t) => t.name === name) ?? null;
}

/**
 * Check if a template exists
 */
export function templateExists(name: string): boolean {
  return getTemplate(name) !== null;
}

// Re-export for convenience
export { getTemplatesPath as templatesPath };
