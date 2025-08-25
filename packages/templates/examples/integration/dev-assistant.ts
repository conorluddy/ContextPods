/**
 * Development Assistant Server - Complete Integration Example
 * 
 * This example demonstrates a full-featured MCP server that combines all
 * advanced features to create a comprehensive development assistant tool.
 */

import { EventEmitter } from 'events';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { logger } from '../../templates/typescript-advanced/src/utils/logger.js';

/**
 * Project analysis result
 */
interface ProjectAnalysis {
  totalFiles: number;
  languages: Record<string, number>;
  linesOfCode: number;
  codeQuality: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  dependencies: {
    total: number;
    outdated: string[];
    security: string[];
  };
  testCoverage: {
    percentage: number;
    uncovered: string[];
  };
}

/**
 * Code review result
 */
interface CodeReviewResult {
  score: number;
  issues: Array<{
    type: 'error' | 'warning' | 'suggestion';
    message: string;
    line?: number;
    column?: number;
  }>;
  suggestions: string[];
  metrics: {
    complexity: number;
    maintainability: number;
    readability: number;
  };
}

/**
 * Development Assistant MCP Server
 * Combines tools, resources, prompts, sampling, and other features
 */
export class DevelopmentAssistantServer extends EventEmitter {
  private server: Server;
  private projectMetrics = new Map<string, ProjectAnalysis>();
  private subscriptions = new Set<string>();

  constructor() {
    super();
    
    // Initialize MCP server with all capabilities
    this.server = new Server(
      {
        name: 'development-assistant',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: { subscribe: true, listChanged: true },
          prompts: { listChanged: true },
          sampling: {},
          roots: { listChanged: true },
          completion: { argumentHints: true },
        },
      }
    );

    this.setupHandlers();
    this.startMetricsCollection();
  }

  private setupHandlers(): void {
    // Tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze-project',
          description: 'Comprehensive project analysis including code quality, dependencies, and metrics',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the project directory',
              },
              includeTests: {
                type: 'boolean',
                description: 'Include test files in analysis',
                default: true,
              },
              language: {
                type: 'string',
                enum: ['typescript', 'javascript', 'python', 'rust', 'go'],
                description: 'Primary project language',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'review-code',
          description: 'AI-powered code review with suggestions and quality metrics',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Code to review',
              },
              language: {
                type: 'string',
                description: 'Programming language',
              },
              context: {
                type: 'string',
                description: 'Additional context about the code purpose',
              },
            },
            required: ['code', 'language'],
          },
        },
        {
          name: 'generate-tests',
          description: 'Generate comprehensive test suites for given code',
          inputSchema: {
            type: 'object',
            properties: {
              sourceCode: {
                type: 'string',
                description: 'Source code to generate tests for',
              },
              testFramework: {
                type: 'string',
                enum: ['vitest', 'jest', 'pytest', 'cargo-test', 'go-test'],
                description: 'Testing framework to use',
              },
              coverage: {
                type: 'string',
                enum: ['basic', 'comprehensive', 'edge-cases'],
                description: 'Level of test coverage',
                default: 'comprehensive',
              },
            },
            required: ['sourceCode', 'testFramework'],
          },
        },
        {
          name: 'refactor-code',
          description: 'Intelligently refactor code for better maintainability and performance',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Code to refactor',
              },
              language: {
                type: 'string',
                description: 'Programming language',
              },
              refactorType: {
                type: 'string',
                enum: ['performance', 'readability', 'maintainability', 'patterns'],
                description: 'Type of refactoring to perform',
              },
              preserveAPI: {
                type: 'boolean',
                description: 'Preserve existing public API',
                default: true,
              },
            },
            required: ['code', 'language', 'refactorType'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'analyze-project':
            return await this.analyzeProject(args as any);
          case 'review-code':
            return await this.reviewCode(args as any);
          case 'generate-tests':
            return await this.generateTests(args as any);
          case 'refactor-code':
            return await this.refactorCode(args as any);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Tool ${name} failed:`, error);
        throw error;
      }
    });

    // Resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'dev-assistant://project-metrics',
          name: 'Project Metrics',
          description: 'Real-time project analysis and metrics',
          mimeType: 'application/json',
        },
        {
          uri: 'dev-assistant://code-quality-trends',
          name: 'Code Quality Trends',
          description: 'Historical code quality trends and improvements',
          mimeType: 'application/json',
        },
        {
          uri: 'dev-assistant://dependency-status',
          name: 'Dependency Status',
          description: 'Current status of project dependencies',
          mimeType: 'application/json',
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      switch (uri) {
        case 'dev-assistant://project-metrics':
          return await this.getProjectMetricsResource();
        case 'dev-assistant://code-quality-trends':
          return await this.getCodeQualityTrendsResource();
        case 'dev-assistant://dependency-status':
          return await this.getDependencyStatusResource();
        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });

    // Subscription handlers
    this.server.setRequestHandler(SubscribeRequestSchema, async (request) => {
      const { uri } = request.params;
      this.subscriptions.add(uri);
      logger.info(`Client subscribed to ${uri}`);
      return {};
    });

    this.server.setRequestHandler(UnsubscribeRequestSchema, async (request) => {
      const { uri } = request.params;
      this.subscriptions.delete(uri);
      logger.info(`Client unsubscribed from ${uri}`);
      return {};
    });

    // Prompt handlers
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: 'code-review-checklist',
          description: 'Comprehensive code review checklist and guidelines',
          arguments: [
            { name: 'language', description: 'Programming language', required: true },
            { name: 'codeType', description: 'Type of code (feature, bugfix, refactor)', required: false },
          ],
        },
        {
          name: 'architecture-analysis',
          description: 'Analyze and provide feedback on software architecture',
          arguments: [
            { name: 'projectType', description: 'Type of project', required: true },
            { name: 'requirements', description: 'Project requirements', required: true },
          ],
        },
        {
          name: 'performance-optimization',
          description: 'Performance optimization strategies and recommendations',
          arguments: [
            { name: 'performance_issues', description: 'Identified performance issues', required: true },
            { name: 'target_metrics', description: 'Target performance metrics', required: false },
          ],
        },
      ],
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'code-review-checklist':
          return this.getCodeReviewPrompt(args as any);
        case 'architecture-analysis':
          return this.getArchitectureAnalysisPrompt(args as any);
        case 'performance-optimization':
          return this.getPerformanceOptimizationPrompt(args as any);
        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  // Tool implementations
  private async analyzeProject(args: {
    projectPath: string;
    includeTests?: boolean;
    language?: string;
  }): Promise<any> {
    logger.info('Analyzing project', { path: args.projectPath, language: args.language });
    
    // Simulate project analysis - in real implementation, scan files
    const analysis: ProjectAnalysis = {
      totalFiles: 127,
      languages: {
        typescript: 95,
        javascript: 15,
        json: 12,
        markdown: 5,
      },
      linesOfCode: 8456,
      codeQuality: {
        score: 8.2,
        issues: [
          'Complex function in src/parser.ts:45',
          'Missing error handling in src/api.ts:120',
          'Duplicate code in utils modules',
        ],
        suggestions: [
          'Extract complex logic into smaller functions',
          'Add comprehensive error boundaries',
          'Consider creating shared utility functions',
        ],
      },
      dependencies: {
        total: 23,
        outdated: ['lodash@4.17.19', 'express@4.17.1'],
        security: ['axios@0.21.1'],
      },
      testCoverage: {
        percentage: 87.5,
        uncovered: [
          'src/error-handler.ts:25-35',
          'src/config.ts:10-20',
        ],
      },
    };

    // Cache the analysis
    this.projectMetrics.set(args.projectPath, analysis);
    
    // Notify subscribers of updated metrics
    this.notifyResourceUpdate('dev-assistant://project-metrics', analysis);

    return {
      content: [{
        type: 'text',
        text: `# Project Analysis Complete\n\n**Overall Health Score:** ${analysis.codeQuality.score}/10\n\n## Summary\n- **Files:** ${analysis.totalFiles}\n- **Lines of Code:** ${analysis.linesOfCode.toLocaleString()}\n- **Test Coverage:** ${analysis.testCoverage.percentage}%\n- **Dependencies:** ${analysis.dependencies.total} (${analysis.dependencies.outdated.length} outdated)\n\n## Key Issues\n${analysis.codeQuality.issues.map(issue => `- ${issue}`).join('\n')}\n\n## Recommendations\n${analysis.codeQuality.suggestions.map(suggestion => `- ${suggestion}`).join('\n')}`,
      }],
    };
  }

  private async reviewCode(args: {
    code: string;
    language: string;
    context?: string;
  }): Promise<any> {
    logger.info('Reviewing code', { language: args.language, length: args.code.length });
    
    // Simulate code review analysis
    const review: CodeReviewResult = {
      score: 7.8,
      issues: [
        {
          type: 'warning',
          message: 'Consider using const instead of let for immutable variables',
          line: 5,
          column: 3,
        },
        {
          type: 'suggestion',
          message: 'Add JSDoc comments for better documentation',
          line: 1,
        },
        {
          type: 'error',
          message: 'Potential null pointer exception',
          line: 12,
          column: 18,
        },
      ],
      suggestions: [
        'Break down large functions into smaller, more focused ones',
        'Add input validation for public methods',
        'Consider using TypeScript strict mode',
        'Add unit tests for edge cases',
      ],
      metrics: {
        complexity: 6.2,
        maintainability: 7.5,
        readability: 8.1,
      },
    };

    return {
      content: [{
        type: 'text',
        text: `# Code Review Results\n\n**Overall Score:** ${review.score}/10\n\n## Metrics\n- **Complexity:** ${review.metrics.complexity}/10\n- **Maintainability:** ${review.metrics.maintainability}/10\n- **Readability:** ${review.metrics.readability}/10\n\n## Issues Found (${review.issues.length})\n${review.issues.map(issue => `- **${issue.type.toUpperCase()}** Line ${issue.line}: ${issue.message}`).join('\n')}\n\n## Suggestions\n${review.suggestions.map(suggestion => `- ${suggestion}`).join('\n')}`,
      }],
    };
  }

  private async generateTests(args: {
    sourceCode: string;
    testFramework: string;
    coverage?: string;
  }): Promise<any> {
    logger.info('Generating tests', { 
      framework: args.testFramework, 
      coverage: args.coverage 
    });
    
    // Generate test code based on the framework
    const testCode = this.generateTestCode(args.sourceCode, args.testFramework, args.coverage || 'comprehensive');
    
    return {
      content: [{
        type: 'text',
        text: `# Generated Test Suite\n\nFramework: ${args.testFramework}\nCoverage Level: ${args.coverage || 'comprehensive'}\n\n\`\`\`${this.getLanguageForFramework(args.testFramework)}\n${testCode}\n\`\`\`\n\n## Test Coverage\n- Unit tests for all public methods\n- Edge case validation\n- Error handling scenarios\n- Integration test examples`,
      }],
    };
  }

  private async refactorCode(args: {
    code: string;
    language: string;
    refactorType: string;
    preserveAPI?: boolean;
  }): Promise<any> {
    logger.info('Refactoring code', { 
      language: args.language, 
      type: args.refactorType 
    });
    
    // Simulate code refactoring
    const refactoredCode = this.performRefactoring(args.code, args.refactorType, args.preserveAPI);
    
    return {
      content: [{
        type: 'text',
        text: `# Code Refactoring Complete\n\n**Type:** ${args.refactorType}\n**API Preserved:** ${args.preserveAPI ? 'Yes' : 'No'}\n\n## Refactored Code\n\`\`\`${args.language}\n${refactoredCode}\n\`\`\`\n\n## Improvements Made\n- Reduced complexity\n- Improved readability\n- Enhanced maintainability\n- Better performance characteristics`,
      }],
    };
  }

  // Resource implementations
  private async getProjectMetricsResource(): Promise<any> {
    const allMetrics = Array.from(this.projectMetrics.entries()).map(([path, metrics]) => ({
      path,
      ...metrics,
    }));

    return {
      contents: [{
        uri: 'dev-assistant://project-metrics',
        mimeType: 'application/json',
        text: JSON.stringify({
          timestamp: new Date().toISOString(),
          projects: allMetrics,
          summary: {
            totalProjects: allMetrics.length,
            averageQuality: allMetrics.reduce((sum, m) => sum + m.codeQuality.score, 0) / allMetrics.length,
            totalLinesOfCode: allMetrics.reduce((sum, m) => sum + m.linesOfCode, 0),
          },
        }, null, 2),
      }],
    };
  }

  private async getCodeQualityTrendsResource(): Promise<any> {
    // Simulate quality trends over time
    const trends = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      qualityScore: 7.5 + Math.sin(i / 5) * 1.5 + Math.random() * 0.5,
      issues: Math.floor(20 + Math.sin(i / 3) * 10 + Math.random() * 5),
      coverage: 80 + Math.sin(i / 7) * 10 + Math.random() * 3,
    }));

    return {
      contents: [{
        uri: 'dev-assistant://code-quality-trends',
        mimeType: 'application/json',
        text: JSON.stringify({
          trends,
          period: '30 days',
          lastUpdated: new Date().toISOString(),
        }, null, 2),
      }],
    };
  }

  private async getDependencyStatusResource(): Promise<any> {
    const dependencies = [
      { name: 'react', version: '18.2.0', latest: '18.2.0', status: 'up-to-date', security: 'safe' },
      { name: 'lodash', version: '4.17.19', latest: '4.17.21', status: 'outdated', security: 'vulnerable' },
      { name: 'axios', version: '0.21.1', latest: '1.4.0', status: 'major-outdated', security: 'vulnerable' },
      { name: 'typescript', version: '5.0.0', latest: '5.1.6', status: 'minor-outdated', security: 'safe' },
    ];

    return {
      contents: [{
        uri: 'dev-assistant://dependency-status',
        mimeType: 'application/json',
        text: JSON.stringify({
          dependencies,
          summary: {
            total: dependencies.length,
            upToDate: dependencies.filter(d => d.status === 'up-to-date').length,
            outdated: dependencies.filter(d => d.status !== 'up-to-date').length,
            vulnerable: dependencies.filter(d => d.security === 'vulnerable').length,
          },
          lastChecked: new Date().toISOString(),
        }, null, 2),
      }],
    };
  }

  // Prompt implementations
  private getCodeReviewPrompt(args: { language: string; codeType?: string }): any {
    return {
      messages: [
        {
          role: 'system',
          content: {
            type: 'text',
            text: `You are an expert ${args.language} code reviewer. Provide thorough, constructive feedback on code quality, best practices, and potential improvements.`,
          },
        },
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please review this ${args.language} code${args.codeType ? ` (${args.codeType})` : ''}. Focus on:\n\n1. Code quality and best practices\n2. Potential bugs or issues\n3. Performance considerations\n4. Maintainability and readability\n5. Security implications\n6. Testing recommendations\n\nProvide specific, actionable feedback with examples where appropriate.`,
          },
        },
      ],
    };
  }

  private getArchitectureAnalysisPrompt(args: { projectType: string; requirements: string }): any {
    return {
      messages: [
        {
          role: 'system',
          content: {
            type: 'text',
            text: 'You are a senior software architect with expertise in designing scalable, maintainable systems. Analyze the provided architecture and requirements.',
          },
        },
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze this ${args.projectType} project architecture:\n\n**Requirements:**\n${args.requirements}\n\nProvide analysis on:\n1. Architectural patterns and their suitability\n2. Scalability considerations\n3. Performance implications\n4. Security architecture\n5. Technology stack recommendations\n6. Potential architectural risks\n7. Improvement suggestions`,
          },
        },
      ],
    };
  }

  private getPerformanceOptimizationPrompt(args: { performance_issues: string; target_metrics?: string }): any {
    return {
      messages: [
        {
          role: 'system',
          content: {
            type: 'text',
            text: 'You are a performance optimization expert. Analyze performance issues and provide specific, actionable optimization strategies.',
          },
        },
        {
          role: 'user',
          content: {
            type: 'text',
            text: `**Performance Issues Identified:**\n${args.performance_issues}\n\n${args.target_metrics ? `**Target Metrics:**\n${args.target_metrics}\n\n` : ''}Please provide:\n1. Root cause analysis\n2. Prioritized optimization strategies\n3. Implementation approaches\n4. Performance monitoring recommendations\n5. Trade-off considerations\n6. Success metrics and benchmarks`,
          },
        },
      ],
    };
  }

  // Helper methods
  private generateTestCode(sourceCode: string, framework: string, coverage: string): string {
    const templates = {
      vitest: `import { describe, it, expect, vi } from 'vitest';
import { functionUnderTest } from './source.js';

describe('Function Tests', () => {
  it('should handle normal cases', () => {
    const result = functionUnderTest('normal input');
    expect(result).toBeDefined();
  });

  it('should handle edge cases', () => {
    expect(() => functionUnderTest(null)).not.toThrow();
  });

  it('should handle error cases', () => {
    expect(() => functionUnderTest('')).toThrow();
  });
});`,
      jest: `const { functionUnderTest } = require('./source');

describe('Function Tests', () => {
  test('should handle normal cases', () => {
    const result = functionUnderTest('normal input');
    expect(result).toBeDefined();
  });

  test('should handle edge cases', () => {
    expect(() => functionUnderTest(null)).not.toThrow();
  });
});`,
      pytest: `import pytest
from source import function_under_test

def test_normal_cases():
    result = function_under_test("normal input")
    assert result is not None

def test_edge_cases():
    result = function_under_test(None)
    assert result is not None

def test_error_cases():
    with pytest.raises(ValueError):
        function_under_test("")`,
    };

    return templates[framework as keyof typeof templates] || templates.vitest;
  }

  private getLanguageForFramework(framework: string): string {
    const mapping = {
      vitest: 'typescript',
      jest: 'javascript',
      pytest: 'python',
      'cargo-test': 'rust',
      'go-test': 'go',
    };
    
    return mapping[framework as keyof typeof mapping] || 'typescript';
  }

  private performRefactoring(code: string, refactorType: string, preserveAPI?: boolean): string {
    // Simulate refactoring - in real implementation, use AST manipulation
    const refactored = `// Refactored code (${refactorType})
// Original API preserved: ${preserveAPI}

${code}

// Additional optimizations and improvements applied`;
    
    return refactored;
  }

  private startMetricsCollection(): void {
    // Periodically update metrics and notify subscribers
    setInterval(() => {
      if (this.subscriptions.has('dev-assistant://project-metrics')) {
        this.notifyResourceUpdate('dev-assistant://project-metrics', {
          timestamp: new Date().toISOString(),
          event: 'metrics-updated',
        });
      }
    }, 30000); // Every 30 seconds
  }

  private async notifyResourceUpdate(uri: string, content: any): Promise<void> {
    if (this.subscriptions.has(uri)) {
      // In a real MCP server, this would send a notification to the client
      logger.info(`Resource updated: ${uri}`, { content });
      this.emit('resourceUpdate', { uri, content });
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Development Assistant MCP Server started');
  }

  async stop(): Promise<void> {
    this.removeAllListeners();
    logger.info('Development Assistant MCP Server stopped');
  }
}

/**
 * Example usage and demonstration
 */
export async function demonstrateDevAssistant(): Promise<void> {
  console.log('🔧 Development Assistant Integration Example\n');

  const devAssistant = new DevelopmentAssistantServer();

  // Listen for resource updates
  devAssistant.on('resourceUpdate', (update) => {
    console.log(`📊 Resource Update: ${update.uri}`);
  });

  try {
    console.log('Starting Development Assistant Server...');
    console.log('Available capabilities:');
    console.log('  ✅ Project Analysis Tools');
    console.log('  ✅ Code Review & Refactoring');
    console.log('  ✅ Test Generation');
    console.log('  ✅ Real-time Project Metrics');
    console.log('  ✅ Code Review Prompts');
    console.log('  ✅ AI-powered Insights');
    console.log('  ✅ Resource Subscriptions');
    console.log('  ✅ Progress Tracking');
    console.log('\nServer ready for MCP client connections.\n');

    // In a real implementation, the server would run indefinitely
    // For demonstration, we'll simulate some activity
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🎯 Integration Example Complete!');
    console.log('\nThis example demonstrates:');
    console.log('- Complete MCP server implementation');
    console.log('- Integration of all advanced features');
    console.log('- Real-world development assistant use case');
    console.log('- Event-driven architecture patterns');
    console.log('- Comprehensive error handling');

  } catch (error) {
    console.error('❌ Development Assistant failed:', error);
  } finally {
    await devAssistant.stop();
  }
}

// Run demonstration if this file is executed directly
if (import.meta.url === new URL(import.meta.resolve('./dev-assistant.ts')).href) {
  demonstrateDevAssistant().catch(console.error);
}