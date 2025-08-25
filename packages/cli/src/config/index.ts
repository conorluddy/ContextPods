/**
 * Configuration management for Context-Pods CLI
 */

import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

// import { z } from 'zod'; // Will be used later for validation
import type { CLIConfig, ProjectConfig } from '../types/cli-types.js';
import { CLIConfigSchema, ProjectConfigSchema } from '../types/cli-types.js';

/**
 * Default CLI configuration
 */
const DEFAULT_CLI_CONFIG: CLIConfig = {
  templatesPath: './templates',
  outputPath: './generated',
  cacheDir: path.join(os.homedir(), '.context-pods', 'cache'),
  turbo: {
    enabled: true,
    tasks: ['build', 'test', 'lint'],
    caching: true,
  },
  registry: {
    enabled: true,
    path: path.join(os.homedir(), '.context-pods', 'registry.db'),
  },
  dev: {
    hotReload: true,
    watchPatterns: ['**/*.ts', '**/*.js'],
    port: 3001,
  },
};

/**
 * Configuration file paths
 */
export const CONFIG_PATHS = {
  global: path.join(os.homedir(), '.context-pods', 'config.json'),
  project: path.join(process.cwd(), 'context-pods.json'),
} as const;

/**
 * Configuration manager class
 */
export class ConfigManager {
  private globalConfig?: CLIConfig;
  private projectConfig?: ProjectConfig;

  /**
   * Load global configuration
   */
  async loadGlobalConfig(): Promise<CLIConfig> {
    if (this.globalConfig) {
      return this.globalConfig;
    }

    try {
      const configPath = CONFIG_PATHS.global;
      const configDir = path.dirname(configPath);

      // Ensure config directory exists
      await fs.mkdir(configDir, { recursive: true });

      // Try to read existing config
      const configContent = await fs.readFile(configPath, 'utf-8');
      const rawConfig = JSON.parse(configContent);

      // Validate and parse config
      this.globalConfig = CLIConfigSchema.parse(rawConfig);
      return this.globalConfig;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Config file doesn't exist, create default
        this.globalConfig = { ...DEFAULT_CLI_CONFIG };
        await this.saveGlobalConfig(this.globalConfig);
        return this.globalConfig;
      }

      // Invalid config, use default and warn
      console.warn('Invalid global configuration, using defaults');
      this.globalConfig = { ...DEFAULT_CLI_CONFIG };
      return this.globalConfig;
    }
  }

  /**
   * Save global configuration
   */
  async saveGlobalConfig(config: CLIConfig): Promise<void> {
    const configPath = CONFIG_PATHS.global;
    const configDir = path.dirname(configPath);

    // Ensure config directory exists
    await fs.mkdir(configDir, { recursive: true });

    // Validate config before saving
    const validatedConfig = CLIConfigSchema.parse(config);

    // Save config
    await fs.writeFile(configPath, JSON.stringify(validatedConfig, null, 2));
    this.globalConfig = validatedConfig;
  }

  /**
   * Load project configuration
   */
  async loadProjectConfig(): Promise<ProjectConfig | undefined> {
    if (this.projectConfig) {
      return this.projectConfig;
    }

    try {
      const configPath = CONFIG_PATHS.project;
      const configContent = await fs.readFile(configPath, 'utf-8');
      const rawConfig = JSON.parse(configContent);

      // Validate and parse config
      this.projectConfig = ProjectConfigSchema.parse(rawConfig);
      return this.projectConfig;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // No project config found
        return undefined;
      }

      // Invalid config, warn and return undefined
      console.warn('Invalid project configuration, ignoring');
      return undefined;
    }
  }

  /**
   * Save project configuration
   */
  async saveProjectConfig(config: ProjectConfig): Promise<void> {
    const configPath = CONFIG_PATHS.project;

    // Validate config before saving
    const validatedConfig = ProjectConfigSchema.parse(config);

    // Save config
    await fs.writeFile(configPath, JSON.stringify(validatedConfig, null, 2));
    this.projectConfig = validatedConfig;
  }

  /**
   * Initialize project configuration
   */
  async initProjectConfig(options: {
    name: string;
    description?: string;
    template?: string;
  }): Promise<ProjectConfig> {
    const config: ProjectConfig = {
      name: options.name,
      version: '1.0.0',
      description: options.description,
      templates: {
        preferred: options.template,
        fallback: 'basic',
      },
      output: {
        directory: './generated',
        clean: false,
      },
      build: {
        target: 'node18',
        sourcemap: true,
        minify: false,
      },
    };

    await this.saveProjectConfig(config);
    return config;
  }

  /**
   * Get merged configuration (global + project)
   */
  async getConfig(): Promise<{ global: CLIConfig; project?: ProjectConfig }> {
    const [global, project] = await Promise.all([
      this.loadGlobalConfig(),
      this.loadProjectConfig(),
    ]);

    return { global, project };
  }

  /**
   * Reset global configuration to defaults
   */
  async resetGlobalConfig(): Promise<void> {
    await this.saveGlobalConfig({ ...DEFAULT_CLI_CONFIG });
  }

  /**
   * Clear cached configurations
   */
  clearCache(): void {
    this.globalConfig = undefined;
    this.projectConfig = undefined;
  }
}

/**
 * Global configuration manager instance
 */
export const configManager = new ConfigManager();
