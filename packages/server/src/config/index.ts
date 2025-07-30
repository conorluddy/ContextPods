/**
 * Configuration module for Context-Pods server
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolveTemplatePath } from '@context-pods/core';

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
 * Get templates directory path using consolidated resolution
 */
export function getTemplatesPath(): string {
  return resolveTemplatePath({
    envVar: 'CONTEXT_PODS_TEMPLATES_PATH',
  });
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
