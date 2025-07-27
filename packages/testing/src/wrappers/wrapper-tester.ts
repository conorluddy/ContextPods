/**
 * Script wrapper testing implementation
 */

import { execa } from 'execa';
import { dirname } from 'path';
import { promises as fs } from 'fs';
import { logger } from '@context-pods/core';
import type { WrapperTestConfig, WrapperTestCase, TestResult, TestSuiteResult } from '../types.js';
import { TestStatus } from '../types.js';
import { ParameterValidator } from './parameter-validator.js';
import { OutputValidator } from './output-validator.js';

/**
 * Script wrapper tester
 *
 * Tests wrapped scripts to ensure they work correctly through MCP interface
 */
export class ScriptWrapperTester {
  private config: WrapperTestConfig;
  private paramValidator: ParameterValidator;
  private outputValidator: OutputValidator;

  constructor(config: WrapperTestConfig) {
    this.config = config;
    this.paramValidator = new ParameterValidator();
    this.outputValidator = new OutputValidator();
  }

  /**
   * Run all test cases
   */
  async runTests(): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const tests: TestResult[] = [];

    logger.info(`Running wrapper tests for: ${this.config.scriptPath}`);

    // Validate script exists
    try {
      await fs.access(this.config.scriptPath);
    } catch (error) {
      tests.push({
        name: 'Script Validation',
        status: TestStatus.FAILED,
        duration: 0,
        error: `Script not found: ${this.config.scriptPath}`,
      });

      return this.createSuiteResult(tests, startTime);
    }

    // Run each test case
    for (const testCase of this.config.testCases) {
      const result = await this.runTestCase(testCase);
      tests.push(result);
    }

    // Additional validation tests
    tests.push(await this.testParameterPassing());
    tests.push(await this.testErrorHandling());
    tests.push(await this.testOutputFormat());
    tests.push(await this.testTypeConversion());

    return this.createSuiteResult(tests, startTime);
  }

  /**
   * Run a single test case
   */
  private async runTestCase(testCase: WrapperTestCase): Promise<TestResult> {
    const startTime = Date.now();

    try {
      logger.info(`Running test: ${testCase.name}`);

      // Execute the wrapped script
      const result = await this.executeScript(testCase.input, testCase.timeout);

      // Validate output
      if (testCase.expectedOutput !== undefined) {
        this.outputValidator.validateOutput(result.output, testCase.expectedOutput);
      }

      // Validate error
      if (testCase.expectedError) {
        if (!result.error) {
          throw new Error('Expected error but none occurred');
        }

        if (testCase.expectedError instanceof RegExp) {
          if (!testCase.expectedError.test(result.error)) {
            throw new Error(`Error message doesn't match pattern: ${result.error}`);
          }
        } else {
          if (!result.error.includes(testCase.expectedError)) {
            throw new Error(`Error message doesn't match: ${result.error}`);
          }
        }
      } else if (result.error) {
        throw new Error(`Unexpected error: ${result.error}`);
      }

      return {
        name: testCase.name,
        status: TestStatus.PASSED,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: testCase.name,
        status: TestStatus.FAILED,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute wrapped script
   */
  private async executeScript(
    input: Record<string, unknown>,
    timeout?: number,
  ): Promise<{
    output?: unknown;
    error?: string;
  }> {
    try {
      const command = this.getExecutionCommand();
      const args = this.buildArguments(input);

      const execResult = await execa(command.cmd, [...command.args, ...args], {
        cwd: dirname(this.config.scriptPath),
        timeout: timeout || this.config.timeout || 30000,
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });

      // Parse output
      try {
        return {
          output: JSON.parse(execResult.stdout) as unknown,
        };
      } catch {
        // If not JSON, return raw output
        return {
          output: execResult.stdout,
        };
      }
    } catch (error: unknown) {
      return {
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get execution command based on language
   */
  private getExecutionCommand(): { cmd: string; args: string[] } {
    switch (this.config.language) {
      case 'typescript':
        return { cmd: 'npx', args: ['tsx'] };
      case 'python':
        return { cmd: 'python', args: [] };
      case 'rust':
        return { cmd: 'cargo', args: ['run', '--'] };
      case 'shell':
        return { cmd: 'bash', args: [] };
      default:
        throw new Error(`Unsupported language: ${this.config.language as string}`);
    }
  }

  /**
   * Build command arguments from input
   */
  private buildArguments(input: Record<string, unknown>): string[] {
    const args: string[] = [this.config.scriptPath];

    // Convert input to command-line arguments
    for (const [key, value] of Object.entries(input)) {
      if (value === true) {
        args.push(`--${key}`);
      } else if (value !== false && value !== null && value !== undefined) {
        args.push(`--${key}`, String(value));
      }
    }

    return args;
  }

  /**
   * Test parameter passing
   */
  private async testParameterPassing(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Test various parameter types
      const testCases = [
        { name: 'string-param', value: 'test value' },
        { name: 'number-param', value: 42 },
        { name: 'boolean-param', value: true },
        { name: 'array-param', value: ['a', 'b', 'c'] },
        { name: 'object-param', value: { nested: 'value' } },
      ];

      for (const test of testCases) {
        const input = { [test.name]: test.value };
        const result = await this.executeScript(input);

        if (result.error) {
          throw new Error(`Parameter test failed for ${test.name}: ${result.error}`);
        }

        // Validate parameter was received correctly
        if (!this.paramValidator.validateParameter(test.name, test.value, result.output)) {
          throw new Error(`Parameter validation failed for ${test.name}`);
        }
      }

      return {
        name: 'Parameter Passing',
        status: TestStatus.PASSED,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Parameter Passing',
        status: TestStatus.FAILED,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Test various error scenarios
      const errorTests = [
        {
          name: 'missing-required-param',
          input: {},
          expectedError: /required parameter/i,
        },
        {
          name: 'invalid-type',
          input: { number: 'not-a-number' },
          expectedError: /invalid type/i,
        },
        {
          name: 'out-of-range',
          input: { value: -1 },
          expectedError: /out of range/i,
        },
      ];

      for (const test of errorTests) {
        const result = await this.executeScript(test.input);

        if (!result.error) {
          throw new Error(`Expected error for ${test.name} but none occurred`);
        }

        if (test.expectedError && !test.expectedError.test(result.error)) {
          throw new Error(`Error doesn't match pattern for ${test.name}: ${result.error}`);
        }
      }

      return {
        name: 'Error Handling',
        status: TestStatus.PASSED,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Error Handling',
        status: TestStatus.FAILED,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test output format
   */
  private async testOutputFormat(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Test different output formats
      const formatTests = [
        {
          name: 'json-output',
          input: { format: 'json' },
          validator: (output: unknown): void => {
            if (typeof output !== 'object') {
              throw new Error('Expected JSON object output');
            }
          },
        },
        {
          name: 'text-output',
          input: { format: 'text' },
          validator: (output: unknown): void => {
            if (typeof output !== 'string') {
              throw new Error('Expected text output');
            }
          },
        },
        {
          name: 'array-output',
          input: { format: 'array' },
          validator: (output: unknown): void => {
            if (!Array.isArray(output)) {
              throw new Error('Expected array output');
            }
          },
        },
      ];

      for (const test of formatTests) {
        const result = await this.executeScript(test.input);

        if (result.error) {
          throw new Error(`Format test failed for ${test.name}: ${result.error}`);
        }

        test.validator(result.output);
      }

      return {
        name: 'Output Format',
        status: TestStatus.PASSED,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Output Format',
        status: TestStatus.FAILED,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test type conversion
   */
  private async testTypeConversion(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Test type conversion for different languages
      const conversionTests = [
        {
          name: 'string-to-number',
          input: { value: '123' },
          expectedType: 'number',
        },
        {
          name: 'string-to-boolean',
          input: { flag: 'true' },
          expectedType: 'boolean',
        },
        {
          name: 'csv-to-array',
          input: { list: 'a,b,c' },
          expectedType: 'array',
        },
      ];

      for (const test of conversionTests) {
        const result = await this.executeScript(test.input);

        if (result.error) {
          throw new Error(`Conversion test failed for ${test.name}: ${result.error}`);
        }

        // Validate type conversion
        const outputType = Array.isArray(result.output) ? 'array' : typeof result.output;
        if (outputType !== test.expectedType) {
          throw new Error(
            `Type mismatch for ${test.name}: expected ${test.expectedType}, got ${outputType}`,
          );
        }
      }

      return {
        name: 'Type Conversion',
        status: TestStatus.PASSED,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Type Conversion',
        status: TestStatus.FAILED,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create test suite result
   */
  private createSuiteResult(tests: TestResult[], startTime: number): TestSuiteResult {
    const passed = tests.filter((t) => t.status === TestStatus.PASSED).length;
    const failed = tests.filter((t) => t.status === TestStatus.FAILED).length;
    const skipped = tests.filter((t) => t.status === TestStatus.SKIPPED).length;

    return {
      name: `Wrapper Tests: ${this.config.scriptPath}`,
      tests,
      duration: Date.now() - startTime,
      passed,
      failed,
      skipped,
    };
  }
}
