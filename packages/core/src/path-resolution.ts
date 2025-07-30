/**
 * Consolidated path resolution utilities for Context-Pods
 *
 * Provides consistent template path resolution across CLI and server packages
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';

/**
 * Get the directory containing this module (works in both CJS and ESM)
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
 * Find the Context-Pods project root by looking for package.json with the correct name
 */
function findProjectRoot(startDir: string): string {
  let current = startDir;

  while (current !== dirname(current)) {
    const packageJsonPath = join(current, 'package.json');

    if (existsSync(packageJsonPath)) {
      try {
        const packageContent = readFileSync(packageJsonPath, 'utf8');
        const pkg = JSON.parse(packageContent) as { name?: string; workspaces?: unknown };

        // Look for the Context-Pods root package
        if (pkg.name === 'context-pods' && pkg.workspaces) {
          return current;
        }
      } catch (error) {
        // Continue searching if package.json is malformed
      }
    }

    current = dirname(current);
  }

  throw new Error(
    'Could not find Context-Pods project root (package.json with name "context-pods")',
  );
}

/**
 * Template path resolution options
 */
export interface TemplatePathOptions {
  /** Environment variable to check for override */
  envVar?: string;
  /** Additional paths to try */
  additionalPaths?: string[];
  /** Skip bundled template check */
  skipBundled?: boolean;
  /** Skip user home directory check */
  skipUserHome?: boolean;
}

/**
 * Get template paths in priority order following the consolidated strategy:
 * 1. Environment variable (highest priority)
 * 2. Bundled templates in npm package
 * 3. User home directory (~/.context-pods/templates)
 * 4. Development/workspace templates
 * 5. Additional paths provided
 */
export function getTemplatePaths(options: TemplatePathOptions = {}): string[] {
  const {
    envVar = 'CONTEXT_PODS_TEMPLATES_PATH',
    additionalPaths = [],
    skipBundled = false,
    skipUserHome = false,
  } = options;

  const paths: string[] = [];

  // 1. Environment variable (highest priority)
  if (process.env[envVar]) {
    paths.push(process.env[envVar]);
  }

  if (!skipBundled) {
    // 2. Bundled templates (npm package distribution)
    const moduleDir = getModuleDir();
    const bundledPath = join(moduleDir, '../templates');
    paths.push(bundledPath);
  }

  if (!skipUserHome) {
    // 3. User home directory
    const userTemplatesPath = join(homedir(), '.context-pods', 'templates');
    paths.push(userTemplatesPath);
  }

  // 4. Development/workspace templates
  try {
    const moduleDir = getModuleDir();
    const projectRoot = findProjectRoot(moduleDir);
    const workspaceTemplatesPath = join(projectRoot, 'templates');
    paths.push(workspaceTemplatesPath);
  } catch {
    // Project root not found, skip workspace templates
  }

  // 5. Additional paths
  paths.push(...additionalPaths);

  return paths;
}

/**
 * Get the first existing template path from the priority list
 */
export function getFirstExistingTemplatePath(options: TemplatePathOptions = {}): string | null {
  const paths = getTemplatePaths(options);

  for (const path of paths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Get all existing template paths from the priority list
 */
export function getAllExistingTemplatePaths(options: TemplatePathOptions = {}): string[] {
  const paths = getTemplatePaths(options);
  return paths.filter((path) => existsSync(path));
}

/**
 * Get template path with fallback to default if none exist
 * This is the main function that packages should use
 */
export function resolveTemplatePath(options: TemplatePathOptions = {}): string {
  const existingPath = getFirstExistingTemplatePath(options);

  if (existingPath) {
    return existingPath;
  }

  // Return the most likely path for npm package distribution
  const paths = getTemplatePaths(options);
  return paths[1] || paths[0] || './templates'; // Prefer bundled path, then env var, then fallback
}
