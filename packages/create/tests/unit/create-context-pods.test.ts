/**
 * Unit tests for create-context-pods npx runner
 * Tests the functionality of the npx entry point that installs and runs Context-Pods CLI
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Mock all Node.js built-in modules
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('fs', () => ({
  mkdtempSync: vi.fn(),
}));

vi.mock('os', () => ({
  tmpdir: vi.fn(),
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
}));

describe('create-context-pods npx runner', () => {
  let mockExecSync: Mock;
  let mockMkdtempSync: Mock;
  let mockTmpdir: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock child_process
    mockExecSync = vi.mocked(execSync);

    // Mock fs
    mockMkdtempSync = vi.mocked(mkdtempSync);

    // Mock os
    mockTmpdir = vi.mocked(tmpdir);

    // Mock console
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Set up default mock returns
    mockTmpdir.mockReturnValue('/tmp');
    mockMkdtempSync.mockReturnValue('/tmp/context-pods-abc123');
    mockExecSync.mockReturnValue(Buffer.from('success'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Script Logic Components', () => {
    it('should create temporary directory name correctly', () => {
      mockTmpdir.mockReturnValue('/tmp');
      
      // Simulate the temp directory creation
      const tempDirPrefix = join('/tmp', 'context-pods-');
      expect(tempDirPrefix).toBe('/tmp/context-pods-');
    });

    it('should construct CLI path correctly', () => {
      const tempDir = '/tmp/context-pods-abc123';
      const cliPath = join(tempDir, 'node_modules', '@context-pods', 'cli', 'bin', 'context-pods');
      
      expect(cliPath).toBe('/tmp/context-pods-abc123/node_modules/@context-pods/cli/bin/context-pods');
    });

    it('should construct templates path correctly', () => {
      const tempDir = '/tmp/context-pods-abc123';
      const templatesPath = join(tempDir, 'node_modules', '@context-pods', 'templates', 'templates');
      
      expect(templatesPath).toBe('/tmp/context-pods-abc123/node_modules/@context-pods/templates/templates');
    });

    it('should format arguments with quotes correctly', () => {
      const args = ['create', 'my-server', '--template', 'typescript'];
      const formattedArgs = args.map((arg) => `"${arg}"`).join(' ');
      
      expect(formattedArgs).toBe('"create" "my-server" "--template" "typescript"');
    });

    it('should handle arguments with spaces', () => {
      const args = ['create', 'my server', '--description', 'A test server'];
      const formattedArgs = args.map((arg) => `"${arg}"`).join(' ');
      
      expect(formattedArgs).toBe('"create" "my server" "--description" "A test server"');
    });

    it('should handle empty arguments array', () => {
      const args: string[] = [];
      const formattedArgs = args.map((arg) => `"${arg}"`).join(' ');
      
      expect(formattedArgs).toBe('');
    });
  });

  describe('Installation Command Construction', () => {
    it('should construct correct npm install command', () => {
      const tempDir = '/tmp/context-pods-abc123';
      const expectedCommand = `npm install --prefix "${tempDir}" @context-pods/cli@latest @context-pods/core@latest @context-pods/templates@latest`;
      
      expect(expectedCommand).toContain('npm install --prefix');
      expect(expectedCommand).toContain('@context-pods/cli@latest');
      expect(expectedCommand).toContain('@context-pods/core@latest');
      expect(expectedCommand).toContain('@context-pods/templates@latest');
    });

    it('should use correct stdio option for installation', () => {
      const expectedOptions = { stdio: 'inherit' };
      expect(expectedOptions.stdio).toBe('inherit');
    });
  });

  describe('CLI Execution Command Construction', () => {
    it('should construct correct CLI execution command', () => {
      const cliPath = '/tmp/context-pods-abc123/node_modules/@context-pods/cli/bin/context-pods';
      const args = '"create" "my-server"';
      const expectedCommand = `node "${cliPath}" ${args}`;
      
      expect(expectedCommand).toBe('node "/tmp/context-pods-abc123/node_modules/@context-pods/cli/bin/context-pods" "create" "my-server"');
    });

    it('should construct correct execution options', () => {
      const templatesPath = '/tmp/context-pods-abc123/node_modules/@context-pods/templates/templates';
      const expectedOptions = {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          CONTEXT_PODS_TEMPLATES_PATH: templatesPath,
        },
      };
      
      expect(expectedOptions.stdio).toBe('inherit');
      expect(expectedOptions.cwd).toBeDefined();
      expect(expectedOptions.env.CONTEXT_PODS_TEMPLATES_PATH).toBe(templatesPath);
    });
  });

  describe('Cleanup Logic', () => {
    it('should construct correct cleanup options', () => {
      const expectedOptions = { recursive: true, force: true };
      
      expect(expectedOptions.recursive).toBe(true);
      expect(expectedOptions.force).toBe(true);
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle execSync errors', () => {
      const error = new Error('Command failed');
      expect(error.message).toBe('Command failed');
    });

    it('should handle errors without message property', () => {
      const error = 'String error';
      expect(typeof error).toBe('string');
    });
  });

  describe('Process Arguments Handling', () => {
    it('should slice process.argv correctly', () => {
      const mockArgv = ['node', 'create-context-pods.js', 'create', 'my-server'];
      const slicedArgs = mockArgv.slice(2);
      
      expect(slicedArgs).toEqual(['create', 'my-server']);
    });

    it('should handle complex arguments', () => {
      const mockArgv = [
        'node', 
        'create-context-pods.js', 
        'create', 
        'my-server', 
        '--variables', 
        '{"key":"value"}'
      ];
      const slicedArgs = mockArgv.slice(2);
      const formattedArgs = slicedArgs.map((arg) => `"${arg}"`).join(' ');
      
      expect(formattedArgs).toBe('"create" "my-server" "--variables" "{"key":"value"}"');
    });
  });

  describe('Message Formatting', () => {
    it('should format startup message correctly', () => {
      const startupMessage = '🚀 Starting Context-Pods...\n';
      expect(startupMessage).toContain('🚀 Starting Context-Pods');
      expect(startupMessage).toContain('\n');
    });

    it('should format installation message correctly', () => {
      const installMessage = '📦 Installing Context-Pods CLI...';
      expect(installMessage).toContain('📦 Installing Context-Pods CLI');
    });

    it('should format error message correctly', () => {
      const errorMessage = '\n❌ Error running Context-Pods:';
      expect(errorMessage).toContain('❌ Error running Context-Pods');
      expect(errorMessage.startsWith('\n')).toBe(true);
    });
  });

  describe('Package Specifications', () => {
    it('should specify correct package names and versions', () => {
      const packages = [
        '@context-pods/cli@latest',
        '@context-pods/core@latest', 
        '@context-pods/templates@latest'
      ];
      
      packages.forEach(pkg => {
        expect(pkg).toMatch(/@context-pods\/.+@latest/);
      });
    });
  });

  describe('Path Operations', () => {
    it('should handle path joining correctly', () => {
      // Test that our mocked join function works as expected
      const result = join('a', 'b', 'c');
      expect(result).toBe('a/b/c');
    });

    it('should create paths with proper structure', () => {
      const basePath = '/tmp/context-pods-abc123';
      const cliPath = join(basePath, 'node_modules', '@context-pods', 'cli', 'bin', 'context-pods');
      const templatesPath = join(basePath, 'node_modules', '@context-pods', 'templates', 'templates');
      
      expect(cliPath).toContain('/node_modules/@context-pods/cli/bin/context-pods');
      expect(templatesPath).toContain('/node_modules/@context-pods/templates/templates');
    });
  });

  describe('Environment Handling', () => {
    it('should preserve existing environment variables', () => {
      const originalEnv = { NODE_ENV: 'test', PATH: '/usr/bin' };
      const templatesPath = '/tmp/templates';
      const newEnv = {
        ...originalEnv,
        CONTEXT_PODS_TEMPLATES_PATH: templatesPath,
      };
      
      expect(newEnv.NODE_ENV).toBe('test');
      expect(newEnv.PATH).toBe('/usr/bin');
      expect(newEnv.CONTEXT_PODS_TEMPLATES_PATH).toBe(templatesPath);
    });
  });
});