/**
 * Progress notification system for long-running operations
 * Implements MCP progress tracking pattern
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { logger } from '../utils/logger.js';

/**
 * Progress notification parameters
 */
interface ProgressNotification {
  /**
   * Unique identifier for the progress operation
   */
  progressToken: string | number;

  /**
   * Current progress value (0-100 for percentage, or current/total)
   */
  progress: number;

  /**
   * Total value for progress calculation (optional)
   */
  total?: number;

  /**
   * Human-readable progress message
   */
  message?: string;
}

/**
 * Progress operation metadata
 */
interface ProgressOperation {
  id: string;
  name: string;
  startTime: Date;
  currentProgress: number;
  total: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  message?: string;
}

/**
 * Progress tracker for managing long-running operations
 */
export class ProgressTracker {
  private operations: Map<string, ProgressOperation> = new Map();
  private server: Server | null = null;

  /**
   * Initialize the progress tracker with a server instance
   */
  initialize(server: Server): void {
    this.server = server;
    logger.info('Progress tracker initialized');
  }

  /**
   * Start tracking a new operation
   */
  startOperation(id: string, name: string, total: number = 100): ProgressOperation {
    const operation: ProgressOperation = {
      id,
      name,
      startTime: new Date(),
      currentProgress: 0,
      total,
      status: 'running',
    };

    this.operations.set(id, operation);
    logger.info(`Started tracking operation: ${name} (${id})`);

    // Send initial progress notification
    this.sendProgress(id, 0, `Starting ${name}...`);

    return operation;
  }

  /**
   * Update progress for an operation
   */
  async updateProgress(id: string, progress: number, message?: string): Promise<void> {
    const operation = this.operations.get(id);
    if (!operation) {
      logger.warn(`Operation not found: ${id}`);
      return;
    }

    operation.currentProgress = progress;
    if (message) {
      operation.message = message;
    }

    // Check if operation is complete
    if (progress >= operation.total) {
      operation.status = 'completed';
      logger.info(`Operation completed: ${operation.name} (${id})`);
    }

    // Send progress notification
    await this.sendProgress(id, progress, message);
  }

  /**
   * Mark an operation as failed
   */
  async failOperation(id: string, error: string): Promise<void> {
    const operation = this.operations.get(id);
    if (!operation) {
      logger.warn(`Operation not found: ${id}`);
      return;
    }

    operation.status = 'failed';
    operation.message = error;
    logger.error(`Operation failed: ${operation.name} (${id}) - ${error}`);

    // Send failure notification
    await this.sendProgress(id, operation.currentProgress, `Failed: ${error}`);
  }

  /**
   * Cancel an operation
   */
  async cancelOperation(id: string): Promise<void> {
    const operation = this.operations.get(id);
    if (!operation) {
      logger.warn(`Operation not found: ${id}`);
      return;
    }

    operation.status = 'cancelled';
    logger.info(`Operation cancelled: ${operation.name} (${id})`);

    // Send cancellation notification
    await this.sendProgress(id, operation.currentProgress, 'Operation cancelled');
  }

  /**
   * Send progress notification to client
   */
  private async sendProgress(
    progressToken: string,
    progress: number,
    message?: string,
  ): Promise<void> {
    if (!this.server) {
      logger.warn('Server not initialized, cannot send progress notification');
      return;
    }

    const operation = this.operations.get(progressToken);
    if (!operation) {
      return;
    }

    try {
      await this.server.notification({
        method: 'notifications/progress',
        params: {
          progressToken,
          progress,
          total: operation.total,
          message: message || operation.message,
        },
      });
    } catch (error) {
      logger.error('Failed to send progress notification:', error);
    }
  }

  /**
   * Get operation status
   */
  getOperation(id: string): ProgressOperation | undefined {
    return this.operations.get(id);
  }

  /**
   * Get all operations
   */
  getAllOperations(): ProgressOperation[] {
    return Array.from(this.operations.values());
  }

  /**
   * Clean up completed operations older than specified milliseconds
   */
  cleanupOldOperations(maxAgeMs: number = 3600000): void {
    const now = new Date();
    let cleaned = 0;

    for (const [id, operation] of this.operations.entries()) {
      if (operation.status !== 'running') {
        const age = now.getTime() - operation.startTime.getTime();
        if (age > maxAgeMs) {
          this.operations.delete(id);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old operations`);
    }
  }
}

// Global progress tracker instance
export const progressTracker = new ProgressTracker();

/**
 * Helper function to track async operations with progress
 */
export async function withProgress<T>(
  name: string,
  operation: (progress: (percent: number, message?: string) => Promise<void>) => Promise<T>,
): Promise<T> {
  const id = `${name}-${Date.now()}`;
  progressTracker.startOperation(id, name);

  try {
    const result = await operation(async (percent, message) => {
      await progressTracker.updateProgress(id, percent, message);
    });

    await progressTracker.updateProgress(id, 100, 'Completed');
    return result;
  } catch (error) {
    await progressTracker.failOperation(id, String(error));
    throw error;
  }
}

/**
 * Example of using progress tracking in a tool
 */
export async function exampleLongRunningTool(data: unknown[]): Promise<unknown[]> {
  return withProgress('Processing data', async (progress) => {
    const results: unknown[] = [];
    const total = data.length;

    for (let i = 0; i < total; i++) {
      // Process each item
      const processed = await processItem(data[i]);
      results.push(processed);

      // Update progress
      const percent = ((i + 1) / total) * 100;
      await progress(percent, `Processed ${i + 1} of ${total} items`);

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  });
}

async function processItem(item: unknown): Promise<unknown> {
  // Placeholder processing logic
  return { processed: item, timestamp: new Date().toISOString() };
}
