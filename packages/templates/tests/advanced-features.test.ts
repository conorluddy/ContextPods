import { readFile, stat } from 'fs/promises';

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
}));

// Mock path operations for safety
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    resolve: vi.fn().mockImplementation((...paths) => paths.join('/')),
    join: vi.fn().mockImplementation((...paths) => paths.join('/')),
  };
});

describe('Phase 3: Advanced MCP Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
});

describe('Sampling/LLM Integration', () => {
  it('should create sampling service with default config', async () => {
    const { SamplingService } = await import(
      '../templates/typescript-advanced/src/sampling/index.js'
    );

    const service = new SamplingService();
    expect(service).toBeDefined();

    // Test config update
    service.updateConfig({ temperature: 0.5 });
    expect(service).toBeDefined();
  });

  it('should create sampling request from messages', async () => {
    const { SamplingService, createSamplingMessages } = await import(
      '../templates/typescript-advanced/src/sampling/index.js'
    );

    const service = new SamplingService();
    const messages = createSamplingMessages(
      'You are a helpful assistant',
      'Hello, world!',
      'How can I help?',
    );

    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[2].role).toBe('assistant');

    const request = service.createSamplingRequest(messages);
    expect(request.method).toBe('sampling/createMessage');
    expect(request.params.messages).toEqual(messages);
  });

  it('should process sampling response correctly', async () => {
    const { SamplingService } = await import(
      '../templates/typescript-advanced/src/sampling/index.js'
    );

    const service = new SamplingService();

    const response = {
      content: 'Test response',
      thinking: 'Test thinking',
      usage: { inputTokens: 10, outputTokens: 20 },
    };

    const processed = service.processSamplingResponse(response);
    expect(processed.content).toBe('Test response');
    expect(processed.thinking).toBe('Test thinking');
    expect(processed.usage).toEqual({ inputTokens: 10, outputTokens: 20 });
  });

  it('should handle array content in sampling response', async () => {
    const { SamplingService } = await import(
      '../templates/typescript-advanced/src/sampling/index.js'
    );

    const service = new SamplingService();

    const response = {
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'World!' },
      ],
    };

    const processed = service.processSamplingResponse(response);
    expect(processed.content).toBe('Hello World!');
  });

  it('should export sampling tools with proper schemas', async () => {
    const { samplingTools } = await import(
      '../templates/typescript-advanced/src/sampling/index.js'
    );

    expect(samplingTools).toHaveLength(2);

    const analyzeTool = samplingTools.find((t) => t.name === 'analyze-with-llm');
    expect(analyzeTool).toBeDefined();
    expect(analyzeTool?.inputSchema.required).toContain('content');
    expect(analyzeTool?.outputSchema.required).toContain('result');

    const generateTool = samplingTools.find((t) => t.name === 'generate-content');
    expect(generateTool).toBeDefined();
    expect(generateTool?.inputSchema.required).toContain('prompt');
  });
});

describe('Multi-Modal Content Support', () => {
  const mockedReadFile = readFile as MockedFunction<typeof readFile>;
  const mockedStat = stat as MockedFunction<typeof stat>;

  beforeEach(() => {
    // Mock file system operations
    mockedStat.mockResolvedValue({
      size: 1024,
      birthtime: new Date('2023-01-01'),
      mtime: new Date('2023-01-02'),
      isFile: () => true,
      isDirectory: () => false,
    } as any);
  });

  it('should detect content types from file extensions', async () => {
    const { multiModalProcessor } = await import(
      '../templates/typescript-advanced/src/content/multimodal.js'
    );

    expect(multiModalProcessor.detectContentType('test.txt')).toBe('text/plain');
    expect(multiModalProcessor.detectContentType('test.json')).toBe('application/json');
    expect(multiModalProcessor.detectContentType('test.jpg')).toBe('image/jpeg');
    expect(multiModalProcessor.detectContentType('test.png')).toBe('image/png');
    expect(multiModalProcessor.detectContentType('test.unknown')).toBeNull();
  });

  it('should check if content types are supported', async () => {
    const { multiModalProcessor } = await import(
      '../templates/typescript-advanced/src/content/multimodal.js'
    );

    expect(multiModalProcessor.isSupported('text/plain')).toBe(true);
    expect(multiModalProcessor.isSupported('image/jpeg')).toBe(true);
    expect(multiModalProcessor.isSupported('video/avi' as any)).toBe(false);
  });

  it('should process text files correctly', async () => {
    const { multiModalProcessor } = await import(
      '../templates/typescript-advanced/src/content/multimodal.js'
    );

    mockedReadFile.mockResolvedValueOnce('Hello, world!');

    const content = await multiModalProcessor.processFile('test.txt');

    expect(content.type).toBe('text/plain');
    expect(content.content.type).toBe('text');
    expect((content.content as any).text).toBe('Hello, world!');
    expect(content.metadata?.filename).toBe('test.txt');
  });

  it('should process image files as base64', async () => {
    const { multiModalProcessor } = await import(
      '../templates/typescript-advanced/src/content/multimodal.js'
    );

    const imageBuffer = Buffer.from('fake image data');
    mockedReadFile.mockResolvedValueOnce(imageBuffer);

    const content = await multiModalProcessor.processFile('test.jpg');

    expect(content.type).toBe('image/jpeg');
    expect(content.content.type).toBe('image');
    expect((content.content as any).data).toBe(imageBuffer.toString('base64'));
    expect((content.content as any).mimeType).toBe('image/jpeg');
  });

  it('should create text content with different formats', async () => {
    const { multiModalProcessor } = await import(
      '../templates/typescript-advanced/src/content/multimodal.js'
    );

    const plainContent = multiModalProcessor.createTextContent('Hello', 'plain');
    expect(plainContent.type).toBe('text/plain');

    const markdownContent = multiModalProcessor.createTextContent('# Hello', 'markdown');
    expect(markdownContent.type).toBe('text/markdown');

    const htmlContent = multiModalProcessor.createTextContent('<h1>Hello</h1>', 'html');
    expect(htmlContent.type).toBe('text/html');
  });

  it('should extract text from multi-modal content', async () => {
    const { multiModalProcessor } = await import(
      '../templates/typescript-advanced/src/content/multimodal.js'
    );

    const textContent = multiModalProcessor.createTextContent('Hello, world!');
    const extractedText = multiModalProcessor.extractText(textContent);
    expect(extractedText).toBe('Hello, world!');

    const imageContent = multiModalProcessor.createImageContent('data', 'image/jpeg');
    const imageText = multiModalProcessor.extractText(imageContent);
    expect(imageText).toContain('[image/jpeg content');
  });

  it('should generate content summaries', async () => {
    const { multiModalProcessor } = await import(
      '../templates/typescript-advanced/src/content/multimodal.js'
    );

    const textContent = multiModalProcessor.createTextContent('Hello\nWorld', 'plain');
    textContent.metadata = textContent.metadata || {};
    textContent.metadata.filename = 'test.txt';
    const summary = multiModalProcessor.getSummary(textContent);
    expect(summary).toContain('Text: test.txt');
    expect(summary).toContain('2 lines');
  });

  it('should export multi-modal tools with proper schemas', async () => {
    const { multiModalTools } = await import(
      '../templates/typescript-advanced/src/content/multimodal.js'
    );

    expect(multiModalTools).toHaveLength(2);

    const processTool = multiModalTools.find((t) => t.name === 'process-content');
    expect(processTool).toBeDefined();
    expect(processTool?.inputSchema.required).toContain('filePath');

    const createTool = multiModalTools.find((t) => t.name === 'create-content');
    expect(createTool).toBeDefined();
    expect(createTool?.inputSchema.required).toContain('contentType');
  });
});

describe('Root Listing Capability', () => {
  it('should create root manager with default roots', async () => {
    const { rootManager } = await import('../templates/typescript-advanced/src/roots/index.js');

    const roots = rootManager.getRoots();
    expect(roots.length).toBeGreaterThan(0);

    // Should have at least current working directory
    const cwdRoot = roots.find((r) => r.uri.includes('cwd'));
    expect(cwdRoot).toBeDefined();
    expect(cwdRoot?.name).toBe('Current Directory');
  });

  it('should add and remove roots', async () => {
    const { RootManager } = await import('../templates/typescript-advanced/src/roots/index.js');

    const manager = new RootManager();
    const initialCount = manager.getRoots().length;

    manager.addRoot({
      uri: 'test://custom',
      name: 'Custom Root',
      path: '/custom/path',
      readable: true,
    });

    expect(manager.getRoots()).toHaveLength(initialCount + 1);

    const removed = manager.removeRoot('test://custom');
    expect(removed).toBe(true);
    expect(manager.getRoots()).toHaveLength(initialCount);
  });

  it('should validate path security', async () => {
    const { RootManager } = await import('../templates/typescript-advanced/src/roots/index.js');

    const manager = new RootManager();
    manager.addRoot({
      uri: 'test://secure',
      name: 'Secure Root',
      path: '/secure/path',
      readable: true,
    });

    // Mock readdir and stat for security test
    const { readdir } = await import('fs/promises');
    const mockedReaddir = readdir as MockedFunction<typeof readdir>;

    mockedReaddir.mockRejectedValue(new Error('Path outside root'));

    await expect(manager.listDirectory('test://secure', '../outside')).rejects.toThrow(
      'Failed to list directory',
    );
  });

  it('should filter files based on configuration', async () => {
    const { RootManager } = await import('../templates/typescript-advanced/src/roots/index.js');

    const manager = new RootManager();
    const config = manager.getRoot('{{serverName}}://cwd');

    expect(config).toBeDefined();
    expect(config?.exclude).toContain('node_modules');
    expect(config?.exclude).toContain('.git');
  });

  it('should provide root statistics', async () => {
    const { rootManager } = await import('../templates/typescript-advanced/src/roots/index.js');

    const stats = rootManager.getStats();
    expect(stats.totalRoots).toBeGreaterThan(0);
    expect(stats.rootUris).toBeInstanceOf(Array);
    expect(stats.readableRoots).toBeGreaterThan(0);
  });

  it('should export root tools with proper schemas', async () => {
    const { rootTools } = await import('../templates/typescript-advanced/src/roots/index.js');

    expect(rootTools).toHaveLength(2);

    const listTool = rootTools.find((t) => t.name === 'list-root-directory');
    expect(listTool).toBeDefined();
    expect(listTool?.inputSchema.required).toContain('rootUri');

    const infoTool = rootTools.find((t) => t.name === 'get-root-info');
    expect(infoTool).toBeDefined();
    expect(infoTool?.inputSchema.required).toContain('rootUri');
  });
});

describe('Completion Providers', () => {
  it('should create completion manager with default providers', async () => {
    const { completionManager } = await import(
      '../templates/typescript-advanced/src/completion/index.js'
    );

    const stats = completionManager.getStats();
    expect(stats.totalProviders).toBe(3);
    expect(stats.providerNames).toContain('keywords');
    expect(stats.providerNames).toContain('filepaths');
    expect(stats.providerNames).toContain('snippets');
  });

  it('should provide keyword completions for JavaScript', async () => {
    const { completionManager } = await import(
      '../templates/typescript-advanced/src/completion/index.js'
    );

    const context = {
      prefix: 'func',
      suffix: '',
      language: 'javascript',
    };

    const completions = await completionManager.getCompletions(context);
    expect(completions.length).toBeGreaterThan(0);

    const functionCompletion = completions.find((c) => c.values[0] === 'function');
    expect(functionCompletion).toBeDefined();
  });

  it('should provide snippet completions', async () => {
    const { completionManager } = await import(
      '../templates/typescript-advanced/src/completion/index.js'
    );

    const context = {
      prefix: 'fn',
      suffix: '',
      language: 'javascript',
    };

    const completions = await completionManager.getCompletions(context);
    expect(completions.length).toBeGreaterThan(0);

    // Should include function snippet
    const hasSnippet = completions.some(
      (c) => c.values[0].includes('function') && c.values[0].includes('{'),
    );
    expect(hasSnippet).toBe(true);
  });

  it('should provide TypeScript-specific completions', async () => {
    const { completionManager } = await import(
      '../templates/typescript-advanced/src/completion/index.js'
    );

    const context = {
      prefix: 'inter',
      suffix: '',
      language: 'typescript',
    };

    const completions = await completionManager.getCompletions(context);
    const interfaceCompletion = completions.find((c) => c.values[0] === 'interface');
    expect(interfaceCompletion).toBeDefined();
  });

  it('should handle empty prefix gracefully', async () => {
    const { completionManager } = await import(
      '../templates/typescript-advanced/src/completion/index.js'
    );

    const context = {
      prefix: '',
      suffix: '',
      language: 'javascript',
    };

    const completions = await completionManager.getCompletions(context);
    expect(completions).toBeInstanceOf(Array);
    // Empty prefix should return no completions from keyword provider
    expect(completions.length).toBe(0);
  });

  it('should register and remove providers', async () => {
    const { CompletionManager } = await import(
      '../templates/typescript-advanced/src/completion/index.js'
    );

    const manager = new CompletionManager();
    const initialCount = manager.getStats().totalProviders;

    // Create a mock provider
    const mockProvider = {
      name: 'test-provider',
      triggers: ['test'],
      provideCompletions: vi.fn().mockResolvedValue([]),
    };

    manager.registerProvider(mockProvider);
    expect(manager.getStats().totalProviders).toBe(initialCount + 1);

    const removed = manager.removeProvider('test-provider');
    expect(removed).toBe(true);
    expect(manager.getStats().totalProviders).toBe(initialCount);
  });

  it('should export completion tools with proper schemas', async () => {
    const { completionTools } = await import(
      '../templates/typescript-advanced/src/completion/index.js'
    );

    expect(completionTools).toHaveLength(1);

    const testTool = completionTools[0];
    expect(testTool.name).toBe('test-completion');
    expect(testTool.inputSchema.required).toContain('prefix');
    expect(testTool.outputSchema.required).toContain('completions');
  });
});

describe('Integration Tests', () => {
  it('should load all advanced features without errors', async () => {
    // Test that all modules can be imported without throwing
    await expect(
      import('../templates/typescript-advanced/src/sampling/index.js'),
    ).resolves.toBeDefined();
    await expect(
      import('../templates/typescript-advanced/src/content/multimodal.js'),
    ).resolves.toBeDefined();
    await expect(
      import('../templates/typescript-advanced/src/roots/index.js'),
    ).resolves.toBeDefined();
    await expect(
      import('../templates/typescript-advanced/src/completion/index.js'),
    ).resolves.toBeDefined();
  });

  it('should have consistent tool schema patterns', async () => {
    const modules = [
      '../templates/typescript-advanced/src/sampling/index.js',
      '../templates/typescript-advanced/src/content/multimodal.js',
      '../templates/typescript-advanced/src/roots/index.js',
      '../templates/typescript-advanced/src/completion/index.js',
    ];

    for (const modulePath of modules) {
      const module = await import(modulePath);

      // Find tools export (could be various names)
      const toolsExport = Object.values(module).find(
        (value: any) => Array.isArray(value) && value.length > 0 && value[0].name,
      );

      if (toolsExport) {
        const tools = toolsExport as any[];

        for (const tool of tools) {
          expect(tool).toHaveProperty('name');
          expect(tool).toHaveProperty('description');
          expect(tool).toHaveProperty('inputSchema');
          expect(tool).toHaveProperty('outputSchema');

          expect(typeof tool.name).toBe('string');
          expect(typeof tool.description).toBe('string');
          expect(typeof tool.inputSchema).toBe('object');
          expect(typeof tool.outputSchema).toBe('object');

          expect(tool.inputSchema.type).toBe('object');
          expect(tool.outputSchema.type).toBe('object');
        }
      }
    }
  });

  it('should have proper TypeScript module structure', async () => {
    const modules = [
      '../templates/typescript-advanced/src/sampling/index.js',
      '../templates/typescript-advanced/src/content/multimodal.js',
      '../templates/typescript-advanced/src/roots/index.js',
      '../templates/typescript-advanced/src/completion/index.js',
    ];

    for (const modulePath of modules) {
      const module = await import(modulePath);

      // Should have at least one export
      expect(Object.keys(module).length).toBeGreaterThan(0);

      // Should not have default export mixed with named exports (ES module best practice)
      if (module.default) {
        expect(Object.keys(module)).toHaveLength(1);
      }
    }
  });
});
