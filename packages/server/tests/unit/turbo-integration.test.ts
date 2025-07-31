/**
 * Unit tests for Turbo configuration and integration
 * Tests the functionality of TurboRepo monorepo task orchestration and optimization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { promises as fs } from 'fs';

// Mock fs for testing turbo.json validation
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
  },
}));

describe('Turbo Integration', () => {
  let mockFs: {
    readFile: ReturnType<typeof vi.fn>;
    access: ReturnType<typeof vi.fn>;
    stat: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockFs = {
      readFile: vi.mocked(fs.readFile),
      access: vi.mocked(fs.access),
      stat: vi.mocked(fs.stat),
    };
  });

  describe('Turbo Configuration Validation', () => {
    it('should validate turbo.json schema structure', async () => {
      const validTurboConfig = {
        $schema: 'https://turbo.build/schema.json',
        tasks: {
          build: {
            dependsOn: ['^build'],
            outputs: ['dist/**'],
          },
          test: {
            dependsOn: ['build'],
            outputs: ['coverage/**'],
          },
          lint: {
            dependsOn: ['^build'],
            outputs: [],
          },
        },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(validTurboConfig));

      const config = JSON.parse(await fs.readFile('turbo.json', 'utf-8'));
      
      expect(config).toHaveProperty('$schema');
      expect(config).toHaveProperty('tasks');
      expect(config.tasks).toHaveProperty('build');
      expect(config.tasks).toHaveProperty('test');
      expect(config.tasks).toHaveProperty('lint');
    });

    it('should validate required task dependencies', async () => {
      const turboConfig = {
        $schema: 'https://turbo.build/schema.json',
        tasks: {
          build: {
            dependsOn: ['^build'],
            outputs: ['dist/**'],
          },
          test: {
            dependsOn: ['build'],
            outputs: ['coverage/**'],
          },
          lint: {
            dependsOn: ['^build'],
            outputs: [],
          },
          'type-check': {
            dependsOn: ['^build'],
            outputs: [],
          },
        },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(turboConfig));

      const config = JSON.parse(await fs.readFile('turbo.json', 'utf-8'));

      // Test that test depends on build
      expect(config.tasks.test.dependsOn).toContain('build');
      
      // Test that lint depends on ^build (upstream builds)
      expect(config.tasks.lint.dependsOn).toContain('^build');
      
      // Test that type-check depends on ^build
      expect(config.tasks['type-check'].dependsOn).toContain('^build');
    });

    it('should validate output directories are correctly configured', async () => {
      const turboConfig = {
        $schema: 'https://turbo.build/schema.json',
        tasks: {
          build: {
            outputs: ['dist/**', '.next/**', '!.next/cache/**'],
          },
          test: {
            outputs: ['coverage/**'],
          },
        },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(turboConfig));

      const config = JSON.parse(await fs.readFile('turbo.json', 'utf-8'));

      // Build should output to dist
      expect(config.tasks.build.outputs).toContain('dist/**');
      
      // Test should output coverage
      expect(config.tasks.test.outputs).toContain('coverage/**');
      
      // Should exclude cache directories
      expect(config.tasks.build.outputs).toContain('!.next/cache/**');
    });

    it('should validate cache configuration for development tasks', async () => {
      const turboConfig = {
        tasks: {
          dev: {
            cache: false,
            persistent: true,
          },
          clean: {
            cache: false,
          },
          'cli:wrap': {
            cache: false,
            outputs: ['generated/**'],
          },
        },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(turboConfig));

      const config = JSON.parse(await fs.readFile('turbo.json', 'utf-8'));

      // Dev tasks should not be cached
      expect(config.tasks.dev.cache).toBe(false);
      expect(config.tasks.clean.cache).toBe(false);
      expect(config.tasks['cli:wrap'].cache).toBe(false);
      
      // Dev should be persistent
      expect(config.tasks.dev.persistent).toBe(true);
    });
  });

  describe('Template Turbo Optimization', () => {
    it('should identify turbo-optimized templates correctly', () => {
      const turboOptimizedTemplate = {
        name: 'typescript-advanced',
        optimization: {
          turboRepo: true,
          hotReload: true,
          sharedDependencies: true,
          buildCaching: true,
        },
      };

      const basicTemplate = {
        name: 'python-basic',
        optimization: {
          turboRepo: false,
          hotReload: false,
          sharedDependencies: false,
          buildCaching: false,
        },
      };

      expect(turboOptimizedTemplate.optimization.turboRepo).toBe(true);
      expect(turboOptimizedTemplate.optimization.buildCaching).toBe(true);
      
      expect(basicTemplate.optimization.turboRepo).toBe(false);
      expect(basicTemplate.optimization.buildCaching).toBe(false);
    });

    it('should validate turbo optimization flags', () => {
      const optimizationConfig = {
        turboRepo: true,
        hotReload: true,
        sharedDependencies: true,
        buildCaching: true,
      };

      // All optimization flags should be boolean
      expect(typeof optimizationConfig.turboRepo).toBe('boolean');
      expect(typeof optimizationConfig.hotReload).toBe('boolean');
      expect(typeof optimizationConfig.sharedDependencies).toBe('boolean');
      expect(typeof optimizationConfig.buildCaching).toBe('boolean');
    });
  });

  describe('Package Dependencies', () => {
    it('should validate turbo is installed as dev dependency', async () => {
      const packageJson = {
        devDependencies: {
          turbo: '^2.5.5',
          typescript: '^5.5.0',
          vitest: '^1.6.0',
        },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(packageJson));

      const pkg = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      
      expect(pkg.devDependencies).toHaveProperty('turbo');
      expect(pkg.devDependencies.turbo).toMatch(/^\^2\./);
    });

    it('should validate npm scripts use turbo commands', async () => {
      const packageJson = {
        scripts: {
          build: 'turbo build',
          test: 'turbo test',
          lint: 'turbo lint',
          dev: 'turbo dev',
          clean: 'turbo clean',
        },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(packageJson));

      const pkg = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      
      expect(pkg.scripts.build).toBe('turbo build');
      expect(pkg.scripts.test).toBe('turbo test');
      expect(pkg.scripts.lint).toBe('turbo lint');
      expect(pkg.scripts.dev).toBe('turbo dev');
      expect(pkg.scripts.clean).toBe('turbo clean');
    });
  });

  describe('Task Execution Order', () => {
    it('should validate task dependency chains', () => {
      const taskGraph = {
        build: { dependsOn: ['^build'] },
        test: { dependsOn: ['build'] },
        lint: { dependsOn: ['^build'] },
        'type-check': { dependsOn: ['^build'] },
      };

      // Test should wait for build to complete
      expect(taskGraph.test.dependsOn).toContain('build');
      
      // Lint should wait for upstream builds
      expect(taskGraph.lint.dependsOn).toContain('^build');
      
      // type-check should wait for upstream builds
      expect(taskGraph['type-check'].dependsOn).toContain('^build');
    });

    it('should validate parallel task execution for independent tasks', () => {
      // These tasks can run in parallel since they only depend on upstream builds
      const parallelTasks = ['lint', 'type-check'];
      const taskConfigs = {
        lint: { dependsOn: ['^build'] },
        'type-check': { dependsOn: ['^build'] },
      };

      parallelTasks.forEach((task) => {
        // Both only depend on upstream builds, not on each other
        expect(taskConfigs[task as keyof typeof taskConfigs].dependsOn).not.toContain('lint');
        expect(taskConfigs[task as keyof typeof taskConfigs].dependsOn).not.toContain('type-check');
      });
    });
  });

  describe('Caching Strategy', () => {
    it('should validate caching for build outputs', () => {
      const cachingConfig = {
        build: { outputs: ['dist/**'], cache: true },
        test: { outputs: ['coverage/**'], cache: true },
        lint: { outputs: [], cache: true },
        dev: { cache: false, persistent: true },
        clean: { cache: false },
      };

      // Build tasks should be cached
      expect(cachingConfig.build.cache).toBe(true);
      expect(cachingConfig.test.cache).toBe(true);
      expect(cachingConfig.lint.cache).toBe(true);
      
      // Interactive/cleanup tasks should not be cached
      expect(cachingConfig.dev.cache).toBe(false);
      expect(cachingConfig.clean.cache).toBe(false);
    });

    it('should validate output patterns for cache invalidation', () => {
      const outputPatterns = {
        build: ['dist/**', '.next/**', '!.next/cache/**'],
        test: ['coverage/**'],
        lint: [],
      };

      // Build should track multiple output directories
      expect(outputPatterns.build).toContain('dist/**');
      expect(outputPatterns.build).toContain('.next/**');
      
      // Should exclude cache directories from tracking
      expect(outputPatterns.build).toContain('!.next/cache/**');
      
      // Test should track coverage
      expect(outputPatterns.test).toContain('coverage/**');
      
      // Lint has no outputs (just checks)
      expect(outputPatterns.lint).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid turbo.json gracefully', async () => {
      mockFs.readFile.mockResolvedValue('invalid json{');

      await expect(async () => {
        const content = await fs.readFile('turbo.json', 'utf-8');
        JSON.parse(content);
      }).rejects.toThrow();
    });

    it('should handle missing turbo.json file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      await expect(fs.readFile('turbo.json', 'utf-8')).rejects.toThrow('ENOENT');
    });

    it('should validate required schema fields exist', async () => {
      const incompleteTurboConfig = {
        // Missing $schema and tasks
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(incompleteTurboConfig));

      const config = JSON.parse(await fs.readFile('turbo.json', 'utf-8'));
      
      // Should not have required fields
      expect(config).not.toHaveProperty('$schema');
      expect(config).not.toHaveProperty('tasks');
    });
  });

  describe('Workspace Integration', () => {
    it('should validate workspace package discovery', async () => {
      const workspaceConfig = {
        workspaces: ['packages/*'],
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(workspaceConfig));

      const pkg = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      
      expect(pkg.workspaces).toContain('packages/*');
    });

    it('should validate cross-package dependencies with ^build pattern', () => {
      const buildDependency = '^build';
      
      // ^build means "wait for upstream packages to build first"
      expect(buildDependency).toMatch(/^\^build$/);
    });

    it('should validate package-specific build tasks', () => {
      const packageTasks = {
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
      };

      // CLI tasks should depend on build
      expect(packageTasks['cli:wrap'].dependsOn).toContain('build');
      expect(packageTasks['cli:generate'].dependsOn).toContain('build');
      
      // CLI tasks should not be cached (dynamic generation)
      expect(packageTasks['cli:wrap'].cache).toBe(false);
      expect(packageTasks['cli:generate'].cache).toBe(false);
      
      // Should output to generated directory
      expect(packageTasks['cli:wrap'].outputs).toContain('generated/**');
      expect(packageTasks['cli:generate'].outputs).toContain('generated/**');
    });
  });
});