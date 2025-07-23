/**
 * Log levels for the Context-Pods logger
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
}

/**
 * Simple logger implementation for Context-Pods
 */
export class Logger {
  private level: LogLevel;
  private prefix: string;
  private timestamp: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.prefix = options.prefix ?? '[Context-Pods]';
    this.timestamp = options.timestamp ?? true;
  }

  /**
   * Format a log message with optional timestamp and prefix
   */
  private formatMessage(level: string, message: string): string {
    const parts: string[] = [];

    if (this.timestamp) {
      parts.push(new Date().toISOString());
    }

    parts.push(this.prefix);
    parts.push(`[${level}]`);
    parts.push(message);

    return parts.join(' ');
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(this.formatMessage('DEBUG', message), ...args);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(this.formatMessage('INFO', message), ...args);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message), ...args);
    }
  }

  /**
   * Create a child logger with a specific prefix
   */
  child(prefix: string): Logger {
    return new Logger({
      level: this.level,
      prefix: `${this.prefix} [${prefix}]`,
      timestamp: this.timestamp,
    });
  }

  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();
