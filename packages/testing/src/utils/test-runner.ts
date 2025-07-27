/**
 * Test runner utility
 */

import { logger } from '@context-pods/core';
import type { TestSuiteResult, WrapperTestConfig, TestRunResult } from '../types.js';
import { TestStatus } from '../types.js';
import { MCPComplianceTestSuite } from '../protocol/compliance.js';
import { ScriptWrapperTester } from '../wrappers/wrapper-tester.js';

/**
 * Main test runner for the testing framework
 */
export class TestRunner {
  private suites: TestSuite[] = [];
  private config: TestRunnerConfig;

  constructor(config: TestRunnerConfig = {}) {
    this.config = {
      parallel: false,
      bail: false,
      timeout: 30000,
      retries: 0,
      ...config,
    };
  }

  /**
   * Add test suite
   */
  addSuite(suite: TestSuite): void {
    this.suites.push(suite);
  }

  /**
   * Run all test suites
   */
  async runAll(): Promise<TestRunResult> {
    const startTime = Date.now();
    const results: TestSuiteResult[] = [];

    logger.info(`Running ${this.suites.length} test suites`);

    if (this.config.parallel) {
      // Run suites in parallel
      const promises = this.suites.map((suite) => this.runSuiteWithRetries(suite));
      const suiteResults = await Promise.allSettled(promises);

      for (const result of suiteResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            name: 'Failed Suite',
            tests: [
              {
                name: 'Suite Execution',
                status: TestStatus.FAILED,
                duration: 0,
                error: (result.reason as Error)?.message || 'Unknown error',
              },
            ],
            duration: 0,
            passed: 0,
            failed: 1,
            skipped: 0,
          });
        }
      }
    } else {
      // Run suites sequentially
      for (const suite of this.suites) {
        try {
          const result = await this.runSuiteWithRetries(suite);
          results.push(result);

          if (this.config.bail && result.failed > 0) {
            logger.warn('Stopping test execution due to failure (bail mode)');
            break;
          }
        } catch (error) {
          const failedResult: TestSuiteResult = {
            name: suite.name,
            tests: [
              {
                name: 'Suite Execution',
                status: TestStatus.FAILED,
                duration: 0,
                error: error instanceof Error ? error.message : String(error),
              },
            ],
            duration: 0,
            passed: 0,
            failed: 1,
            skipped: 0,
          };
          results.push(failedResult);

          if (this.config.bail) {
            break;
          }
        }
      }
    }

    // Calculate totals
    const totalTests = results.reduce((sum, suite) => sum + suite.tests.length, 0);
    const totalPassed = results.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = results.reduce((sum, suite) => sum + suite.failed, 0);
    const totalSkipped = results.reduce((sum, suite) => sum + suite.skipped, 0);

    logger.info(
      `Test run completed: ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped`,
    );

    return {
      suites: results,
      duration: Date.now() - startTime,
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      success: totalFailed === 0,
    };
  }

  /**
   * Run a single suite with retries
   */
  private async runSuiteWithRetries(suite: TestSuite): Promise<TestSuiteResult> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= (this.config.retries || 0); attempt++) {
      try {
        if (attempt > 0) {
          logger.info(`Retrying suite: ${suite.name} (attempt ${attempt + 1})`);
        }

        return await this.runSuite(suite);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < (this.config.retries || 0)) {
          logger.warn(`Suite failed, retrying: ${lastError.message}`);
        }
      }
    }

    throw lastError;
  }

  /**
   * Run a single test suite
   */
  private async runSuite(suite: TestSuite): Promise<TestSuiteResult> {
    logger.info(`Running test suite: ${suite.name}`);

    switch (suite.type) {
      case 'mcp-compliance': {
        const complianceSuite = new MCPComplianceTestSuite(
          suite.serverPath || '',
          this.config.debug,
        );
        return await complianceSuite.runFullSuite();
      }

      case 'script-wrapper': {
        if (!suite.wrapperConfig) {
          throw new Error('Script wrapper suite requires wrapperConfig');
        }
        const wrapperTester = new ScriptWrapperTester(suite.wrapperConfig);
        return await wrapperTester.runTests();
      }

      case 'custom':
        if (!suite.runner) {
          throw new Error('Custom suite requires a runner function');
        }
        return await suite.runner();

      default:
        throw new Error(`Unknown suite type: ${String(suite.type)}`);
    }
  }

  /**
   * Create MCP compliance test suite
   */
  static createMCPComplianceSuite(name: string, serverPath: string): TestSuite {
    return {
      name,
      type: 'mcp-compliance',
      serverPath,
    };
  }

  /**
   * Create script wrapper test suite
   */
  static createWrapperSuite(name: string, config: WrapperTestConfig): TestSuite {
    return {
      name,
      type: 'script-wrapper',
      wrapperConfig: config,
    };
  }

  /**
   * Create custom test suite
   */
  static createCustomSuite(name: string, runner: () => Promise<TestSuiteResult>): TestSuite {
    return {
      name,
      type: 'custom',
      runner,
    };
  }
}

/**
 * Test suite configuration
 */
export interface TestSuite {
  name: string;
  type: 'mcp-compliance' | 'script-wrapper' | 'custom';
  serverPath?: string;
  wrapperConfig?: WrapperTestConfig;
  runner?: () => Promise<TestSuiteResult>;
}

/**
 * Test runner configuration
 */
export interface TestRunnerConfig {
  parallel?: boolean;
  bail?: boolean;
  timeout?: number;
  retries?: number;
  debug?: boolean;
}
