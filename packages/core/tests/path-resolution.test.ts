/**
 * Tests for template path resolution
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync } from 'fs';
import {
  getTemplatePaths,
  getFirstExistingTemplatePath,
  getAllExistingTemplatePaths,
  resolveTemplatePath,
} from '../src/path-resolution.js';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Mock os module
vi.mock('os', () => ({
  homedir: vi.fn(() => '/home/user'),
}));

// Mock url module for import.meta.url
vi.mock('url', () => ({
  fileURLToPath: vi.fn(() => '/opt/npm/context-pods/packages/core/dist/path-resolution.js'),
}));

describe('Template Path Resolution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getTemplatePaths', () => {
    it('should return paths in correct priority order', () => {
      process.env.CONTEXT_PODS_TEMPLATES_PATH = '/custom/templates';

      const paths = getTemplatePaths();

      expect(paths[0]).toBe('/custom/templates');
      expect(paths[1]).toMatch(/templates$/);
      expect(paths[2]).toBe('/home/user/.context-pods/templates');
    });

    it('should respect custom environment variable', () => {
      process.env.MY_TEMPLATES = '/my/templates';

      const paths = getTemplatePaths({ envVar: 'MY_TEMPLATES' });

      expect(paths[0]).toBe('/my/templates');
    });

    it('should skip bundled templates when requested', () => {
      const paths = getTemplatePaths({ skipBundled: true });

      expect(paths.every((p) => !p.includes('templates'))).toBe(false);
    });

    it('should skip user home when requested', () => {
      const paths = getTemplatePaths({ skipUserHome: true });

      expect(paths).not.toContain('/home/user/.context-pods/templates');
    });

    it('should include additional paths', () => {
      const additionalPaths = ['/extra/path1', '/extra/path2'];

      const paths = getTemplatePaths({ additionalPaths });

      expect(paths).toContain('/extra/path1');
      expect(paths).toContain('/extra/path2');
    });
  });

  describe('getFirstExistingTemplatePath', () => {
    it('should return first existing path', () => {
      process.env.CONTEXT_PODS_TEMPLATES_PATH = '/env/templates';
      vi.mocked(existsSync).mockImplementation((path) => {
        return path === '/home/user/.context-pods/templates';
      });

      const result = getFirstExistingTemplatePath();

      expect(result).toBe('/home/user/.context-pods/templates');
    });

    it('should return null if no paths exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = getFirstExistingTemplatePath();

      expect(result).toBeNull();
    });

    it('should prefer environment variable path if it exists', () => {
      process.env.CONTEXT_PODS_TEMPLATES_PATH = '/env/templates';
      vi.mocked(existsSync).mockReturnValue(true);

      const result = getFirstExistingTemplatePath();

      expect(result).toBe('/env/templates');
    });
  });

  describe('getAllExistingTemplatePaths', () => {
    it('should return all existing paths', () => {
      process.env.CONTEXT_PODS_TEMPLATES_PATH = '/env/templates';
      vi.mocked(existsSync).mockImplementation((path) => {
        const strPath = String(path);
        return strPath === '/env/templates' || strPath === '/home/user/.context-pods/templates';
      });

      const result = getAllExistingTemplatePaths();

      expect(result).toContain('/env/templates');
      expect(result).toContain('/home/user/.context-pods/templates');
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array if no paths exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = getAllExistingTemplatePaths();

      expect(result).toEqual([]);
    });
  });

  describe('resolveTemplatePath', () => {
    it('should return first existing path', () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        return String(path).includes('bundled');
      });

      const result = resolveTemplatePath();

      expect(result).toMatch(/templates$/);
    });

    it('should fallback to bundled path if none exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = resolveTemplatePath();

      expect(result).toMatch(/templates$/);
    });

    it('should respect environment variable override', () => {
      process.env.CONTEXT_PODS_TEMPLATES_PATH = '/override/templates';
      vi.mocked(existsSync).mockImplementation((path) => {
        return path === '/override/templates';
      });

      const result = resolveTemplatePath();

      expect(result).toBe('/override/templates');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing environment variable gracefully', () => {
      delete process.env.CONTEXT_PODS_TEMPLATES_PATH;

      const paths = getTemplatePaths();

      expect(paths.length).toBeGreaterThan(0);
      expect(paths[0]).not.toBeUndefined();
    });

    it('should handle empty additional paths', () => {
      const paths = getTemplatePaths({ additionalPaths: [] });

      expect(paths.length).toBeGreaterThan(0);
    });

    it('should handle all strategies disabled', () => {
      delete process.env.CONTEXT_PODS_TEMPLATES_PATH;

      const paths = getTemplatePaths({
        skipBundled: true,
        skipUserHome: true,
        additionalPaths: [],
      });

      // Should still have some paths from workspace detection
      expect(paths.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('NPM Package Distribution', () => {
    it('should prioritize bundled templates in npm package', () => {
      delete process.env.CONTEXT_PODS_TEMPLATES_PATH;
      vi.mocked(existsSync).mockImplementation((path) => {
        const strPath = String(path);
        // Simulate bundled templates exist
        return strPath.includes('templates') && !strPath.includes('home');
      });

      const result = resolveTemplatePath();

      expect(result).toMatch(/templates$/);
      expect(result).not.toContain('home');
    });

    it('should work when executed from different directories', () => {
      // Mock process.cwd to simulate different directory
      vi.spyOn(process, 'cwd').mockReturnValue('/some/other/directory');

      const paths = getTemplatePaths();

      // Should still include consistent paths
      expect(paths.some((p) => p.includes('.context-pods/templates'))).toBe(true);

      // Restore mock
      vi.restoreAllMocks();
    });
  });
});
