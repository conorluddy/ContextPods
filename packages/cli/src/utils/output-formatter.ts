/**
 * Output formatting utilities for Context-Pods CLI
 */

import chalk from 'chalk';
import type { Ora } from 'ora';
import ora from 'ora';

/**
 * Console output utilities
 */
export class OutputFormatter {
  private verbose: boolean;
  private spinner?: Ora;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  /**
   * Set verbose mode
   */
  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  /**
   * Success message
   */
  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  /**
   * Error message
   */
  error(message: string, error?: Error): void {
    console.error(chalk.red('✗'), message);
    if (error && this.verbose) {
      console.error(chalk.gray(error.stack || error.message));
    }
  }

  /**
   * Warning message
   */
  warn(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  }

  /**
   * Info message
   */
  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * Debug message (only in verbose mode)
   */
  debug(message: string): void {
    if (this.verbose) {
      console.log(chalk.gray('→'), chalk.gray(message));
    }
  }

  /**
   * Start a spinner
   */
  startSpinner(text: string): void {
    this.stopSpinner();
    this.spinner = ora(text).start();
  }

  /**
   * Update spinner text
   */
  updateSpinner(text: string): void {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  /**
   * Stop spinner with success
   */
  succeedSpinner(text?: string): void {
    if (this.spinner) {
      this.spinner.succeed(text);
      this.spinner = undefined;
    }
  }

  /**
   * Stop spinner with failure
   */
  failSpinner(text?: string): void {
    if (this.spinner) {
      this.spinner.fail(text);
      this.spinner = undefined;
    }
  }

  /**
   * Stop spinner
   */
  stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = undefined;
    }
  }

  /**
   * Format a list of items
   */
  list(items: string[], bullet = '•'): void {
    items.forEach(item => {
      console.log(chalk.gray(bullet), item);
    });
  }

  /**
   * Format a table-like structure
   */
  table(rows: Array<{ label: string; value: string; color?: string }>): void {
    const maxLabelLength = Math.max(...rows.map(row => row.label.length));
    
    rows.forEach(({ label, value, color = 'white' }) => {
      const paddedLabel = label.padEnd(maxLabelLength);
      const coloredValue = (chalk as any)[color](value);
      console.log(`${chalk.gray(paddedLabel)} ${coloredValue}`);
    });
  }

  /**
   * Format a code block
   */
  code(code: string, language?: string): void {
    const lines = code.split('\n');
    console.log(chalk.gray('```' + (language || '')));
    lines.forEach(line => {
      console.log(chalk.gray('│'), line);
    });
    console.log(chalk.gray('```'));
  }

  /**
   * Format a file path
   */
  path(filePath: string): string {
    return chalk.cyan(filePath);
  }

  /**
   * Format a command
   */
  command(cmd: string): string {
    return chalk.yellow(cmd);
  }

  /**
   * Format a package name
   */
  package(name: string): string {
    return chalk.magenta(name);
  }

  /**
   * Format a template name
   */
  template(name: string): string {
    return chalk.blue(name);
  }

  /**
   * Create a divider
   */
  divider(char = '─', length = 50): void {
    console.log(chalk.gray(char.repeat(length)));
  }

  /**
   * Clear screen (if supported)
   */
  clear(): void {
    if (process.stdout.isTTY) {
      process.stdout.write('\x1b[2J\x1b[0f');
    }
  }

  /**
   * Format duration
   */
  duration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  }
}

/**
 * Global output formatter instance
 */
export const output = new OutputFormatter();