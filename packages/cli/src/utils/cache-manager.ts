/**
 * Cache management utilities for Context-Pods CLI
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import type { CLIConfig } from '../types/cli-types.js';
import { output } from './output-formatter.js';

/**
 * Cache entry interface
 */
interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
  version?: string;
}

/**
 * Cache statistics
 */
interface CacheStats {
  entries: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Cache manager for CLI operations
 */
export class CacheManager {
  private cacheDir: string;

  constructor(config: CLIConfig) {
    this.cacheDir = this.resolveCacheDir(config.cacheDir);
  }

  /**
   * Resolve cache directory path
   */
  private resolveCacheDir(cacheDir: string): string {
    if (cacheDir.startsWith('~')) {
      return path.join(os.homedir(), cacheDir.slice(1));
    }
    return path.resolve(cacheDir);
  }

  /**
   * Initialize cache directory
   */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      // Create subdirectories for different cache types
      const subDirs = ['templates', 'builds', 'analysis', 'dependencies'];
      await Promise.all(
        subDirs.map(dir => 
          fs.mkdir(path.join(this.cacheDir, dir), { recursive: true })
        )
      );
    } catch (error) {
      output.warn(`Failed to initialize cache directory: ${(error as Error).message}`);
    }
  }

  /**
   * Generate cache key from data
   */
  private generateKey(namespace: string, identifier: string, data?: any): string {
    let keyData = `${namespace}:${identifier}`;
    
    if (data) {
      const dataString = JSON.stringify(data);
      const hash = crypto.createHash('md5').update(dataString).digest('hex');
      keyData += `:${hash}`;
    }
    
    return crypto.createHash('sha256').update(keyData).digest('hex');
  }

  /**
   * Get cache file path
   */
  private getCacheFilePath(namespace: string, key: string): string {
    return path.join(this.cacheDir, namespace, `${key}.json`);
  }

  /**
   * Set cache entry
   */
  async set<T>(
    namespace: string,
    identifier: string,
    data: T,
    options: {
      ttl?: number;
      version?: string;
      keyData?: any;
    } = {}
  ): Promise<void> {
    const { ttl, version, keyData } = options;
    const key = this.generateKey(namespace, identifier, keyData);
    
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      version,
    };

    try {
      await this.init();
      const filePath = this.getCacheFilePath(namespace, key);
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
      
      output.debug(`Cached entry: ${namespace}/${identifier}`);
    } catch (error) {
      output.debug(`Failed to cache entry: ${(error as Error).message}`);
    }
  }

  /**
   * Get cache entry
   */
  async get<T>(
    namespace: string,
    identifier: string,
    options: {
      version?: string;
      keyData?: any;
    } = {}
  ): Promise<T | null> {
    const { version, keyData } = options;
    const key = this.generateKey(namespace, identifier, keyData);
    
    try {
      const filePath = this.getCacheFilePath(namespace, key);
      const content = await fs.readFile(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(content);
      
      // Check TTL
      if (entry.ttl && (Date.now() - entry.timestamp) > entry.ttl) {
        output.debug(`Cache entry expired: ${namespace}/${identifier}`);
        await this.delete(namespace, identifier, { keyData });
        return null;
      }
      
      // Check version
      if (version && entry.version !== version) {
        output.debug(`Cache entry version mismatch: ${namespace}/${identifier}`);
        await this.delete(namespace, identifier, { keyData });
        return null;
      }
      
      output.debug(`Cache hit: ${namespace}/${identifier}`);
      return entry.data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        output.debug(`Failed to read cache entry: ${(error as Error).message}`);
      }
      return null;
    }
  }

  /**
   * Delete cache entry
   */
  async delete(
    namespace: string,
    identifier: string,
    options: {
      keyData?: any;
    } = {}
  ): Promise<void> {
    const { keyData } = options;
    const key = this.generateKey(namespace, identifier, keyData);
    
    try {
      const filePath = this.getCacheFilePath(namespace, key);
      await fs.unlink(filePath);
      output.debug(`Deleted cache entry: ${namespace}/${identifier}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        output.debug(`Failed to delete cache entry: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Clear entire namespace
   */
  async clearNamespace(namespace: string): Promise<void> {
    try {
      const namespacePath = path.join(this.cacheDir, namespace);
      const entries = await fs.readdir(namespacePath);
      
      await Promise.all(
        entries.map(entry => 
          fs.unlink(path.join(namespacePath, entry))
        )
      );
      
      output.debug(`Cleared cache namespace: ${namespace}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        output.debug(`Failed to clear cache namespace: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    try {
      const entries = await fs.readdir(this.cacheDir);
      
      await Promise.all(
        entries.map(async entry => {
          const entryPath = path.join(this.cacheDir, entry);
          const stat = await fs.stat(entryPath);
          
          if (stat.isDirectory()) {
            await this.clearNamespace(entry);
          } else {
            await fs.unlink(entryPath);
          }
        })
      );
      
      output.success('Cache cleared successfully');
    } catch (error) {
      output.error(`Failed to clear cache: ${(error as Error).message}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const stats: CacheStats = {
      entries: 0,
      totalSize: 0,
      oldestEntry: Date.now(),
      newestEntry: 0,
    };

    try {
      const namespaces = await fs.readdir(this.cacheDir);
      
      for (const namespace of namespaces) {
        const namespacePath = path.join(this.cacheDir, namespace);
        const namespaceStat = await fs.stat(namespacePath);
        
        if (namespaceStat.isDirectory()) {
          const entries = await fs.readdir(namespacePath);
          
          for (const entry of entries) {
            if (entry.endsWith('.json')) {
              const entryPath = path.join(namespacePath, entry);
              const entryStat = await fs.stat(entryPath);
              
              stats.entries++;
              stats.totalSize += entryStat.size;
              
              if (entryStat.mtime.getTime() < stats.oldestEntry) {
                stats.oldestEntry = entryStat.mtime.getTime();
              }
              
              if (entryStat.mtime.getTime() > stats.newestEntry) {
                stats.newestEntry = entryStat.mtime.getTime();
              }
            }
          }
        }
      }
    } catch (error) {
      output.debug(`Failed to get cache stats: ${(error as Error).message}`);
    }

    return stats;
  }

  /**
   * Clean expired entries
   */
  async cleanExpired(): Promise<number> {
    let cleanedCount = 0;

    try {
      const namespaces = await fs.readdir(this.cacheDir);
      
      for (const namespace of namespaces) {
        const namespacePath = path.join(this.cacheDir, namespace);
        const namespaceStat = await fs.stat(namespacePath);
        
        if (namespaceStat.isDirectory()) {
          const entries = await fs.readdir(namespacePath);
          
          for (const entryFile of entries) {
            if (entryFile.endsWith('.json')) {
              const entryPath = path.join(namespacePath, entryFile);
              
              try {
                const content = await fs.readFile(entryPath, 'utf-8');
                const entry: CacheEntry = JSON.parse(content);
                
                if (entry.ttl && (Date.now() - entry.timestamp) > entry.ttl) {
                  await fs.unlink(entryPath);
                  cleanedCount++;
                }
              } catch {
                // Invalid entry, remove it
                await fs.unlink(entryPath);
                cleanedCount++;
              }
            }
          }
        }
      }
    } catch (error) {
      output.debug(`Failed to clean expired cache entries: ${(error as Error).message}`);
    }

    if (cleanedCount > 0) {
      output.debug(`Cleaned ${cleanedCount} expired cache entries`);
    }

    return cleanedCount;
  }

  /**
   * Template cache helpers
   */
  async cacheTemplate(templatePath: string, template: any): Promise<void> {
    await this.set('templates', templatePath, template, {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  async getCachedTemplate(templatePath: string): Promise<any | null> {
    return await this.get('templates', templatePath);
  }

  /**
   * Build cache helpers
   */
  async cacheBuildResult(target: string, result: any): Promise<void> {
    await this.set('builds', target, result, {
      ttl: 60 * 60 * 1000, // 1 hour
    });
  }

  async getCachedBuildResult(target: string): Promise<any | null> {
    return await this.get('builds', target);
  }

  /**
   * Analysis cache helpers
   */
  async cacheAnalysis(filePath: string, analysis: any): Promise<void> {
    const stat = await fs.stat(filePath);
    await this.set('analysis', filePath, analysis, {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      keyData: { mtime: stat.mtime.getTime() },
    });
  }

  async getCachedAnalysis(filePath: string): Promise<any | null> {
    try {
      const stat = await fs.stat(filePath);
      return await this.get('analysis', filePath, {
        keyData: { mtime: stat.mtime.getTime() },
      });
    } catch {
      return null;
    }
  }
}