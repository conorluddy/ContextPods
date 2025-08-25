/**
 * Core MCP Protocol Features Tests
 * Validates Phase 2 implementations: tool annotations, resource subscriptions, prompts, and progress
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

import { getAvailableTemplates } from '../src/index.js';

describe('Core MCP Protocol Features', () => {
  const templatesPath = getAvailableTemplates().find((t) => t.name === 'typescript-advanced')?.path;

  if (!templatesPath) {
    throw new Error('typescript-advanced template not found');
  }

  describe('Tool Annotations and Metadata', () => {
    it('should have advanced-tools.ts with tool annotations', () => {
      const toolsPath = join(templatesPath, 'src/tools/advanced-tools.ts');
      expect(existsSync(toolsPath)).toBe(true);

      const content = readFileSync(toolsPath, 'utf-8');

      // Check for tool with output schema
      expect(content).toContain('outputSchema');
      expect(content).toContain('Tool[]');

      // Check for specific tools
      expect(content).toContain('analyze-text');
      expect(content).toContain('transform-data');
      expect(content).toContain('generate-code');

      // Check for Zod schemas
      expect(content).toContain('AnalyzeTextSchema');
      expect(content).toContain('TransformDataSchema');
      expect(content).toContain('GenerateCodeSchema');

      // Check for structured output schemas
      expect(content).toContain('AnalysisResultSchema');
    });

    it('should register advanced tools in tools index', () => {
      const indexPath = join(templatesPath, 'src/tools/index.ts');
      const content = readFileSync(indexPath, 'utf-8');

      expect(content).toContain('advancedTools');
      expect(content).toContain('handleAdvancedToolCall');
      expect(content).toContain("from './advanced-tools.js'");
    });

    it('should use proper JSON Schema in tool definitions', () => {
      const toolsPath = join(templatesPath, 'src/tools/advanced-tools.ts');
      const content = readFileSync(toolsPath, 'utf-8');

      // Check for JSON Schema properties
      expect(content).toContain("type: 'object'");
      expect(content).toContain("type: 'string'");
      expect(content).toContain("type: 'boolean'");
      expect(content).toContain("type: 'array'");
      expect(content).toContain("type: 'number'");

      // Check for schema constraints
      expect(content).toContain('required:');
      expect(content).toContain('minimum:');
      expect(content).toContain('maximum:');
      expect(content).toContain('enum:');
      expect(content).toContain('additionalProperties:');
    });
  });

  describe('Resource Subscription Support', () => {
    it('should have subscription manager implementation', () => {
      const subscriptionsPath = join(templatesPath, 'src/resources/subscriptions.ts');
      expect(existsSync(subscriptionsPath)).toBe(true);

      const content = readFileSync(subscriptionsPath, 'utf-8');

      // Check for subscription management class
      expect(content).toContain('class SubscriptionManager');
      expect(content).toContain('subscribe(');
      expect(content).toContain('unsubscribe(');
      expect(content).toContain('notifyResourceUpdate(');
      expect(content).toContain('notifyResourceListChanged(');

      // Check for subscription tracking
      expect(content).toContain('subscriptions:');
      expect(content).toContain('resourceStates:');

      // Check for MCP schema imports
      expect(content).toContain('SubscribeRequestSchema');
      expect(content).toContain('UnsubscribeRequestSchema');
      expect(content).toContain('ResourceListChangedNotificationSchema');
      expect(content).toContain('ResourceUpdatedNotificationSchema');
    });

    it('should integrate subscriptions in resources index', () => {
      const resourcesPath = join(templatesPath, 'src/resources/index.ts');
      const content = readFileSync(resourcesPath, 'utf-8');

      expect(content).toContain('subscriptionManager');
      expect(content).toContain('createSubscribableResource');
      expect(content).toContain("from './subscriptions.js'");
      expect(content).toContain('subscriptionManager.initialize(server)');
    });

    it('should declare subscription capabilities in server', () => {
      const serverPath = join(templatesPath, 'src/server.ts');
      const content = readFileSync(serverPath, 'utf-8');

      expect(content).toContain('resources: {');
      expect(content).toContain('subscribe: true');
      expect(content).toContain('listChanged: true');
    });
  });

  describe('Prompt Management System', () => {
    it('should have prompt management implementation', () => {
      const promptsPath = join(templatesPath, 'src/prompts/index.ts');
      expect(existsSync(promptsPath)).toBe(true);

      const content = readFileSync(promptsPath, 'utf-8');

      // Check for prompt templates
      expect(content).toContain('promptTemplates');
      expect(content).toContain('code-review');
      expect(content).toContain('data-analysis');
      expect(content).toContain('api-design');
      expect(content).toContain('error-diagnosis');
      expect(content).toContain('documentation');

      // Check for prompt message generation
      expect(content).toContain('generatePromptMessages');
      expect(content).toContain('PromptMessage[]');

      // Check for MCP prompt schemas
      expect(content).toContain('ListPromptsRequestSchema');
      expect(content).toContain('GetPromptRequestSchema');

      // Check for prompt registration
      expect(content).toContain('registerPrompts');
    });

    it('should register prompts in server', () => {
      const serverPath = join(templatesPath, 'src/server.ts');
      const content = readFileSync(serverPath, 'utf-8');

      expect(content).toContain('registerPrompts');
      expect(content).toContain("from './prompts/index.js'");
      expect(content).toContain('await registerPrompts(server)');
    });

    it('should declare prompt capabilities in server', () => {
      const serverPath = join(templatesPath, 'src/server.ts');
      const content = readFileSync(serverPath, 'utf-8');

      expect(content).toContain('prompts: {');
      expect(content).toContain('listChanged: true');
    });

    it('should include prompt usage tracking', () => {
      const promptsPath = join(templatesPath, 'src/prompts/index.ts');
      const content = readFileSync(promptsPath, 'utf-8');

      expect(content).toContain('class PromptUsageTracker');
      expect(content).toContain('track(');
      expect(content).toContain('getStats(');
      expect(content).toContain('getMostUsed(');
    });
  });

  describe('Progress Notification Support', () => {
    it('should have progress tracking implementation', () => {
      const progressPath = join(templatesPath, 'src/notifications/progress.ts');
      expect(existsSync(progressPath)).toBe(true);

      const content = readFileSync(progressPath, 'utf-8');

      // Check for progress tracker class
      expect(content).toContain('class ProgressTracker');
      expect(content).toContain('startOperation');
      expect(content).toContain('updateProgress');
      expect(content).toContain('failOperation');
      expect(content).toContain('cancelOperation');

      // Check for progress notifications
      expect(content).toContain('sendProgress');
      expect(content).toContain("method: 'notifications/progress'");

      // Check for progress helper
      expect(content).toContain('withProgress');
      expect(content).toContain('exampleLongRunningTool');
    });

    it('should initialize progress tracker in server', () => {
      const serverPath = join(templatesPath, 'src/server.ts');
      const content = readFileSync(serverPath, 'utf-8');

      expect(content).toContain('progressTracker');
      expect(content).toContain("from './notifications/progress.js'");
      expect(content).toContain('progressTracker.initialize(server)');
    });

    it('should integrate progress tracking in advanced tools', () => {
      const toolsPath = join(templatesPath, 'src/tools/advanced-tools.ts');
      const content = readFileSync(toolsPath, 'utf-8');

      expect(content).toContain('withProgress');
      expect(content).toContain("from '../notifications/progress.js'");
    });
  });

  describe('Import Structure and Dependencies', () => {
    it('should use proper ES module imports with .js extensions', () => {
      const files = [
        'src/server.ts',
        'src/tools/index.ts',
        'src/tools/advanced-tools.ts',
        'src/resources/index.ts',
        'src/resources/subscriptions.ts',
        'src/prompts/index.ts',
        'src/notifications/progress.ts',
      ];

      files.forEach((file) => {
        const filePath = join(templatesPath, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf-8');

          // Check for proper local imports with .js extension
          const localImports = content.match(/from ['"]\..*['"]/g) || [];
          localImports.forEach((imp) => {
            if (!imp.includes('.css') && !imp.includes('.json')) {
              expect(imp).toMatch(/\.js['"]/);
            }
          });
        }
      });
    });

    it('should import from correct MCP SDK paths', () => {
      const files = [
        'src/server.ts',
        'src/tools/advanced-tools.ts',
        'src/resources/subscriptions.ts',
        'src/prompts/index.ts',
        'src/notifications/progress.ts',
      ];

      files.forEach((file) => {
        const filePath = join(templatesPath, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf-8');

          // Check MCP imports
          if (content.includes('@modelcontextprotocol/sdk')) {
            expect(content).toMatch(/@modelcontextprotocol\/sdk\/(server|types)/);
            expect(content).not.toMatch(/@modelcontextprotocol\/sdk['"]$/);
          }
        }
      });
    });
  });

  describe('TypeScript Types and Interfaces', () => {
    it('should use proper TypeScript types without any', () => {
      const files = [
        'src/tools/advanced-tools.ts',
        'src/resources/subscriptions.ts',
        'src/prompts/index.ts',
        'src/notifications/progress.ts',
      ];

      files.forEach((file) => {
        const filePath = join(templatesPath, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf-8');

          // Check for any types (should be minimal)
          const anyMatches = content.match(/:\s*any\b/g) || [];
          // Allow some any types in specific contexts but should be minimal
          expect(anyMatches.length).toBeLessThanOrEqual(2);

          // Should use proper types
          expect(content).toMatch(/:\s*(string|number|boolean|unknown|void)/);
        }
      });
    });

    it('should define proper interfaces for data structures', () => {
      const files = ['src/resources/subscriptions.ts', 'src/notifications/progress.ts'];

      files.forEach((file) => {
        const filePath = join(templatesPath, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf-8');

          expect(content).toContain('interface');
          expect(content).not.toContain('interface {}'); // No empty interfaces
        }
      });
    });
  });
});
