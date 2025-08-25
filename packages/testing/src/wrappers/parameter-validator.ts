/**
 * Parameter validation for wrapped scripts
 */

import { logger } from '@context-pods/core';

/**
 * Parameter validator for wrapped scripts
 */
export class ParameterValidator {
  /**
   * Validate that a parameter was passed correctly
   */
  validateParameter(paramName: string, expectedValue: unknown, scriptOutput: unknown): boolean {
    try {
      // If output is an object, check if it contains parameter info
      if (
        typeof scriptOutput === 'object' &&
        scriptOutput !== null &&
        'parameters' in scriptOutput
      ) {
        const params = (scriptOutput as Record<string, unknown>).parameters as Record<
          string,
          unknown
        >;
        return this.compareValues(params[paramName], expectedValue);
      }

      // If output is a simple echo of parameters
      if (typeof scriptOutput === 'object' && scriptOutput !== null && paramName in scriptOutput) {
        return this.compareValues(
          (scriptOutput as Record<string, unknown>)[paramName],
          expectedValue,
        );
      }

      // For scripts that output parameter values directly
      if (typeof expectedValue === 'string' || typeof expectedValue === 'number') {
        return String(scriptOutput).includes(String(expectedValue));
      }

      logger.warn(`Could not validate parameter ${paramName} in output`);
      return false;
    } catch (error) {
      logger.error(`Parameter validation error: ${String(error)}`);
      return false;
    }
  }

  /**
   * Validate parameter types
   */
  validateParameterTypes(
    parameters: Record<string, unknown>,
    expectedTypes: Record<string, string>,
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const [param, expectedType] of Object.entries(expectedTypes)) {
      const value = parameters[param];
      const actualType = this.getType(value);

      if (actualType !== expectedType) {
        errors.push(`Parameter ${param}: expected ${expectedType}, got ${actualType}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate required parameters
   */
  validateRequiredParameters(
    parameters: Record<string, unknown>,
    required: string[],
  ): {
    valid: boolean;
    missing: string[];
  } {
    const missing: string[] = [];

    for (const param of required) {
      if (!(param in parameters) || parameters[param] === undefined) {
        missing.push(param);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Validate parameter constraints
   */
  validateParameterConstraints(
    parameters: Record<string, unknown>,
    constraints: Record<string, ParameterConstraint>,
  ): {
    valid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    for (const [param, constraint] of Object.entries(constraints)) {
      const value = parameters[param];

      if (value === undefined) {
        continue;
      }

      // Min/max constraints
      if (constraint.min !== undefined && Number(value) < constraint.min) {
        violations.push(
          `Parameter ${param}: value ${JSON.stringify(value)} is less than minimum ${constraint.min}`,
        );
      }

      if (constraint.max !== undefined && Number(value) > constraint.max) {
        violations.push(
          `Parameter ${param}: value ${JSON.stringify(value)} is greater than maximum ${constraint.max}`,
        );
      }

      // Pattern constraint
      if (
        constraint.pattern &&
        !constraint.pattern.test(typeof value === 'string' ? value : JSON.stringify(value))
      ) {
        violations.push(
          `Parameter ${param}: value ${JSON.stringify(value)} doesn't match pattern ${String(constraint.pattern)}`,
        );
      }

      // Enum constraint
      if (constraint.enum && !constraint.enum.includes(value)) {
        violations.push(
          `Parameter ${param}: value ${JSON.stringify(value)} is not one of ${constraint.enum?.join(', ') || 'unknown'}`,
        );
      }

      // Custom validator
      if (constraint.validator && !constraint.validator(value)) {
        violations.push(
          `Parameter ${param}: value ${JSON.stringify(value)} failed custom validation`,
        );
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Compare values for equality
   */
  private compareValues(actual: unknown, expected: unknown): boolean {
    // Handle arrays
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) return false;
      if (actual.length !== expected.length) return false;
      return expected.every((val, idx) => this.compareValues(actual[idx], val));
    }

    // Handle objects
    if (typeof expected === 'object' && expected !== null) {
      if (typeof actual !== 'object' || actual === null) return false;
      const expectedKeys = Object.keys(expected);
      const actualKeys = Object.keys(actual);
      if (expectedKeys.length !== actualKeys.length) return false;
      return expectedKeys.every((key) =>
        this.compareValues(
          (actual as Record<string, unknown>)[key],
          (expected as Record<string, unknown>)[key],
        ),
      );
    }

    // Handle primitives
    return actual === expected;
  }

  /**
   * Get type of value
   */
  private getType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
}

/**
 * Parameter constraint interface
 */
export interface ParameterConstraint {
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: unknown[];
  validator?: (value: unknown) => boolean;
}
