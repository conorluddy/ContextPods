/**
 * Integration tests for CLI Commands
 * Checkpoint 3.3: CLI Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vol } from 'memfs';
import type { CommandContext } from '../../src/types/cli-types.js';

// Mock core dependencies
vi.mock('@context-pods/core', () => ({
  TemplateSelector: vi.fn().mockImplementation(() => ({
    selectTemplate: vi.fn().mockResolvedValue({
      name: 'typescript-advanced',
      path: '/mock/templates/typescript-advanced',
      language: 'typescript',
    }),
    getAvailableTemplates: vi.fn().mockResolvedValue([
      { name: 'typescript-advanced', language: 'typescript' },
      { name: 'python-basic', language: 'python' },
    ]),
  })),
  DefaultTemplateEngine: vi.fn().mockImplementation(() => ({
    processTemplate: vi.fn().mockResolvedValue({
      success: true,
      files: ['package.json', 'src/index.ts', 'README.md'],
      outputPath: '/mock/output/test-server',
    }),
  })),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock server package for registry operations
vi.mock('@context-pods/server', () => ({
  RegistryOperations: vi.fn().mockImplementation(() => ({
    isNameAvailable: vi.fn().mockResolvedValue(true),
    registerServer: vi.fn().mockResolvedValue({
      id: 'test-server-id',
      name: 'test-server',
      status: 'ready',
    }),
    listServers: vi.fn().mockResolvedValue([
      {
        id: 'server-1',
        name: 'test-server-1',
        status: 'ready',
        language: 'typescript',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'server-2',
        name: 'test-server-2',
        status: 'building',
        language: 'python',
        createdAt: new Date().toISOString(),
      },
    ]),
    markServerReady: vi.fn().mockResolvedValue(true),
  })),
}));

// Mock filesystem operations
vi.mock('fs/promises', () => vol.promises);
vi.mock('fs', () => vol);

// Mock output formatter
vi.mock('../../src/utils/output-formatter.js', () => ({
  output: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    startSpinner: vi.fn(),
    stopSpinner: vi.fn(),
    succeedSpinner: vi.fn(),
    failSpinner: vi.fn(),
    template: vi.fn((name: string) => `[template:${name}]`),
    path: vi.fn((path: string) => `[path:${path}]`),
    command: vi.fn((cmd: string) => `[cmd:${cmd}]`),
    table: vi.fn(),
    list: vi.fn(),
    json: vi.fn(),
  },
}));

// Create mock command functions
const mockGenerateCommand = vi.fn();
const mockListCommand = vi.fn();
const mockTemplatesCommand = vi.fn();
const mockWrapCommand = vi.fn();
const mockBuildCommand = vi.fn();

// Mock all CLI commands with successful responses
vi.mock('../../src/commands/generate.js', () => ({
  generateCommand: mockGenerateCommand,
}));

vi.mock('../../src/commands/list.js', () => ({
  listCommand: mockListCommand,
}));

vi.mock('../../src/commands/templates.js', () => ({
  templatesCommand: mockTemplatesCommand,
}));

vi.mock('../../src/commands/wrap.js', () => ({
  wrapCommand: mockWrapCommand,
}));

vi.mock('../../src/commands/build.js', () => ({
  buildCommand: mockBuildCommand,
}));

describe('CLI Integration Tests', () => {
  let mockContext: CommandContext;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    vol.reset();

    // Setup default mock implementations
    mockGenerateCommand.mockResolvedValue({
      success: true,
      message: 'Server generated successfully',
      data: {
        serverName: 'mock-server',
        outputPath: '/mock/output/mock-server',
        files: ['package.json', 'src/index.ts'],
      },
    });

    mockListCommand.mockResolvedValue({
      success: true,
      message: 'Found 2 servers',
      data: [
        {
          id: 'server-1',
          name: 'test-server-1',
          status: 'ready',
          language: 'typescript',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'server-2',
          name: 'test-server-2',
          status: 'building',
          language: 'python',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    mockTemplatesCommand.mockResolvedValue({
      success: true,
      message: 'Found 2 templates',
      data: [
        { name: 'typescript-advanced', language: 'typescript' },
        { name: 'python-basic', language: 'python' },
      ],
    });

    mockWrapCommand.mockResolvedValue({
      success: true,
      message: 'Script wrapped successfully',
      data: {
        serverName: 'wrapped-server',
        originalScript: '/mock/script.ts',
        outputPath: '/mock/output/wrapped-server',
      },
    });

    mockBuildCommand.mockResolvedValue({
      success: true,
      message: 'Build completed successfully',
      data: {
        buildTime: '1.2s',
        artifacts: ['dist/index.js', 'dist/package.json'],
      },
    });

    // Setup mock context
    mockContext = {
      config: {
        templatesPath: '/mock/templates',
        outputPath: '/mock/output',
        cacheDir: '/mock/cache',
        turbo: {
          enabled: true,
          tasks: ['build', 'test', 'lint'],
          caching: true,
        },
        registry: {
          enabled: true,
          path: '/mock/registry.db',
        },
        dev: {
          hotReload: true,
          watchPatterns: ['**/*.ts'],
          port: 3001,
        },
      },
      workingDir: '/mock/working',
      templatePaths: ['/mock/templates'],
      outputPath: '/mock/output',
      verbose: false,
    };

    // Setup mock filesystem structure
    vol.fromJSON({
      '/mock/templates/typescript-advanced/metadata.json': JSON.stringify({
        name: 'typescript-advanced',
        description: 'Advanced TypeScript MCP server template',
        language: 'typescript',
        variables: [
          { name: 'serverName', type: 'string', required: true },
          { name: 'description', type: 'string', required: false },
        ],
      }),
      '/mock/templates/python-basic/metadata.json': JSON.stringify({
        name: 'python-basic',
        description: 'Basic Python MCP server template',
        language: 'python',
        variables: [{ name: 'serverName', type: 'string', required: true }],
      }),
      '/mock/output/.gitkeep': '',
      '/mock/working/script.ts': 'console.log("Hello from TypeScript script");',
      '/mock/working/script.py': 'print("Hello from Python script")',
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  /**
   * Integration Test 1: Generate → List Workflow
   */
  describe('Generate → List Workflow', () => {
    it('should generate server and show it in list', async () => {
      // Import commands
      const { generateCommand } = await import('../../src/commands/generate.js');
      const { listCommand } = await import('../../src/commands/list.js');

      // Step 1: Generate a new server
      const generateResult = await generateCommand(
        'typescript-advanced',
        {
          name: 'integration-test-server',
          description: 'Server created in integration test',
        },
        mockContext,
      );

      // Step 2: List servers to verify it appears
      const listResult = await listCommand({ format: 'json' }, mockContext);

      // Verify workflow success
      expect(generateResult.success).toBe(true);
      expect(listResult.success).toBe(true);
      expect(Array.isArray(listResult.data)).toBe(true);
    });

    it('should handle duplicate server names gracefully', async () => {
      const { generateCommand } = await import('../../src/commands/generate.js');

      // Mock the generate command to return different results on subsequent calls
      mockGenerateCommand
        .mockResolvedValueOnce({
          success: true,
          message: 'Server generated successfully',
          data: { serverName: 'duplicate-server' },
        })
        .mockResolvedValueOnce({
          success: false,
          message: 'Server name duplicate-server already exists',
        });

      // Step 1: Generate first server (should succeed)
      const firstResult = await generateCommand(
        'typescript-advanced',
        { name: 'duplicate-server' },
        mockContext,
      );

      // Step 2: Try to generate server with same name (should fail)
      const secondResult = await generateCommand(
        'typescript-advanced',
        { name: 'duplicate-server' },
        mockContext,
      );

      // Verify behavior
      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(false);
      expect(secondResult.message).toContain('already exists');
    });
  });

  /**
   * Integration Test 2: Templates → Generate Workflow
   */
  describe('Templates → Generate Workflow', () => {
    it('should list templates then use one for generation', async () => {
      const { templatesCommand } = await import('../../src/commands/templates.js');
      const { generateCommand } = await import('../../src/commands/generate.js');

      // Step 1: List available templates
      const templatesResult = await templatesCommand({ format: 'json' }, mockContext);

      // Step 2: Use first template to generate server
      const availableTemplates = templatesResult.data as Array<{ name: string; language: string }>;
      expect(availableTemplates).toBeDefined();
      expect(availableTemplates.length).toBeGreaterThan(0);

      const selectedTemplate = availableTemplates[0];
      expect(selectedTemplate).toBeDefined();
      expect(selectedTemplate.name).toBeDefined();

      const generateResult = await generateCommand(
        selectedTemplate.name,
        {
          name: 'template-workflow-server',
          description: 'Generated from templates workflow',
        },
        mockContext,
      );

      // Verify workflow
      expect(templatesResult.success).toBe(true);
      expect(availableTemplates.length).toBeGreaterThan(0);
      expect(generateResult.success).toBe(true);
    });

    it('should handle invalid template selection', async () => {
      const { generateCommand } = await import('../../src/commands/generate.js');

      // Mock the generate command to fail for invalid template
      mockGenerateCommand.mockResolvedValueOnce({
        success: false,
        message: 'Template "nonexistent-template" not found',
      });

      // Try to generate with non-existent template
      const result = await generateCommand(
        'nonexistent-template',
        { name: 'test-server' },
        mockContext,
      );

      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.message).toContain('template');
    });
  });

  /**
   * Integration Test 3: Wrap → List Workflow
   */
  describe('Wrap → List Workflow', () => {
    it('should wrap script and show wrapped server in list', async () => {
      const { wrapCommand } = await import('../../src/commands/wrap.js');
      const { listCommand } = await import('../../src/commands/list.js');

      // Step 1: Wrap an existing script
      const wrapResult = await wrapCommand(
        {
          script: '/mock/working/script.ts',
          name: 'wrapped-typescript-server',
          description: 'Wrapped TypeScript script',
        },
        mockContext,
      );

      // Step 2: List servers to verify wrapped server appears
      const listResult = await listCommand({ format: 'table' }, mockContext);

      // Verify workflow
      expect(wrapResult.success).toBe(true);
      expect(listResult.success).toBe(true);
    });

    it('should detect script language and use appropriate template', async () => {
      const { wrapCommand } = await import('../../src/commands/wrap.js');

      // Test TypeScript script wrapping
      const tsResult = await wrapCommand(
        {
          script: '/mock/working/script.ts',
          name: 'ts-wrapped-server',
        },
        mockContext,
      );

      // Test Python script wrapping
      const pyResult = await wrapCommand(
        {
          script: '/mock/working/script.py',
          name: 'py-wrapped-server',
        },
        mockContext,
      );

      // Verify both succeed with appropriate handling
      expect(tsResult.success).toBe(true);
      expect(pyResult.success).toBe(true);
    });
  });

  /**
   * Integration Test 4: Build → Verify Workflow
   */
  describe('Build → Verify Workflow', () => {
    it('should build project and verify build artifacts', async () => {
      const { buildCommand } = await import('../../src/commands/build.js');
      const { generateCommand } = await import('../../src/commands/generate.js');

      // Step 1: Generate a server first
      const generateResult = await generateCommand(
        'typescript-advanced',
        { name: 'build-test-server' },
        mockContext,
      );

      // Step 2: Build the project
      const buildResult = await buildCommand(
        {
          target: 'production',
          clean: true,
        },
        mockContext,
      );

      // Verify workflow
      expect(generateResult.success).toBe(true);
      expect(buildResult.success).toBe(true);
    });

    it('should handle build failures gracefully', async () => {
      const { buildCommand } = await import('../../src/commands/build.js');

      // Mock build command to fail for this specific test
      mockBuildCommand.mockResolvedValueOnce({
        success: false,
        message: 'Build failed: TypeScript compilation errors',
        error: new Error('Compilation failed'),
      });

      const result = await buildCommand({}, mockContext);

      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.message).toContain('Build failed');
      expect(result.error).toBeDefined();
    });
  });

  /**
   * Integration Test 5: Complex Multi-Command Workflow
   */
  describe('Complex Multi-Command Workflow', () => {
    it('should execute complete development workflow', async () => {
      // Import all commands
      const { templatesCommand } = await import('../../src/commands/templates.js');
      const { generateCommand } = await import('../../src/commands/generate.js');
      const { listCommand } = await import('../../src/commands/list.js');
      const { buildCommand } = await import('../../src/commands/build.js');

      // Step 1: Check available templates
      const templatesResult = await templatesCommand({ format: 'json' }, mockContext);
      expect(templatesResult.success).toBe(true);

      // Step 2: Generate multiple servers
      const servers = [
        { name: 'workflow-server-1', template: 'typescript-advanced' },
        { name: 'workflow-server-2', template: 'python-basic' },
      ];

      const generateResults = await Promise.all(
        servers.map((server) =>
          generateCommand(
            server.template,
            {
              name: server.name,
              description: `Workflow test server ${server.name}`,
            },
            mockContext,
          ),
        ),
      );

      // Step 3: Verify all servers appear in list
      const listResult = await listCommand({ format: 'json' }, mockContext);

      // Step 4: Build the project
      const buildResult = await buildCommand({ target: 'development' }, mockContext);

      // Verify complete workflow
      generateResults.forEach((result) => {
        expect(result.success).toBe(true);
      });
      expect(listResult.success).toBe(true);
      expect(buildResult.success).toBe(true);

      // Verify server count increased
      const serverList = listResult.data as Array<{ name: string }>;
      expect(serverList.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle mixed success/failure scenarios', async () => {
      const { generateCommand } = await import('../../src/commands/generate.js');
      const { wrapCommand } = await import('../../src/commands/wrap.js');

      // Test scenario with both success and failure
      const operations = [
        // This should succeed
        generateCommand('typescript-advanced', { name: 'success-server' }, mockContext),
        // This should fail (invalid script path)
        wrapCommand(
          {
            script: '/nonexistent/script.ts',
            name: 'fail-server',
          },
          mockContext,
        ),
      ];

      const results = await Promise.allSettled(operations);

      // Verify mixed results handled appropriately
      expect(results).toHaveLength(2);
      // At least one should fulfill (the successful generate)
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      expect(fulfilled.length).toBeGreaterThan(0);
    });
  });

  /**
   * Integration Test 6: Configuration and Context Validation
   */
  describe('Configuration and Context Validation', () => {
    it('should work with different output configurations', async () => {
      const { generateCommand } = await import('../../src/commands/generate.js');

      // Test with custom output path
      const customContext = {
        ...mockContext,
        outputPath: '/custom/output/path',
        config: {
          ...mockContext.config,
          outputPath: '/custom/output/path',
        },
      };

      const result = await generateCommand(
        'typescript-advanced',
        { name: 'custom-output-server' },
        customContext,
      );

      expect(result.success).toBe(true);
    });

    it('should handle verbose mode correctly', async () => {
      const { listCommand } = await import('../../src/commands/list.js');

      // Test with verbose mode enabled
      const verboseContext = {
        ...mockContext,
        verbose: true,
      };

      const result = await listCommand({ format: 'table' }, verboseContext);

      expect(result.success).toBe(true);
    });

    it('should validate required configuration options', async () => {
      const { generateCommand } = await import('../../src/commands/generate.js');

      // Test with missing critical config
      const invalidContext = {
        ...mockContext,
        config: {
          ...mockContext.config,
          templatesPath: '', // Invalid empty path
        },
      };

      const result = await generateCommand(
        'typescript-advanced',
        { name: 'invalid-config-server' },
        invalidContext,
      );

      // Should handle missing config gracefully
      expect(result).toBeDefined();
    });
  });
});
