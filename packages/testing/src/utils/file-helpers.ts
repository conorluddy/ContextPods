/**
 * File helpers for testing
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';

export class FileHelpers {
  /**
   * Create temporary test directory
   */
  static async createTempDir(prefix = 'test-'): Promise<string> {
    const tmpDir = await fs.mkdtemp(join('/tmp', prefix));
    return tmpDir;
  }

  /**
   * Clean up test directory
   */
  static async cleanupDir(path: string): Promise<void> {
    try {
      await fs.rm(path, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Write test file
   */
  static async writeTestFile(path: string, content: string): Promise<void> {
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, content, 'utf8');
  }

  /**
   * Copy file
   */
  static async copyFile(src: string, dest: string): Promise<void> {
    await fs.mkdir(dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
  }
}