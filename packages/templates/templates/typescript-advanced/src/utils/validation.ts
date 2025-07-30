/**
 * Common validation utilities for MCP servers
 */

import { z } from 'zod';

/**
 * Common validation schemas
 */
export const schemas = {
  // String validations
  nonEmptyString: z.string().min(1, 'String cannot be empty'),

  // Number validations
  positiveNumber: z.number().positive('Number must be positive'),
  port: z.number().int().min(1).max(65535),

  // File path validations
  filePath: z.string().regex(/^[a-zA-Z0-9\-_./\\]+$/, 'Invalid file path'),

  // URL validations
  url: z.string().url('Invalid URL format'),

  // Common patterns
  identifier: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, 'Invalid identifier format'),
  semver: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid semantic version format'),
};

/**
 * Validate data against a schema and return formatted errors
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Create a validated environment variable getter
 */
export function createEnvValidator<T extends Record<string, z.ZodSchema>>(
  schema: T,
): { [K in keyof T]: z.infer<T[K]> } {
  const result = {} as { [K in keyof T]: z.infer<T[K]> };

  for (const [key, validator] of Object.entries(schema)) {
    const value = process.env[key];
    const validated = validator.safeParse(value);

    if (!validated.success) {
      throw new Error(`Invalid environment variable ${key}: ${validated.error.errors[0].message}`);
    }

    result[key as keyof T] = validated.data as z.infer<T[keyof T]>;
  }

  return result;
}

/**
 * Common parameter validators for MCP tools
 */
export const parameterValidators = {
  /**
   * Validate required string parameter
   */
  requiredString: (value: unknown, name: string): string => {
    const result = schemas.nonEmptyString.safeParse(value);
    if (!result.success) {
      throw new Error(`Parameter '${name}' is required and must be a non-empty string`);
    }
    return result.data;
  },

  /**
   * Validate optional string parameter
   */
  optionalString: (value: unknown, name: string): string | undefined => {
    if (value === undefined || value === null) return undefined;
    const result = z.string().safeParse(value);
    if (!result.success) {
      throw new Error(`Parameter '${name}' must be a string if provided`);
    }
    return result.data;
  },

  /**
   * Validate boolean parameter
   */
  boolean: (value: unknown, name: string): boolean => {
    const result = z.boolean().safeParse(value);
    if (!result.success) {
      throw new Error(`Parameter '${name}' must be a boolean`);
    }
    return result.data;
  },

  /**
   * Validate number parameter
   */
  number: (value: unknown, name: string): number => {
    const result = z.number().safeParse(value);
    if (!result.success) {
      throw new Error(`Parameter '${name}' must be a number`);
    }
    return result.data;
  },

  /**
   * Validate array parameter
   */
  array: <T>(value: unknown, name: string, itemValidator?: z.ZodSchema<T>): T[] => {
    const schema = itemValidator ? z.array(itemValidator) : z.array(z.unknown());
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new Error(`Parameter '${name}' must be an array`);
    }
    return result.data as T[];
  },
};
