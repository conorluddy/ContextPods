/**
 * Unit tests for ScriptWrapperTester
 * Tests the functionality of wrapped script testing and validation
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ScriptWrapperTester } from '../../src/wrappers/wrapper-tester.js';
import { ParameterValidator } from '../../src/wrappers/parameter-validator.js';
import { OutputValidator } from '../../src/wrappers/output-validator.js';
import { TestStatus } from '../../src/types.js';
import { promises as fs } from 'fs';
import { execa } from 'execa';

// Mock dependencies
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
  },
}));

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

vi.mock('../../src/wrappers/parameter-validator.js', () => ({
  ParameterValidator: vi.fn(),
}));

vi.mock('../../src/wrappers/output-validator.js', () => ({
  OutputValidator: vi.fn(),
}));

vi.mock('@context-pods/core', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ScriptWrapperTester', () => {
  let wrapperTester: ScriptWrapperTester;
  let mockFs: {
    access: Mock;
  };
  let mockExeca: Mock;
  let mockParamValidator: {
    validateParameters: Mock;
  };
  let mockOutputValidator: {
    validateOutput: Mock;
  };

  const mockConfig = {
    scriptPath: '/path/to/test-script.py',
    language: 'python' as const,
    timeout: 10000,
    workingDirectory: '/working/dir',
    environment: {
      NODE_ENV: 'test',
    },
    testCases: [
      {
        name: 'Basic functionality test',
        input: { param1: 'value1', param2: 42 },
        expectedOutput: { result: 'success' },
        timeout: 5000,
      },
      {
        name: 'Error handling test',
        input: { param1: 'invalid' },
        expectedError: 'Invalid parameter',
        timeout: 5000,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fs
    mockFs = {
      access: vi.mocked(fs.access),
    };

    // Mock execa
    mockExeca = vi.mocked(execa);

    // Create mock validators
    mockParamValidator = {
      validateParameters: vi.fn(),
    };

    mockOutputValidator = {
      validateOutput: vi.fn(),
    };

    // Mock constructors
    vi.mocked(ParameterValidator).mockImplementation(() => mockParamValidator as any);
    vi.mocked(OutputValidator).mockImplementation(() => mockOutputValidator as any);

    // Set up default mock returns
    mockFs.access.mockResolvedValue(undefined); // Script exists
    mockExeca.mockResolvedValue({
      stdout: JSON.stringify({ result: 'success' }),
      stderr: '',
      exitCode: 0,
    });
    mockParamValidator.validateParameters.mockReturnValue({ valid: true });
    mockOutputValidator.validateOutput.mockReturnValue(undefined); // No validation errors

    // Create tester instance
    wrapperTester = new ScriptWrapperTester(mockConfig);
  });

  describe('Constructor', () => {
    it('should create parameter and output validators', () => {
      expect(ParameterValidator).toHaveBeenCalled();
      expect(OutputValidator).toHaveBeenCalled();
    });

    it('should store configuration', () => {
      expect(wrapperTester['config']).toBe(mockConfig);
    });
  });

  describe('Script Validation', () => {
    it('should validate script exists before running tests', async () => {
      const result = await wrapperTester.runTests();

      expect(mockFs.access).toHaveBeenCalledWith('/path/to/test-script.py');
      expect(result.tests.length).toBeGreaterThan(0);
    });

    it('should fail when script does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT: no such file'));

      const result = await wrapperTester.runTests();

      expect(result.tests[0]).toEqual({
        name: 'Script Validation',
        status: TestStatus.FAILED,
        duration: 0,
        error: 'Script not found: /path/to/test-script.py',
      });
      expect(result.failed).toBe(1);
    });
  });

  describe('Test Case Execution', () => {
    it('should run all configured test cases', async () => {
      const result = await wrapperTester.runTests();

      // Should run the 2 configured test cases + 4 additional validation tests
      expect(result.tests.length).toBe(6);
      expect(result.tests.some(t => t.name === 'Basic functionality test')).toBe(true);
      expect(result.tests.some(t => t.name === 'Error handling test')).toBe(true);
    });

    it('should execute script with correct parameters', async () => {
      await wrapperTester.runTests();

      expect(mockExeca).toHaveBeenCalledWith(
        'python',
        ['/path/to/test-script.py'],
        expect.objectContaining({
          input: JSON.stringify({ param1: 'value1', param2: 42 }),
          cwd: '/working/dir',
          timeout: 5000,
          env: expect.objectContaining({
            NODE_ENV: 'test',
          }),
        })
      );
    });

    it('should handle successful test cases', async () => {
      const result = await wrapperTester.runTests();

      const basicTest = result.tests.find(t => t.name === 'Basic functionality test');
      expect(basicTest?.status).toBe(TestStatus.PASSED);
      expect(basicTest?.duration).toBeGreaterThan(0);
    });

    it('should validate expected output', async () => {
      await wrapperTester.runTests();

      expect(mockOutputValidator.validateOutput).toHaveBeenCalledWith(
        { result: 'success' },
        { result: 'success' }
      );
    });

    it('should handle expected errors correctly', async () => {
      mockExeca.mockRejectedValueOnce({
        message: 'Invalid parameter',
        exitCode: 1,
        stderr: 'Invalid parameter',
      });

      const result = await wrapperTester.runTests();

      const errorTest = result.tests.find(t => t.name === 'Error handling test');
      expect(errorTest?.status).toBe(TestStatus.PASSED);
    });

    it('should fail when unexpected error occurs', async () => {
      mockExeca.mockRejectedValueOnce({
        message: 'Unexpected error',
        exitCode: 1,
        stderr: 'Unexpected error',
      });

      const result = await wrapperTester.runTests();

      const basicTest = result.tests.find(t => t.name === 'Basic functionality test');
      expect(basicTest?.status).toBe(TestStatus.FAILED);
      expect(basicTest?.error).toContain('Unexpected error occurred');
    });

    it('should handle regex error patterns', async () => {
      const regexConfig = {
        ...mockConfig,
        testCases: [
          {
            name: 'Regex error test',
            input: { param: 'test' },
            expectedError: /Error: \d+/,
            timeout: 5000,
          },
        ],
      };

      const regexTester = new ScriptWrapperTester(regexConfig);
      mockExeca.mockRejectedValueOnce({
        message: 'Error: 404',
        stderr: 'Error: 404',
      });

      const result = await regexTester.runTests();

      const regexTest = result.tests.find(t => t.name === 'Regex error test');
      expect(regexTest?.status).toBe(TestStatus.PASSED);
    });

    it('should fail when regex error pattern doesnt match', async () => {
      const regexConfig = {
        ...mockConfig,
        testCases: [
          {
            name: 'Regex error test',
            input: { param: 'test' },
            expectedError: /Error: \d+/,
            timeout: 5000,
          },
        ],
      };

      const regexTester = new ScriptWrapperTester(regexConfig);
      mockExeca.mockRejectedValueOnce({
        message: 'Different error format',
        stderr: 'Different error format',
      });

      const result = await regexTester.runTests();

      const regexTest = result.tests.find(t => t.name === 'Regex error test');
      expect(regexTest?.status).toBe(TestStatus.FAILED);
    });
  });

  describe('Parameter Validation Tests', () => {
    it('should run parameter passing validation test', async () => {
      const result = await wrapperTester.runTests();

      const paramTest = result.tests.find(t => t.name === 'Parameter Passing');
      expect(paramTest).toBeDefined();
      expect(mockParamValidator.validateParameters).toHaveBeenCalled();
    });

    it('should fail parameter validation when validator reports errors', async () => {
      mockParamValidator.validateParameters.mockReturnValue({
        valid: false,
        errors: ['Invalid parameter type', 'Missing required parameter'],
      });

      const result = await wrapperTester.runTests();

      const paramTest = result.tests.find(t => t.name === 'Parameter Passing');
      expect(paramTest?.status).toBe(TestStatus.FAILED);
      expect(paramTest?.error).toContain('Invalid parameter type');
    });
  });

  describe('Error Handling Tests', () => {
    it('should run error handling validation test', async () => {
      const result = await wrapperTester.runTests();

      const errorTest = result.tests.find(t => t.name === 'Error Handling');
      expect(errorTest).toBeDefined();
    });

    it('should test script behavior with invalid inputs', async () => {
      // Mock error response for invalid input test
      mockExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({ result: 'success' }),
        stderr: '',
        exitCode: 0,
      }).mockRejectedValueOnce({
        message: 'Invalid input detected',
        exitCode: 1,
        stderr: 'Invalid input detected',
      });

      const result = await wrapperTester.runTests();

      const errorTest = result.tests.find(t => t.name === 'Error Handling');
      expect(errorTest?.status).toBe(TestStatus.PASSED);
    });
  });

  describe('Output Format Tests', () => {
    it('should run output format validation test', async () => {
      const result = await wrapperTester.runTests();

      const outputTest = result.tests.find(t => t.name === 'Output Format');
      expect(outputTest).toBeDefined();
    });

    it('should validate JSON output format', async () => {
      mockExeca.mockResolvedValue({
        stdout: '{"valid": "json", "format": true}',
        stderr: '',
        exitCode: 0,
      });

      const result = await wrapperTester.runTests();

      const outputTest = result.tests.find(t => t.name === 'Output Format');
      expect(outputTest?.status).toBe(TestStatus.PASSED);
    });

    it('should fail when output is not valid JSON', async () => {
      mockExeca.mockResolvedValue({
        stdout: 'invalid json output',
        stderr: '',
        exitCode: 0,
      });

      const result = await wrapperTester.runTests();

      const outputTest = result.tests.find(t => t.name === 'Output Format');
      expect(outputTest?.status).toBe(TestStatus.FAILED);
      expect(outputTest?.error).toContain('Invalid JSON output');
    });
  });

  describe('Type Conversion Tests', () => {
    it('should run type conversion validation test', async () => {
      const result = await wrapperTester.runTests();

      const typeTest = result.tests.find(t => t.name === 'Type Conversion');
      expect(typeTest).toBeDefined();
    });

    it('should test various data types', async () => {
      const typeTestData = {
        string: 'test',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'value' },
        null_value: null,
      };

      mockExeca.mockResolvedValue({
        stdout: JSON.stringify(typeTestData),
        stderr: '',
        exitCode: 0,
      });

      const result = await wrapperTester.runTests();

      const typeTest = result.tests.find(t => t.name === 'Type Conversion');
      expect(typeTest?.status).toBe(TestStatus.PASSED);
    });

    it('should validate type preservation through serialization', async () => {
      mockExeca.mockResolvedValue({
        stdout: JSON.stringify({
          inputNumber: 42,
          outputNumber: 42,
          inputString: 'test',
          outputString: 'test',
        }),
        stderr: '',
        exitCode: 0,
      });

      const result = await wrapperTester.runTests();

      const typeTest = result.tests.find(t => t.name === 'Type Conversion');
      expect(typeTest?.status).toBe(TestStatus.PASSED);
    });
  });

  describe('Language-Specific Execution', () => {
    it('should execute Python scripts correctly', async () => {
      const pythonConfig = { ...mockConfig, language: 'python' as const };
      const pythonTester = new ScriptWrapperTester(pythonConfig);

      await pythonTester.runTests();

      expect(mockExeca).toHaveBeenCalledWith(
        'python',
        ['/path/to/test-script.py'],
        expect.any(Object)
      );
    });

    it('should execute Node.js scripts correctly', async () => {
      const nodeConfig = { ...mockConfig, language: 'javascript' as const };
      const nodeTester = new ScriptWrapperTester(nodeConfig);

      await nodeTester.runTests();

      expect(mockExeca).toHaveBeenCalledWith(
        'node',
        ['/path/to/test-script.py'],
        expect.any(Object)
      );
    });

    it('should execute TypeScript scripts correctly', async () => {
      const tsConfig = { ...mockConfig, language: 'typescript' as const };
      const tsTester = new ScriptWrapperTester(tsConfig);

      await tsTester.runTests();

      expect(mockExeca).toHaveBeenCalledWith(
        'npx',
        ['tsx', '/path/to/test-script.py'],
        expect.any(Object)
      );
    });

    it('should execute shell scripts correctly', async () => {
      const shellConfig = { ...mockConfig, language: 'shell' as const };
      const shellTester = new ScriptWrapperTester(shellConfig);

      await shellTester.runTests();

      expect(mockExeca).toHaveBeenCalledWith(
        'bash',
        ['/path/to/test-script.py'],
        expect.any(Object)
      );
    });

    it('should execute Rust scripts correctly', async () => {
      const rustConfig = { ...mockConfig, language: 'rust' as const };
      const rustTester = new ScriptWrapperTester(rustConfig);

      await rustTester.runTests();

      expect(mockExeca).toHaveBeenCalledWith(
        'cargo',
        ['run', '--bin', expect.any(String)],
        expect.any(Object)
      );
    });
  });

  describe('Timeout Handling', () => {
    it('should respect global timeout setting', async () => {
      await wrapperTester.runTests();

      expect(mockExeca).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          timeout: 5000, // From test case
        })
      );
    });

    it('should use default timeout when not specified', async () => {
      const configWithoutTimeout = {
        ...mockConfig,
        testCases: [
          {
            name: 'No timeout test',
            input: { param: 'value' },
            expectedOutput: { result: 'success' },
          },
        ],
      };

      const noTimeoutTester = new ScriptWrapperTester(configWithoutTimeout);
      await noTimeoutTester.runTests();

      expect(mockExeca).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          timeout: 10000, // Global timeout
        })
      );
    });

    it('should handle timeout errors', async () => {
      mockExeca.mockRejectedValue({
        message: 'Command timed out after 5000ms',
        killed: true,
        timedOut: true,
      });

      const result = await wrapperTester.runTests();

      const basicTest = result.tests.find(t => t.name === 'Basic functionality test');
      expect(basicTest?.status).toBe(TestStatus.FAILED);
      expect(basicTest?.error).toContain('timed out');
    });
  });

  describe('Environment Variables', () => {
    it('should pass environment variables to script execution', async () => {
      await wrapperTester.runTests();

      expect(mockExeca).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            NODE_ENV: 'test',
          }),
        })
      );
    });

    it('should preserve system environment variables', async () => {
      process.env.SYSTEM_VAR = 'system-value';

      await wrapperTester.runTests();

      expect(mockExeca).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            NODE_ENV: 'test',
            SYSTEM_VAR: 'system-value',
          }),
        })
      );

      delete process.env.SYSTEM_VAR;
    });
  });

  describe('Working Directory', () => {
    it('should execute scripts in specified working directory', async () => {
      await wrapperTester.runTests();

      expect(mockExeca).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          cwd: '/working/dir',
        })
      );
    });

    it('should use script directory as working directory when not specified', async () => {
      const configWithoutWorkingDir = {
        ...mockConfig,
        workingDirectory: undefined,
      };

      const noDirTester = new ScriptWrapperTester(configWithoutWorkingDir);
      await noDirTester.runTests();

      expect(mockExeca).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          cwd: '/path/to', // dirname of script path
        })
      );
    });
  });

  describe('Test Suite Results', () => {
    it('should calculate test suite statistics correctly', async () => {
      // Set up mixed results
      mockExeca
        .mockResolvedValueOnce({ stdout: JSON.stringify({ result: 'success' }), stderr: '', exitCode: 0 })
        .mockRejectedValueOnce({ message: 'Expected error', stderr: 'Expected error' });

      mockParamValidator.validateParameters.mockReturnValue({ valid: true });
      mockOutputValidator.validateOutput.mockImplementation(() => {
        throw new Error('Output validation failed');
      });

      const result = await wrapperTester.runTests();

      expect(result.name).toBe('Script Wrapper Test Suite');
      expect(result.duration).toBeGreaterThan(0);
      expect(result.passed + result.failed + result.skipped).toBe(result.tests.length);
      expect(result.tests.length).toBe(6); // 2 test cases + 4 validation tests
    });

    it('should handle all tests passing', async () => {
      mockParamValidator.validateParameters.mockReturnValue({ valid: true });

      const result = await wrapperTester.runTests();

      expect(result.passed).toBeGreaterThan(0);
      expect(result.failed).toBe(0);
    });

    it('should handle all tests failing', async () => {
      mockExeca.mockRejectedValue(new Error('All tests fail'));
      mockParamValidator.validateParameters.mockReturnValue({
        valid: false,
        errors: ['Validation failed'],
      });

      const result = await wrapperTester.runTests();

      expect(result.failed).toBeGreaterThan(0);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle script execution errors gracefully', async () => {
      mockExeca.mockRejectedValue({
        message: 'Script execution failed',
        exitCode: 1,
        stderr: 'Script execution failed',
      });

      const result = await wrapperTester.runTests();

      expect(result.tests.some(t => t.status === TestStatus.FAILED)).toBe(true);
    });

    it('should handle invalid JSON output', async () => {
      mockExeca.mockResolvedValue({
        stdout: 'not json',
        stderr: '',
        exitCode: 0,
      });

      const result = await wrapperTester.runTests();

      const outputTest = result.tests.find(t => t.name === 'Output Format');
      expect(outputTest?.status).toBe(TestStatus.FAILED);
      expect(outputTest?.error).toContain('Invalid JSON');
    });

    it('should handle empty output', async () => {
      mockExeca.mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      const result = await wrapperTester.runTests();

      expect(result.tests.some(t => t.status === TestStatus.FAILED)).toBe(true);
    });

    it('should handle non-zero exit codes', async () => {
      mockExeca.mockResolvedValue({
        stdout: JSON.stringify({ result: 'partial' }),
        stderr: 'Warning message',
        exitCode: 1,
      });

      const result = await wrapperTester.runTests();

      expect(result.tests.some(t => t.status === TestStatus.FAILED)).toBe(true);
    });
  });
});