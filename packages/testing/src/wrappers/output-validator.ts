/**
 * Output validation for wrapped scripts
 */

import { z, type ZodSchema } from 'zod';

/**
 * Output validator for wrapped scripts
 */
export class OutputValidator {
  /**
   * Validate script output against expected value
   */
  validateOutput(actual: unknown, expected: unknown): void {
    // If expected is a schema, validate against it
    if (this.isZodSchema(expected)) {
      const result = expected.safeParse(actual);
      if (!result.success) {
        throw new Error(`Output validation failed: ${result.error.message}`);
      }
      return;
    }

    // If expected is a function, use it as validator
    if (typeof expected === 'function') {
      const isValid = (expected as (val: unknown) => boolean)(actual);
      if (!isValid) {
        throw new Error('Output validation failed: custom validator returned false');
      }
      return;
    }

    // Otherwise, do deep equality check
    if (!this.deepEqual(actual, expected)) {
      throw new Error(
        `Output mismatch:\nExpected: ${JSON.stringify(expected, null, 2)}\nActual: ${JSON.stringify(actual, null, 2)}`,
      );
    }
  }

  /**
   * Validate output format
   */
  validateFormat(output: unknown, format: 'json' | 'text' | 'csv' | 'xml' | 'yaml'): void {
    switch (format) {
      case 'json':
        this.validateJsonFormat(output);
        break;
      case 'text':
        this.validateTextFormat(output);
        break;
      case 'csv':
        this.validateCsvFormat(output);
        break;
      case 'xml':
        this.validateXmlFormat(output);
        break;
      case 'yaml':
        this.validateYamlFormat(output);
        break;
      default:
        throw new Error(`Unknown format: ${format as string}`);
    }
  }

  /**
   * Validate MCP tool output format
   */
  validateMCPOutput(output: unknown): void {
    const MCPOutputSchema = z.object({
      content: z.array(
        z.object({
          type: z.enum(['text', 'image', 'resource']),
          text: z.string().optional(),
          data: z.string().optional(),
          mimeType: z.string().optional(),
          resource: z
            .object({
              uri: z.string(),
              text: z.string().optional(),
              mimeType: z.string().optional(),
            })
            .optional(),
        }),
      ),
      isError: z.boolean().optional(),
    });

    const result = MCPOutputSchema.safeParse(output);
    if (!result.success) {
      throw new Error(`Invalid MCP output format: ${result.error.message}`);
    }
  }

  /**
   * Validate output contains expected patterns
   */
  validatePatterns(output: string, patterns: RegExp[]): void {
    for (const pattern of patterns) {
      if (!pattern.test(output)) {
        throw new Error(`Output doesn't match pattern: ${pattern}`);
      }
    }
  }

  /**
   * Validate output doesn't contain forbidden patterns
   */
  validateNoForbiddenPatterns(output: string, patterns: RegExp[]): void {
    for (const pattern of patterns) {
      if (pattern.test(output)) {
        throw new Error(`Output contains forbidden pattern: ${pattern}`);
      }
    }
  }

  /**
   * Validate output structure
   */
  validateStructure(output: unknown, structure: OutputStructure): void {
    if (structure.type) {
      const actualType = Array.isArray(output) ? 'array' : typeof output;
      if (actualType !== structure.type) {
        throw new Error(`Expected output type ${structure.type}, got ${actualType}`);
      }
    }

    if (structure.required && typeof output === 'object' && output !== null) {
      for (const field of structure.required) {
        if (!(field in output)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
    }

    if (structure.properties && typeof output === 'object' && output !== null) {
      for (const [key, validator] of Object.entries(structure.properties)) {
        const value = (output as Record<string, unknown>)[key];
        if (value !== undefined) {
          validator(value);
        }
      }
    }

    if (structure.minLength !== undefined) {
      const length = Array.isArray(output) ? output.length : String(output).length;
      if (length < structure.minLength) {
        throw new Error(`Output length ${length} is less than minimum ${structure.minLength}`);
      }
    }

    if (structure.maxLength !== undefined) {
      const length = Array.isArray(output) ? output.length : String(output).length;
      if (length > structure.maxLength) {
        throw new Error(`Output length ${length} is greater than maximum ${structure.maxLength}`);
      }
    }
  }

  /**
   * Validate JSON format
   */
  private validateJsonFormat(output: unknown): void {
    if (typeof output === 'string') {
      try {
        JSON.parse(output);
      } catch {
        throw new Error('Output is not valid JSON');
      }
    } else if (typeof output !== 'object' || output === null) {
      throw new Error('Output is not a JSON object');
    }
  }

  /**
   * Validate text format
   */
  private validateTextFormat(output: unknown): void {
    if (typeof output !== 'string') {
      throw new Error('Output is not text');
    }
  }

  /**
   * Validate CSV format
   */
  private validateCsvFormat(output: unknown): void {
    if (typeof output !== 'string') {
      throw new Error('Output is not CSV text');
    }

    // Basic CSV validation - check for delimiter consistency
    const lines = output.split('\n').filter(Boolean);
    if (lines.length > 0) {
      const firstLine = lines[0];
      if (!firstLine) {
        throw new Error('Empty first line in CSV');
      }
      const firstLineCommas = (firstLine.match(/,/g) || []).length;
      for (const line of lines) {
        const commas = (line.match(/,/g) || []).length;
        if (commas !== firstLineCommas) {
          throw new Error('Inconsistent CSV column count');
        }
      }
    }
  }

  /**
   * Validate XML format
   */
  private validateXmlFormat(output: unknown): void {
    if (typeof output !== 'string') {
      throw new Error('Output is not XML text');
    }

    // Basic XML validation - check for balanced tags
    const openTags = output.match(/<[^/][^>]*>/g) || [];
    const closeTags = output.match(/<\/[^>]+>/g) || [];

    if (openTags.length !== closeTags.length) {
      throw new Error('Unbalanced XML tags');
    }
  }

  /**
   * Validate YAML format
   */
  private validateYamlFormat(output: unknown): void {
    if (typeof output !== 'string') {
      throw new Error('Output is not YAML text');
    }

    // Basic YAML validation - check for proper indentation
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.trim() && !line.match(/^(\s*)(\S.*)?$/)) {
        throw new Error('Invalid YAML indentation');
      }
    }
  }

  /**
   * Check if value is a Zod schema
   */
  private isZodSchema(value: unknown): value is ZodSchema {
    return (
      typeof value === 'object' &&
      value !== null &&
      'safeParse' in value &&
      typeof (value as { safeParse?: unknown }).safeParse === 'function'
    );
  }

  /**
   * Deep equality check
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;

    if (typeof a !== typeof b) return false;

    if (a === null || b === null) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, idx) => this.deepEqual(val, b[idx]));
    }

    if (typeof a === 'object' && typeof b === 'object') {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every((key) =>
        this.deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
      );
    }

    return false;
  }
}

/**
 * Output structure definition
 */
export interface OutputStructure {
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: string[];
  properties?: Record<string, (value: unknown) => void>;
  minLength?: number;
  maxLength?: number;
}
