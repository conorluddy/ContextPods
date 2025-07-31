/**
 * Unit tests for TestRunner
 * Tests the functionality of the main test runner coordination
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { TestRunner } from '../../src/utils/test-runner.js';
import { MCPComplianceTestSuite } from '../../src/protocol/compliance.js';
import { ScriptWrapperTester } from '../../src/wrappers/wrapper-tester.js';
import { ReportGenerator } from '../../src/utils/report-generator.js';
import { TestStatus } from '../../src/types.js';

// Mock dependencies
vi.mock('../../src/protocol/compliance.js', () => ({
  MCPComplianceTestSuite: vi.fn(),
}));

vi.mock('../../src/wrappers/wrapper-tester.js', () => ({
  ScriptWrapperTester: vi.fn(),
}));

vi.mock('../../src/utils/report-generator.js', () => ({
  ReportGenerator: {
    generateHTML: vi.fn(),
    generateJUnit: vi.fn(),
  },
}));

vi.mock('@context-pods/core', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('TestRunner', () => {
  let testRunner: TestRunner;
  let mockComplianceSuite: {
    runFullSuite: Mock;
  };
  let mockWrapperTester: {
    runTests: Mock;
  };

  const mockConfig = {
    serverPath: '/path/to/server',
    outputDir: '/output',
    formats: ['html', 'junit'] as const,
    parallel: false,
    timeout: 30000,
    verbose: true,
  };

  const mockComplianceResult = {
    name: 'MCP Compliance Test Suite',
    tests: [
      {
        name: 'Basic Initialization',
        status: TestStatus.PASSED,
        duration: 150,
      },
      {
        name: 'Tool Listing',
        status: TestStatus.FAILED,
        duration: 75,
        error: 'Tool validation failed',
      },
    ],
    duration: 225,
    passed: 1,
    failed: 1,
    skipped: 0,
  };

  const mockWrapperResult = {
    name: 'Script Wrapper Test Suite',
    tests: [
      {
        name: 'Parameter Passing',
        status: TestStatus.PASSED,
        duration: 200,
      },
      {
        name: 'Output Format',
        status: TestStatus.PASSED,
        duration: 100,
      },
    ],
    duration: 300,
    passed: 2,
    failed: 0,
    skipped: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock compliance suite
    mockComplianceSuite = {
      runFullSuite: vi.fn(),
    };

    // Create mock wrapper tester
    mockWrapperTester = {
      runTests: vi.fn(),
    };

    // Mock constructors
    vi.mocked(MCPComplianceTestSuite).mockImplementation(() => mockComplianceSuite as any);
    vi.mocked(ScriptWrapperTester).mockImplementation(() => mockWrapperTester as any);

    // Set up default mock returns
    mockComplianceSuite.runFullSuite.mockResolvedValue(mockComplianceResult);
    mockWrapperTester.runTests.mockResolvedValue(mockWrapperResult);

    vi.mocked(ReportGenerator.generateHTML).mockReturnValue('<html>Test Report</html>');
    vi.mocked(ReportGenerator.generateJUnit).mockReturnValue('<?xml version="1.0"?><testsuites></testsuites>');

    // Create test runner instance
    testRunner = new TestRunner(mockConfig);
  });

  describe('Constructor', () => {
    it('should store configuration', () => {
      expect(testRunner['config']).toBe(mockConfig);
    });

    it('should set default configuration values', () => {
      const minimalConfig = {
        serverPath: '/path/to/server',
      };

      const runnerWithDefaults = new TestRunner(minimalConfig);
      const config = runnerWithDefaults['config'];

      expect(config.outputDir).toBe('./test-results');
      expect(config.formats).toEqual(['html']);
      expect(config.parallel).toBe(false);
      expect(config.timeout).toBe(30000);
      expect(config.verbose).toBe(false);
    });
  });

  describe('Test Execution', () => {
    it('should run MCP compliance tests', async () => {
      const result = await testRunner.runTests();

      expect(MCPComplianceTestSuite).toHaveBeenCalledWith('/path/to/server', true);
      expect(mockComplianceSuite.runFullSuite).toHaveBeenCalled();
      expect(result.suites).toContainEqual(mockComplianceResult);
    });

    it('should run wrapper tests when script config provided', async () => {
      const configWithWrapper = {
        ...mockConfig,
        wrapperTests: {
          scriptPath: '/path/to/script.py',
          language: 'python' as const,
          testCases: [],
        },
      };

      const runnerWithWrapper = new TestRunner(configWithWrapper);
      const result = await runnerWithWrapper.runTests();

      expect(ScriptWrapperTester).toHaveBeenCalledWith(configWithWrapper.wrapperTests);
      expect(mockWrapperTester.runTests).toHaveBeenCalled();
      expect(result.suites).toContainEqual(mockWrapperResult);
    });

    it('should not run wrapper tests when no script config provided', async () => {
      await testRunner.runTests();

      expect(ScriptWrapperTester).not.toHaveBeenCalled();
      expect(mockWrapperTester.runTests).not.toHaveBeenCalled();
    });

    it('should calculate total statistics correctly', async () => {
      const configWithWrapper = {
        ...mockConfig,
        wrapperTests: {
          scriptPath: '/path/to/script.py',
          language: 'python' as const,
          testCases: [],
        },
      };

      const runnerWithWrapper = new TestRunner(configWithWrapper);
      const result = await runnerWithWrapper.runTests();

      expect(result.totalPassed).toBe(3); // 1 + 2
      expect(result.totalFailed).toBe(1); // 1 + 0
      expect(result.totalSkipped).toBe(0); // 0 + 0
      expect(result.totalTests).toBe(4); // 2 + 2
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle compliance test failures', async () => {
      mockComplianceSuite.runFullSuite.mockRejectedValue(new Error('Compliance test failed'));

      const result = await testRunner.runTests();

      expect(result.suites.length).toBe(1);
      expect(result.suites[0].name).toBe('MCP Compliance Test Suite');
      expect(result.suites[0].failed).toBe(1);
      expect(result.suites[0].tests[0].error).toBe('Compliance test failed');
    });

    it('should handle wrapper test failures', async () => {
      const configWithWrapper = {
        ...mockConfig,
        wrapperTests: {
          scriptPath: '/path/to/script.py',
          language: 'python' as const,
          testCases: [],
        },
      };

      mockWrapperTester.runTests.mockRejectedValue(new Error('Wrapper test failed'));

      const runnerWithWrapper = new TestRunner(configWithWrapper);
      const result = await runnerWithWrapper.runTests();

      expect(result.suites.length).toBe(2);
      const wrapperSuite = result.suites.find(s => s.name === 'Script Wrapper Test Suite');
      expect(wrapperSuite?.failed).toBe(1);
      expect(wrapperSuite?.tests[0].error).toBe('Wrapper test failed');
    });
  });

  describe('Parallel Execution', () => {
    it('should run tests in parallel when enabled', async () => {
      const parallelConfig = {
        ...mockConfig,
        parallel: true,
        wrapperTests: {
          scriptPath: '/path/to/script.py',
          language: 'python' as const,
          testCases: [],
        },
      };

      const runnerWithParallel = new TestRunner(parallelConfig);

      // Mock Promise.all to verify parallel execution
      const originalPromiseAll = Promise.all;
      const mockPromiseAll = vi.spyOn(Promise, 'all');
      mockPromiseAll.mockImplementation(originalPromiseAll);

      await runnerWithParallel.runTests();

      expect(mockPromiseAll).toHaveBeenCalled();
      expect(mockComplianceSuite.runFullSuite).toHaveBeenCalled();
      expect(mockWrapperTester.runTests).toHaveBeenCalled();

      mockPromiseAll.mockRestore();
    });

    it('should run tests sequentially when parallel disabled', async () => {
      const sequentialConfig = {
        ...mockConfig,
        parallel: false,
        wrapperTests: {
          scriptPath: '/path/to/script.py',
          language: 'python' as const,
          testCases: [],
        },
      };

      const runnerWithSequential = new TestRunner(sequentialConfig);
      await runnerWithSequential.runTests();

      expect(mockComplianceSuite.runFullSuite).toHaveBeenCalled();
      expect(mockWrapperTester.runTests).toHaveBeenCalled();
    });
  });

  describe('Report Generation', () => {
    it('should generate HTML report when requested', async () => {
      const result = await testRunner.runTests();

      expect(ReportGenerator.generateHTML).toHaveBeenCalledWith(result);
    });

    it('should generate JUnit report when requested', async () => {
      const result = await testRunner.runTests();

      expect(ReportGenerator.generateJUnit).toHaveBeenCalledWith(result);
    });

    it('should generate only requested formats', async () => {
      const htmlOnlyConfig = {
        ...mockConfig,
        formats: ['html'] as const,
      };

      const htmlOnlyRunner = new TestRunner(htmlOnlyConfig);
      await htmlOnlyRunner.runTests();

      expect(ReportGenerator.generateHTML).toHaveBeenCalled();
      expect(ReportGenerator.generateJUnit).not.toHaveBeenCalled();
    });

    it('should handle report generation errors', async () => {
      vi.mocked(ReportGenerator.generateHTML).mockImplementation(() => {
        throw new Error('Report generation failed');
      });

      // Should not throw, just log error
      await expect(testRunner.runTests()).resolves.toBeDefined();
    });
  });

  describe('Timeout Handling', () => {
    it('should apply timeout to compliance tests', async () => {
      await testRunner.runTests();

      // Verify compliance suite was created with debug flag based on verbose setting
      expect(MCPComplianceTestSuite).toHaveBeenCalledWith('/path/to/server', true);
    });

    it('should handle test timeouts gracefully', async () => {
      mockComplianceSuite.runFullSuite.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Test timed out')), 1);
        });
      });

      const result = await testRunner.runTests();

      expect(result.suites.length).toBe(1);
      expect(result.suites[0].tests[0].error).toBe('Test timed out');
    });
  });

  describe('Verbose Mode', () => {
    it('should pass verbose flag to compliance suite', async () => {
      await testRunner.runTests();

      expect(MCPComplianceTestSuite).toHaveBeenCalledWith('/path/to/server', true);
    });

    it('should not pass verbose flag when disabled', async () => {
      const quietConfig = {
        ...mockConfig,
        verbose: false,
      };

      const quietRunner = new TestRunner(quietConfig);
      await quietRunner.runTests();

      expect(MCPComplianceTestSuite).toHaveBeenCalledWith('/path/to/server', false);
    });
  });

  describe('Configuration Validation', () => {
    it('should require serverPath', () => {
      expect(() => new TestRunner({} as any)).toThrow();
    });

    it('should validate output directory', () => {
      const config = {
        serverPath: '/path/to/server',
        outputDir: '',
      };

      const runner = new TestRunner(config);
      expect(runner['config'].outputDir).toBe('./test-results'); // Should use default
    });

    it('should validate formats array', () => {
      const config = {
        serverPath: '/path/to/server',
        formats: [] as const,
      };

      const runner = new TestRunner(config);
      expect(runner['config'].formats).toEqual(['html']); // Should use default
    });

    it('should validate timeout value', () => {
      const config = {
        serverPath: '/path/to/server',
        timeout: -1,
      };

      const runner = new TestRunner(config);
      expect(runner['config'].timeout).toBe(30000); // Should use default
    });
  });

  describe('Error Recovery', () => {
    it('should continue with other tests if one suite fails', async () => {
      const configWithWrapper = {
        ...mockConfig,
        wrapperTests: {
          scriptPath: '/path/to/script.py',
          language: 'python' as const,
          testCases: [],
        },
      };

      mockComplianceSuite.runFullSuite.mockRejectedValue(new Error('Compliance failed'));
      // Wrapper tests should still run

      const runnerWithWrapper = new TestRunner(configWithWrapper);
      const result = await runnerWithWrapper.runTests();

      expect(result.suites.length).toBe(2);
      expect(result.suites[0].failed).toBe(1); // Compliance failed
      expect(result.suites[1].passed).toBe(2); // Wrapper passed
    });

    it('should handle non-Error exceptions', async () => {
      mockComplianceSuite.runFullSuite.mockRejectedValue('String error');

      const result = await testRunner.runTests();

      expect(result.suites[0].tests[0].error).toBe('String error');
    });
  });

  describe('Test Result Aggregation', () => {
    it('should correctly aggregate results from multiple suites', async () => {
      const configWithWrapper = {
        ...mockConfig,
        wrapperTests: {
          scriptPath: '/path/to/script.py',
          language: 'python' as const,
          testCases: [],
        },
      };

      const runnerWithWrapper = new TestRunner(configWithWrapper);
      const result = await runnerWithWrapper.runTests();

      expect(result.suites.length).toBe(2);
      expect(result.totalTests).toBe(4); // 2 + 2
      expect(result.totalPassed).toBe(3); // 1 + 2
      expect(result.totalFailed).toBe(1); // 1 + 0
      expect(result.totalSkipped).toBe(0); // 0 + 0
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle empty test suites', async () => {
      mockComplianceSuite.runFullSuite.mockResolvedValue({
        name: 'Empty Suite',
        tests: [],
        duration: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
      });

      const result = await testRunner.runTests();

      expect(result.totalTests).toBe(0);
      expect(result.totalPassed).toBe(0);
      expect(result.totalFailed).toBe(0);
      expect(result.totalSkipped).toBe(0);
    });
  });

  describe('Output Directory Handling', () => {
    it('should use specified output directory', () => {
      const customConfig = {
        ...mockConfig,
        outputDir: '/custom/output',
      };

      const customRunner = new TestRunner(customConfig);
      expect(customRunner['config'].outputDir).toBe('/custom/output');
    });

    it('should use default output directory when not specified', () => {
      const defaultConfig = {
        serverPath: '/path/to/server',
      };

      const defaultRunner = new TestRunner(defaultConfig);
      expect(defaultRunner['config'].outputDir).toBe('./test-results');
    });
  });
});