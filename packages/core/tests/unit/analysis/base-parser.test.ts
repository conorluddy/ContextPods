import { describe, it, expect, beforeEach } from 'vitest';

import { BaseParser } from '../../../src/analysis/parsers/base-parser.js';
import {
  TemplateLanguage,
  type FunctionMetadata,
  type DetectedPattern,
} from '../../../src/types.js';

// Create a concrete implementation for testing
class TestParser extends BaseParser {
  constructor() {
    super(TemplateLanguage.TYPESCRIPT);
  }

  async parseFile(): Promise<FunctionMetadata[]> {
    return [];
  }

  async detectPatterns(): Promise<DetectedPattern[]> {
    return [];
  }
}

describe('BaseParser', () => {
  let parser: TestParser;

  beforeEach(() => {
    parser = new TestParser();
  });

  describe('constructor', () => {
    it('should initialize with correct language', () => {
      expect(parser['language']).toBe(TemplateLanguage.TYPESCRIPT);
    });
  });

  describe('scoreFunctionForMCP', () => {
    // eslint-disable-next-line max-lines-per-function
    const createMockFunction = (overrides: Partial<FunctionMetadata> = {}): FunctionMetadata => ({
      name: 'testFunction',
      signature: 'function testFunction(): void',
      parameters: [],
      returnType: 'void',
      complexity: {
        cyclomaticComplexity: 5,
        linesOfCode: 50,
        dependencies: 1,
      },
      location: {
        filePath: '/test.ts',
        startLine: 1,
        endLine: 10,
      },
      documentation: undefined,
      isExported: false,
      isAsync: false,
      ...overrides,
    });

    const createMockPattern = (type: string, confidence = 0.8): DetectedPattern => ({
      type,
      confidence,
      description: `${type} pattern detected`,
      evidence: ['example evidence'],
    });

    it('should give base score for exported functions', () => {
      const func = createMockFunction({ isExported: true });
      const score = parser['scoreFunctionForMCP'](func, []);

      expect(score).toBeGreaterThan(0);
      // Exported function should get +20 base points
    });

    it('should score optimal complexity higher', () => {
      const optimalFunc = createMockFunction({
        complexity: { cyclomaticComplexity: 5, linesOfCode: 50, dependencies: 1 },
      });
      const tooSimpleFunc = createMockFunction({
        complexity: { cyclomaticComplexity: 1, linesOfCode: 50, dependencies: 1 },
      });
      const tooComplexFunc = createMockFunction({
        complexity: { cyclomaticComplexity: 25, linesOfCode: 50, dependencies: 1 },
      });

      const optimalScore = parser['scoreFunctionForMCP'](optimalFunc, []);
      const simpleScore = parser['scoreFunctionForMCP'](tooSimpleFunc, []);
      const complexScore = parser['scoreFunctionForMCP'](tooComplexFunc, []);

      expect(optimalScore).toBeGreaterThan(simpleScore);
      expect(optimalScore).toBeGreaterThan(complexScore);
    });

    it('should score optimal lines of code higher', () => {
      const optimalFunc = createMockFunction({
        complexity: { cyclomaticComplexity: 5, linesOfCode: 50, dependencies: 1 },
      });
      const tooShortFunc = createMockFunction({
        complexity: { cyclomaticComplexity: 5, linesOfCode: 5, dependencies: 1 },
      });
      const tooLongFunc = createMockFunction({
        complexity: { cyclomaticComplexity: 5, linesOfCode: 500, dependencies: 1 },
      });

      const optimalScore = parser['scoreFunctionForMCP'](optimalFunc, []);
      const shortScore = parser['scoreFunctionForMCP'](tooShortFunc, []);
      const longScore = parser['scoreFunctionForMCP'](tooLongFunc, []);

      expect(optimalScore).toBeGreaterThan(shortScore);
      expect(optimalScore).toBeGreaterThan(longScore);
    });

    it('should score optimal parameter count higher', () => {
      const optimalFunc = createMockFunction({
        parameters: [
          { name: 'param1', type: 'string', optional: false },
          { name: 'param2', type: 'number', optional: false },
        ],
      });
      const noParamsFunc = createMockFunction({ parameters: [] });
      const tooManyParamsFunc = createMockFunction({
        parameters: Array.from({ length: 10 }, (_, i) => ({
          name: `param${i}`,
          type: 'any',
          optional: false,
        })),
      });

      const optimalScore = parser['scoreFunctionForMCP'](optimalFunc, []);
      const noParamsScore = parser['scoreFunctionForMCP'](noParamsFunc, []);
      const tooManyScore = parser['scoreFunctionForMCP'](tooManyParamsFunc, []);

      expect(optimalScore).toBeGreaterThan(noParamsScore);
      expect(optimalScore).toBeGreaterThan(tooManyScore);
    });

    it('should add bonus for documentation', () => {
      const documentedFunc = createMockFunction({
        documentation: 'This is a well-documented function that does important work',
      });
      const undocumentedFunc = createMockFunction({ documentation: undefined });

      const documentedScore = parser['scoreFunctionForMCP'](documentedFunc, []);
      const undocumentedScore = parser['scoreFunctionForMCP'](undocumentedFunc, []);

      expect(documentedScore).toBeGreaterThan(undocumentedScore);
    });

    it('should add bonus for async functions', () => {
      const asyncFunc = createMockFunction({ isAsync: true });
      const syncFunc = createMockFunction({ isAsync: false });

      const asyncScore = parser['scoreFunctionForMCP'](asyncFunc, []);
      const syncScore = parser['scoreFunctionForMCP'](syncFunc, []);

      expect(asyncScore).toBeGreaterThan(syncScore);
    });

    it('should score API call patterns highest', () => {
      const func = createMockFunction();
      const apiPattern = createMockPattern('api-call', 1.0);

      const score = parser['scoreFunctionForMCP'](func, [apiPattern]);

      // API calls should get +30 points at full confidence
      expect(score).toBeGreaterThan(30);
    });

    it('should score file operations well', () => {
      const func = createMockFunction();
      const filePattern = createMockPattern('file-operation', 1.0);

      const score = parser['scoreFunctionForMCP'](func, [filePattern]);

      // File ops should get +25 points at full confidence
      expect(score).toBeGreaterThan(25);
    });

    it('should score database queries well', () => {
      const func = createMockFunction();
      const dbPattern = createMockPattern('database-query', 1.0);

      const score = parser['scoreFunctionForMCP'](func, [dbPattern]);

      // DB queries should get +25 points at full confidence
      expect(score).toBeGreaterThan(25);
    });

    it('should apply confidence weighting to patterns', () => {
      const func = createMockFunction();
      const highConfidencePattern = createMockPattern('api-call', 1.0);
      const lowConfidencePattern = createMockPattern('api-call', 0.3);

      const highScore = parser['scoreFunctionForMCP'](func, [highConfidencePattern]);
      const lowScore = parser['scoreFunctionForMCP'](func, [lowConfidencePattern]);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should accumulate scores from multiple patterns', () => {
      const func = createMockFunction();
      const patterns = [
        createMockPattern('api-call', 0.8),
        createMockPattern('file-operation', 0.6),
        createMockPattern('validation-logic', 0.7),
      ];

      const multiPatternScore = parser['scoreFunctionForMCP'](func, patterns);
      const singlePatternScore = parser['scoreFunctionForMCP'](func, [patterns[0]]);

      expect(multiPatternScore).toBeGreaterThan(singlePatternScore);
    });

    it('should cap score at 100', () => {
      const perfectFunc = createMockFunction({
        isExported: true,
        isAsync: true,
        documentation: 'Excellent documentation for this perfect function',
        parameters: [
          { name: 'param1', type: 'string', optional: false },
          { name: 'param2', type: 'number', optional: false },
        ],
        complexity: { cyclomaticComplexity: 8, linesOfCode: 75, dependencies: 2 },
      });

      const maxPatterns = [
        createMockPattern('api-call', 1.0),
        createMockPattern('file-operation', 1.0),
        createMockPattern('database-query', 1.0),
        createMockPattern('validation-logic', 1.0),
        createMockPattern('external-dependency', 1.0),
      ];

      const score = parser['scoreFunctionForMCP'](perfectFunc, maxPatterns);

      expect(score).toBeLessThanOrEqual(100);
    });

    it('should have minimum score of 0', () => {
      const poorFunc = createMockFunction({
        isExported: false,
        isAsync: false,
        documentation: undefined,
        parameters: [],
        complexity: { cyclomaticComplexity: 50, linesOfCode: 1000, dependencies: 0 },
      });

      const score = parser['scoreFunctionForMCP'](poorFunc, []);

      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('categorizeFunctionFromPatterns', () => {
    it('should categorize as api-integration for API patterns', () => {
      const patterns = [{ type: 'api-call', confidence: 0.9, description: '', evidence: [] }];

      const category = parser['categorizeFunctionFromPatterns'](patterns);

      expect(category).toBe('api-integration');
    });

    it('should categorize as file-processing for file patterns', () => {
      const patterns = [{ type: 'file-operation', confidence: 0.8, description: '', evidence: [] }];

      const category = parser['categorizeFunctionFromPatterns'](patterns);

      expect(category).toBe('file-processing');
    });

    it('should categorize as api-integration for database patterns', () => {
      const patterns = [{ type: 'database-query', confidence: 0.7, description: '', evidence: [] }];

      const category = parser['categorizeFunctionFromPatterns'](patterns);

      expect(category).toBe('api-integration');
    });

    it('should categorize as validation for validation patterns', () => {
      const patterns = [
        { type: 'validation-logic', confidence: 0.6, description: '', evidence: [] },
      ];

      const category = parser['categorizeFunctionFromPatterns'](patterns);

      expect(category).toBe('validation');
    });

    it('should default to utility for unknown patterns', () => {
      const patterns = [
        { type: 'unknown-pattern', confidence: 0.5, description: '', evidence: [] },
      ];

      const category = parser['categorizeFunctionFromPatterns'](patterns);

      expect(category).toBe('utility');
    });

    it('should choose highest confidence pattern', () => {
      const patterns = [
        { type: 'file-operation', confidence: 0.3, description: '', evidence: [] },
        { type: 'api-call', confidence: 0.8, description: '', evidence: [] },
        { type: 'validation-logic', confidence: 0.5, description: '', evidence: [] },
      ];

      const category = parser['categorizeFunctionFromPatterns'](patterns);

      expect(category).toBe('api-integration'); // API call has highest confidence
    });

    it('should handle empty patterns array', () => {
      const category = parser['categorizeFunctionFromPatterns']([]);

      expect(category).toBe('utility');
    });
  });

  describe('generateOpportunity', () => {
    const mockFunc: FunctionMetadata = {
      name: 'fetchUserData',
      signature: 'async function fetchUserData(userId: string): Promise<User>',
      parameters: [{ name: 'userId', type: 'string', optional: false }],
      returnType: 'Promise<User>',
      complexity: {
        cyclomaticComplexity: 6,
        linesOfCode: 45,
        dependencies: 2,
      },
      location: {
        filePath: '/src/api/users.ts',
        startLine: 15,
        endLine: 60,
      },
      documentation: 'Fetches user data from the API',
      isExported: true,
      isAsync: true,
    };

    const mockPatterns: DetectedPattern[] = [
      {
        type: 'api-call',
        confidence: 0.9,
        description: 'HTTP API calls detected',
        evidence: ['fetch(', 'response.json()'],
      },
    ];

    // eslint-disable-next-line max-lines-per-function
    it('should generate complete opportunity object', async () => {
      const score = 85;
      const opportunity = await parser['generateOpportunity'](mockFunc, mockPatterns, score);

      expect(opportunity).toHaveProperty('id');
      expect(opportunity).toHaveProperty('functionName', 'fetchUserData');
      expect(opportunity).toHaveProperty('filePath', '/src/api/users.ts');
      expect(opportunity).toHaveProperty('language', TemplateLanguage.TYPESCRIPT);
      expect(opportunity).toHaveProperty('score', 85);
      expect(opportunity).toHaveProperty('category');
      expect(opportunity).toHaveProperty('description');
      expect(opportunity).toHaveProperty('suggestedTemplate');
      expect(opportunity).toHaveProperty('reasoning');
      expect(opportunity).toHaveProperty('implementation');
      expect(opportunity).toHaveProperty('function', mockFunc);
      expect(opportunity).toHaveProperty('patterns', mockPatterns);
    });

    it('should generate unique ID', async () => {
      const score = 85;
      const opportunity = await parser['generateOpportunity'](mockFunc, mockPatterns, score);

      expect(opportunity.id).toBe('/src/api/users.ts:fetchUserData:15');
    });

    it('should generate kebab-case tool name', async () => {
      const camelCaseFunc = { ...mockFunc, name: 'fetchUserDataById' };
      const score = 85;
      const opportunity = await parser['generateOpportunity'](camelCaseFunc, mockPatterns, score);

      expect(opportunity.implementation.toolName).toBe('fetch-user-data-by-id');
    });

    it('should include reasoning for exported functions', async () => {
      const score = 85;
      const opportunity = await parser['generateOpportunity'](mockFunc, mockPatterns, score);

      expect(opportunity.reasoning).toContain('Function is exported and accessible');
    });

    it('should include reasoning for parameters', async () => {
      const score = 85;
      const opportunity = await parser['generateOpportunity'](mockFunc, mockPatterns, score);

      expect(opportunity.reasoning.some((r) => r.includes('clear input parameter'))).toBe(true);
    });

    it('should include reasoning for async functions', async () => {
      const score = 85;
      const opportunity = await parser['generateOpportunity'](mockFunc, mockPatterns, score);

      expect(opportunity.reasoning).toContain('Async function likely performs I/O operations');
    });

    it('should include reasoning for high-confidence patterns', async () => {
      const score = 85;
      const opportunity = await parser['generateOpportunity'](mockFunc, mockPatterns, score);

      expect(opportunity.reasoning.some((r) => r.includes('api-call'))).toBe(true);
    });

    it('should suggest appropriate template based on language and score', async () => {
      const highScoreFunc = mockFunc;
      const lowScoreFunc = { ...mockFunc };

      const highScoreOpp = await parser['generateOpportunity'](highScoreFunc, mockPatterns, 85);
      const lowScoreOpp = await parser['generateOpportunity'](lowScoreFunc, mockPatterns, 45);

      expect(highScoreOpp.suggestedTemplate).toBe('typescript-advanced');
      expect(lowScoreOpp.suggestedTemplate).toBe('basic');
    });

    it('should generate input schema from parameters', async () => {
      const score = 85;
      const opportunity = await parser['generateOpportunity'](mockFunc, mockPatterns, score);

      expect(opportunity.implementation.inputSchema).toHaveProperty('type', 'object');
      expect(opportunity.implementation.inputSchema).toHaveProperty('properties');
      expect(opportunity.implementation.inputSchema).toHaveProperty('required');

      const properties = (opportunity.implementation.inputSchema as any).properties;
      const required = (opportunity.implementation.inputSchema as any).required;

      expect(properties).toHaveProperty('userId');
      expect(properties.userId).toHaveProperty('type', 'string');
      expect(required).toContain('userId');
    });

    it('should map complexity levels correctly', async () => {
      const lowComplexityFunc = {
        ...mockFunc,
        complexity: { ...mockFunc.complexity, cyclomaticComplexity: 3 },
      };
      const mediumComplexityFunc = {
        ...mockFunc,
        complexity: { ...mockFunc.complexity, cyclomaticComplexity: 10 },
      };
      const highComplexityFunc = {
        ...mockFunc,
        complexity: { ...mockFunc.complexity, cyclomaticComplexity: 20 },
      };

      const lowOpp = await parser['generateOpportunity'](lowComplexityFunc, mockPatterns, 85);
      const mediumOpp = await parser['generateOpportunity'](mediumComplexityFunc, mockPatterns, 85);
      const highOpp = await parser['generateOpportunity'](highComplexityFunc, mockPatterns, 85);

      expect(lowOpp.implementation.complexity).toBe('low');
      expect(mediumOpp.implementation.complexity).toBe('medium');
      expect(highOpp.implementation.complexity).toBe('high');
    });

    it('should map effort levels correctly', async () => {
      const easyFunc = {
        ...mockFunc,
        complexity: { ...mockFunc.complexity, cyclomaticComplexity: 5 },
      };

      const easyHighScore = await parser['generateOpportunity'](easyFunc, mockPatterns, 85);
      const easyMediumScore = await parser['generateOpportunity'](easyFunc, mockPatterns, 65);
      const easyLowScore = await parser['generateOpportunity'](easyFunc, mockPatterns, 45);

      expect(easyHighScore.implementation.estimatedEffort).toBe('low');
      expect(easyMediumScore.implementation.estimatedEffort).toBe('medium');
      expect(easyLowScore.implementation.estimatedEffort).toBe('high');
    });

    it('should extract dependencies from patterns', async () => {
      const patternsWithDeps: DetectedPattern[] = [
        {
          type: 'api-call',
          confidence: 0.9,
          description: 'API calls detected',
          evidence: [
            'import axios from "axios"',
            'const response = await fetch("/api/data")',
            'import { request } from "http"',
          ],
        },
      ];

      const score = 85;
      const opportunity = await parser['generateOpportunity'](mockFunc, patternsWithDeps, score);

      expect(opportunity.implementation.dependencies).toContain('axios');
      expect(opportunity.implementation.dependencies).not.toContain('fetch'); // Built-in
    });
  });

  describe('readFileContent', () => {
    it('should be a protected method available to subclasses', () => {
      expect(typeof parser['readFileContent']).toBe('function');
    });
  });
});
