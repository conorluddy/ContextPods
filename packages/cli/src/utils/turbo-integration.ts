/**
 * TurboRepo integration utilities for Context-Pods CLI
 */

import { execa } from 'execa';
import type { Result } from 'execa';
import { promises as fs } from 'fs';
import path from 'path';
import type { CLIConfig } from '../types/cli-types.js';
import { output } from './output-formatter.js';

/**
 * TurboRepo configuration interface
 */
interface TurboConfig {
  globalDependencies?: string[];
  pipeline?: Record<
    string,
    {
      dependsOn?: string[];
      outputs?: string[];
      cache?: boolean;
      inputs?: string[];
    }
  >;
}

/**
 * TurboRepo integration manager
 */
export class TurboIntegration {
  private workspaceRoot: string;
  private config: CLIConfig;

  constructor(workspaceRoot: string, config: CLIConfig) {
    this.workspaceRoot = workspaceRoot;
    this.config = config;
  }

  /**
   * Check if TurboRepo is available and enabled
   */
  async isAvailable(): Promise<boolean> {
    if (!this.config.turbo.enabled) {
      return false;
    }

    try {
      // Check if turbo is installed
      await execa('turbo', ['--version'], { cwd: this.workspaceRoot });

      // Check if turbo.json exists
      const turboConfigPath = path.join(this.workspaceRoot, 'turbo.json');
      await fs.access(turboConfigPath);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run a TurboRepo command
   */
  async run(
    command: string,
    options: {
      args?: string[];
      filter?: string;
      cwd?: string;
      verbose?: boolean;
    } = {},
  ): Promise<Result> {
    const { args = [], filter, cwd = this.workspaceRoot, verbose = false } = options;

    const turboArgs = [command, ...args];

    if (filter) {
      turboArgs.push('--filter', filter);
    }

    if (verbose) {
      output.debug(`Running: turbo ${turboArgs.join(' ')}`);
    }

    return await execa('turbo', turboArgs, {
      cwd,
      stdio: verbose ? 'inherit' : 'pipe',
    });
  }

  /**
   * Build specific packages or all packages
   */
  async build(filter?: string, verbose = false): Promise<void> {
    if (!(await this.isAvailable())) {
      throw new Error('TurboRepo is not available. Run npm install or enable turbo in config.');
    }

    output.startSpinner('Building packages...');

    try {
      await this.run('build', { filter, verbose });
      output.succeedSpinner('Build completed successfully');
    } catch (error) {
      output.failSpinner('Build failed');
      throw error;
    }
  }

  /**
   * Run tests for specific packages or all packages
   */
  async test(filter?: string, verbose = false): Promise<void> {
    if (!(await this.isAvailable())) {
      throw new Error('TurboRepo is not available. Run npm install or enable turbo in config.');
    }

    output.startSpinner('Running tests...');

    try {
      await this.run('test', { filter, verbose });
      output.succeedSpinner('Tests completed successfully');
    } catch (error) {
      output.failSpinner('Tests failed');
      throw error;
    }
  }

  /**
   * Run linting for specific packages or all packages
   */
  async lint(filter?: string, verbose = false): Promise<void> {
    if (!(await this.isAvailable())) {
      throw new Error('TurboRepo is not available. Run npm install or enable turbo in config.');
    }

    output.startSpinner('Running linter...');

    try {
      await this.run('lint', { filter, verbose });
      output.succeedSpinner('Linting completed successfully');
    } catch (error) {
      output.failSpinner('Linting failed');
      throw error;
    }
  }

  /**
   * Start development mode
   */
  async dev(filter?: string, _verbose = false): Promise<void> {
    if (!(await this.isAvailable())) {
      throw new Error('TurboRepo is not available. Run npm install or enable turbo in config.');
    }

    output.info('Starting development mode...');

    try {
      // Run in development mode (this will keep running)
      await this.run('dev', { filter, verbose: true });
    } catch (error) {
      output.error('Development mode failed');
      throw error;
    }
  }

  /**
   * Clean build artifacts
   */
  async clean(filter?: string, _verbose = false): Promise<void> {
    if (!(await this.isAvailable())) {
      output.warn('TurboRepo not available, skipping turbo clean');
      return;
    }

    output.startSpinner('Cleaning build artifacts...');

    try {
      await this.run('clean', { filter, verbose: _verbose });
      output.succeedSpinner('Clean completed successfully');
    } catch (error) {
      output.failSpinner('Clean failed');
      throw error;
    }
  }

  /**
   * Get TurboRepo configuration
   */
  async getTurboConfig(): Promise<TurboConfig | null> {
    try {
      const turboConfigPath = path.join(this.workspaceRoot, 'turbo.json');
      const configContent = await fs.readFile(turboConfigPath, 'utf-8');
      return JSON.parse(configContent);
    } catch {
      return null;
    }
  }

  /**
   * Update TurboRepo configuration
   */
  async updateTurboConfig(updates: Partial<TurboConfig>): Promise<void> {
    const turboConfigPath = path.join(this.workspaceRoot, 'turbo.json');

    try {
      const existingConfig = (await this.getTurboConfig()) || {};
      const newConfig = {
        ...existingConfig,
        ...updates,
        pipeline: {
          ...existingConfig.pipeline,
          ...updates.pipeline,
        },
      };

      await fs.writeFile(turboConfigPath, JSON.stringify(newConfig, null, 2));
      output.success('TurboRepo configuration updated');
    } catch (error) {
      output.error('Failed to update TurboRepo configuration');
      throw error;
    }
  }

  /**
   * Add CLI-specific tasks to TurboRepo configuration
   */
  async addCLITasks(): Promise<void> {
    const cliTasks = {
      'cli:wrap': {
        dependsOn: ['build'],
        cache: false,
        outputs: ['generated/**'],
      },
      'cli:generate': {
        dependsOn: ['build'],
        cache: false,
        outputs: ['generated/**'],
      },
      'cli:dev': {
        dependsOn: ['build'],
        cache: false,
        persistent: true,
      },
    };

    await this.updateTurboConfig({
      pipeline: cliTasks,
    });
  }

  /**
   * Check if workspace has Node.js packages that can benefit from optimization
   */
  async hasNodeJSPackages(): Promise<boolean> {
    try {
      const packagesDir = path.join(this.workspaceRoot, 'packages');
      const entries = await fs.readdir(packagesDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const packageJsonPath = path.join(packagesDir, entry.name, 'package.json');
          try {
            await fs.access(packageJsonPath);
            return true;
          } catch {
            // Continue checking other directories
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get workspace packages information
   */
  async getWorkspacePackages(): Promise<
    Array<{ name: string; path: string; hasTypeScript: boolean }>
  > {
    const packages: Array<{ name: string; path: string; hasTypeScript: boolean }> = [];

    try {
      const packagesDir = path.join(this.workspaceRoot, 'packages');
      const entries = await fs.readdir(packagesDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const packagePath = path.join(packagesDir, entry.name);
          const packageJsonPath = path.join(packagePath, 'package.json');

          try {
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            const hasTypeScript = await fs
              .access(path.join(packagePath, 'tsconfig.json'))
              .then(() => true)
              .catch(() => false);

            packages.push({
              name: packageJson.name || entry.name,
              path: packagePath,
              hasTypeScript,
            });
          } catch {
            // Skip invalid packages
          }
        }
      }
    } catch {
      // No packages directory or access error
    }

    return packages;
  }
}
