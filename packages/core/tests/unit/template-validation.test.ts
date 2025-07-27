/**
 * Unit tests for TemplateEngine - Variable Validation
 * Tests for array options validation and other validation improvements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultTemplateEngine } from '../../src/template-engine.js';
import type { TemplateMetadata } from '../../src/types.js';
import { TemplateLanguage } from '../../src/types.js';

describe('TemplateEngine - Variable Validation', () => {
  let engine: DefaultTemplateEngine;

  beforeEach(() => {
    engine = new DefaultTemplateEngine();
  });

  /**
   * Test array options validation
   */
  it('should validate array elements against options', async () => {
    const metadata: TemplateMetadata = {
      name: 'test-template',
      description: 'Test template',
      version: '1.0.0',
      author: 'Test',
      tags: ['test'],
      language: TemplateLanguage.TYPESCRIPT,
      variables: {
        toolCategories: {
          description: 'Categories of tools to include',
          type: 'array',
          required: false,
          default: ['file', 'data'],
          validation: {
            options: ['file', 'data', 'utility', 'network', 'system'],
          },
        },
      },
      files: [],
      dependencies: {},
      scripts: {},
    };

    // Test valid array values
    const validResult = await engine.validateVariables(metadata, {
      toolCategories: ['file', 'data', 'network'],
    });
    expect(validResult.isValid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    // Test invalid array values
    const invalidResult = await engine.validateVariables(metadata, {
      toolCategories: ['file', 'invalid', 'network'],
    });
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors).toHaveLength(1);
    expect(invalidResult.errors[0].message).toContain('invalid');
    expect(invalidResult.errors[0].message).toContain(
      'must be one of: file, data, utility, network, system',
    );
  });

  /**
   * Test string options validation still works
   */
  it('should validate string values against options', async () => {
    const metadata: TemplateMetadata = {
      name: 'test-template',
      description: 'Test template',
      version: '1.0.0',
      author: 'Test',
      tags: ['test'],
      language: TemplateLanguage.TYPESCRIPT,
      variables: {
        environment: {
          description: 'Environment type',
          type: 'string',
          required: true,
          validation: {
            options: ['development', 'staging', 'production'],
          },
        },
      },
      files: [],
      dependencies: {},
      scripts: {},
    };

    // Test valid string value
    const validResult = await engine.validateVariables(metadata, {
      environment: 'production',
    });
    expect(validResult.isValid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    // Test invalid string value
    const invalidResult = await engine.validateVariables(metadata, {
      environment: 'testing',
    });
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors).toHaveLength(1);
    expect(invalidResult.errors[0].message).toBe(
      "Variable 'environment' must be one of: development, staging, production",
    );
  });

  /**
   * Test array type validation
   */
  it('should validate array type correctly', async () => {
    const metadata: TemplateMetadata = {
      name: 'test-template',
      description: 'Test template',
      version: '1.0.0',
      author: 'Test',
      tags: ['test'],
      language: TemplateLanguage.TYPESCRIPT,
      variables: {
        toolCategories: {
          description: 'Categories of tools',
          type: 'array',
          required: true,
          validation: {
            options: ['file', 'data', 'utility'],
          },
        },
      },
      files: [],
      dependencies: {},
      scripts: {},
    };

    // Test passing a string instead of array
    const stringResult = await engine.validateVariables(metadata, {
      toolCategories: 'file',
    });
    expect(stringResult.isValid).toBe(false);
    expect(stringResult.errors).toHaveLength(1);
    expect(stringResult.errors[0].message).toBe(
      "Variable 'toolCategories' should be of type 'array', got 'string'",
    );

    // Test passing an array with wrong string format (from user issue)
    const arrayStringResult = await engine.validateVariables(metadata, {
      toolCategories: ['data'],
    });
    expect(arrayStringResult.isValid).toBe(true);
    expect(arrayStringResult.errors).toHaveLength(0);
  });

  /**
   * Test empty array validation
   */
  it('should handle empty arrays correctly', async () => {
    const metadata: TemplateMetadata = {
      name: 'test-template',
      description: 'Test template',
      version: '1.0.0',
      author: 'Test',
      tags: ['test'],
      language: TemplateLanguage.TYPESCRIPT,
      variables: {
        toolCategories: {
          description: 'Categories of tools',
          type: 'array',
          required: false,
          default: [],
          validation: {
            options: ['file', 'data', 'utility'],
          },
        },
      },
      files: [],
      dependencies: {},
      scripts: {},
    };

    // Empty array should be valid
    const result = await engine.validateVariables(metadata, {
      toolCategories: [],
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * Test multiple validation errors
   */
  it('should report multiple validation errors', async () => {
    const metadata: TemplateMetadata = {
      name: 'test-template',
      description: 'Test template',
      version: '1.0.0',
      author: 'Test',
      tags: ['test'],
      language: TemplateLanguage.TYPESCRIPT,
      variables: {
        serverName: {
          description: 'Server name',
          type: 'string',
          required: true,
          validation: {
            pattern: '^[a-z0-9-]+$',
          },
        },
        port: {
          description: 'Port number',
          type: 'number',
          required: true,
          validation: {
            min: 1000,
            max: 9999,
          },
        },
        toolCategories: {
          description: 'Tool categories',
          type: 'array',
          required: false,
          validation: {
            options: ['file', 'data'],
          },
        },
      },
      files: [],
      dependencies: {},
      scripts: {},
    };

    const result = await engine.validateVariables(metadata, {
      serverName: 'Test_Server', // Invalid pattern
      port: 80, // Below minimum
      toolCategories: ['file', 'invalid', 'data', 'wrong'], // Multiple invalid values
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(3);

    // Check each error
    const errors = result.errors;
    expect(errors.find((e) => e.field === 'serverName')?.message).toContain(
      'does not match required pattern',
    );
    expect(errors.find((e) => e.field === 'port')?.message).toContain('must be at least 1000');
    expect(errors.find((e) => e.field === 'toolCategories')?.message).toContain(
      'invalid values: invalid, wrong',
    );
  });
});
