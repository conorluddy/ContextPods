/**
 * Configuration module for Context-Pods server
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

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
 * Get a robust path to the templates directory with multiple fallback strategies
 */
function getTemplatesPathRobust(): string {
  const moduleDir = getModuleDir();

  // Strategy 1: Try to find project root intelligently
  try {
    const projectRoot = findProjectRoot(moduleDir);
    const templatesPath = join(projectRoot, 'templates');

    if (existsSync(templatesPath)) {
      return templatesPath;
    }
  } catch (error) {
    // Continue to fallback strategies
  }

  // Strategy 2: Use corrected relative path for built files
  // From packages/server/dist/src/config/ go up 5 levels to reach project root
  const correctedPath = join(moduleDir, '../../../../../templates');
  if (existsSync(correctedPath)) {
    return correctedPath;
  }

  // Strategy 3: Try original path in case build structure changes
  const originalPath = join(moduleDir, '../../../templates');
  if (existsSync(originalPath)) {
    return originalPath;
  }

  // Strategy 4: Try from source directory perspective
  // From packages/server/src/config/ go up 4 levels to reach project root
  const sourcePath = join(moduleDir, '../../../../templates');
  if (existsSync(sourcePath)) {
    return sourcePath;
  }

  // If all strategies fail, return the most likely correct path
  // This will be used by calling code which should handle the missing directory
  return correctedPath;
}

/**
 * Get templates directory path
 */
export function getTemplatesPath(): string {
  // Strategy 0: Environment variable override (highest priority)
  if (process.env.CONTEXT_PODS_TEMPLATES_PATH) {
    return process.env.CONTEXT_PODS_TEMPLATES_PATH;
  }

  // Use robust path resolution with multiple fallback strategies
  return getTemplatesPathRobust();
}

/**
 * Get registry database path
 */
export function getRegistryPath(): string {
  // Allow override via environment variable
  if (process.env.CONTEXT_PODS_REGISTRY_PATH) {
    return process.env.CONTEXT_PODS_REGISTRY_PATH;
  }

  // Default: in server package data directory
  const moduleDir = getModuleDir();
  return join(moduleDir, '../data/registry.db');
}

/**
 * Get output mode for generated MCPs
 */
export function getOutputMode(): 'workspace' | 'external' {
  const mode = process.env.CONTEXT_PODS_OUTPUT_MODE;
  return mode === 'external' ? 'external' : 'workspace';
}

/**
 * Get generated packages directory
 */
export function getGeneratedPackagesPath(): string {
  // Allow override via environment variable
  if (process.env.CONTEXT_PODS_GENERATED_PATH) {
    return process.env.CONTEXT_PODS_GENERATED_PATH;
  }

  const outputMode = getOutputMode();
  const moduleDir = getModuleDir();

  if (outputMode === 'workspace') {
    // Generate into workspace packages directory
    return join(moduleDir, '../../../packages');
  } else {
    // Generate into external directory
    return join(process.cwd(), 'generated-mcps');
  }
}

/**
 * Main configuration object
 */
export const CONFIG = {
  templatesPath: getTemplatesPath(),
  registryPath: getRegistryPath(),
  outputMode: getOutputMode(),
  generatedPackagesPath: getGeneratedPackagesPath(),

  // Server configuration
  server: {
    name: 'context-pods-server',
    version: '0.0.1',
  },

  // Database configuration
  database: {
    busyTimeout: 30000, // 30 seconds
    journalMode: 'WAL',
    synchronous: 'NORMAL',
  },
} as const;
