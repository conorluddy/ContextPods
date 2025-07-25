/**
 * Test helper utilities for Context-Pods tests
 */

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { ChildProcess } from 'node:child_process';

interface TestServerOptions {
  port?: number;
  args?: string[];
  env?: Record<string, string>;
}

interface TestServerResult {
  process: ChildProcess;
  port: number;
  stop: () => Promise<void>;
}

interface WaitForOptions {
  timeout?: number;
  interval?: number;
}

interface CapturedConsole {
  log: string[];
  error: string[];
  warn: string[];
}

interface ConsoleCapture {
  captured: CapturedConsole;
  restore: () => void;
}

/**
 * Create a temporary directory for tests
 */
export const createTempDir = async (prefix = 'context-pods-test'): Promise<string> => {
  const random = randomBytes(8).toString('hex');
  const dir = join(tmpdir(), `${prefix}-${random}`);
  await mkdir(dir, { recursive: true });
  return dir;
};

/**
 * Start a test MCP server
 */
export const startTestServer = async (
  serverPath: string,
  options: TestServerOptions = {},
): Promise<TestServerResult> => {
  const { port = 0, args = [], env = {} } = options;

  const serverProcess = spawn('node', [serverPath, ...args], {
    env: {
      ...process.env,
      ...env,
      MCP_SERVER_PORT: port.toString(),
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      serverProcess.kill();
      reject(new Error('Server startup timeout'));
    }, 10000);

    const dataHandler = (data: Buffer): void => {
      if (data.toString().includes('Server started')) {
        clearTimeout(timeout);
        resolve();
      }
    };

    serverProcess.stdout?.on('data', dataHandler);

    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  const stop = async (): Promise<void> => {
    serverProcess.kill();
    await new Promise<void>((resolve) => {
      serverProcess.on('exit', () => resolve());
    });
  };

  return {
    process: serverProcess,
    port,
    stop,
  };
};

/**
 * Wait for a condition to be true
 */
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  options: WaitForOptions = {},
): Promise<void> => {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
};

/**
 * Create a mock template directory structure
 */
export const createMockTemplate = async (
  baseDir: string,
  templateName: string,
  files: Record<string, string>,
): Promise<string> => {
  const templateDir = join(baseDir, templateName);
  await mkdir(templateDir, { recursive: true });

  // Write template files
  for (const [path, content] of Object.entries(files)) {
    const filePath = join(templateDir, path);
    const fileDir = join(filePath, '..');
    await mkdir(fileDir, { recursive: true });
    await writeFile(filePath, content, 'utf-8');
  }

  return templateDir;
};

/**
 * Capture console output during a test
 */
export const captureConsole = (): ConsoleCapture => {
  // Store original console methods with proper binding
  const originalLog = (...args: unknown[]): void => {
    // eslint-disable-next-line no-console
    console.log(...args);
  };
  const originalError = (...args: unknown[]): void => {
    // eslint-disable-next-line no-console
    console.error(...args);
  };
  const originalWarn = (...args: unknown[]): void => {
    // eslint-disable-next-line no-console
    console.warn(...args);
  };

  const captured: CapturedConsole = {
    log: [],
    error: [],
    warn: [],
  };

  // Override console methods
  globalThis.console.log = (...args: unknown[]): void => {
    captured.log.push(args.map(String).join(' '));
  };

  globalThis.console.error = (...args: unknown[]): void => {
    captured.error.push(args.map(String).join(' '));
  };

  globalThis.console.warn = (...args: unknown[]): void => {
    captured.warn.push(args.map(String).join(' '));
  };

  const restore = (): void => {
    globalThis.console.log = originalLog;
    globalThis.console.error = originalError;
    globalThis.console.warn = originalWarn;
  };

  return {
    captured,
    restore,
  };
};

/**
 * Create a test timeout with proper cleanup
 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = 'Operation timed out',
): Promise<T> => {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
};
