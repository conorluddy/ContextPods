/**
 * Unit tests for OutputFormatter
 * Tests the functionality of console output formatting utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import ora from 'ora';
import { OutputFormatter, output } from '../../../src/utils/output-formatter.js';

// Mock dependencies
vi.mock('chalk', () => ({
  default: {
    green: vi.fn((text) => `green(${text})`),
    red: vi.fn((text) => `red(${text})`),
    yellow: vi.fn((text) => `yellow(${text})`),
    blue: vi.fn((text) => `blue(${text})`),
    gray: vi.fn((text) => `gray(${text})`),
    cyan: vi.fn((text) => `cyan(${text})`),
    magenta: vi.fn((text) => `magenta(${text})`),
    white: vi.fn((text) => `white(${text})`),
  },
}));

vi.mock('ora', () => ({
  default: vi.fn(),
}));

describe('OutputFormatter', () => {
  let formatter: OutputFormatter;
  let mockConsole: {
    log: Mock;
    error: Mock;
    warn: Mock;
  };
  let mockSpinner: {
    start: Mock;
    succeed: Mock;
    fail: Mock;
    stop: Mock;
    text: string;
  };
  let mockProcess: {
    stdout: {
      isTTY: boolean;
      write: Mock;
    };
  };

  beforeEach(() => {
    // Mock console methods
    mockConsole = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    };

    // Mock spinner
    mockSpinner = {
      start: vi.fn().mockReturnThis(),
      succeed: vi.fn(),
      fail: vi.fn(),
      stop: vi.fn(),
      text: '',
    };

    vi.mocked(ora).mockReturnValue(mockSpinner as any);

    // Mock process
    mockProcess = {
      stdout: {
        isTTY: true,
        write: vi.fn(),
      },
    };
    vi.stubGlobal('process', mockProcess);

    // Create fresh formatter instance
    formatter = new OutputFormatter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default verbose mode off', () => {
      const newFormatter = new OutputFormatter();
      
      newFormatter.debug('test message');
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it('should initialize with verbose mode when specified', () => {
      const newFormatter = new OutputFormatter(true);
      
      newFormatter.debug('test message');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(→)', 'gray(test message)');
    });

    it('should allow setting verbose mode', () => {
      formatter.setVerbose(true);
      
      formatter.debug('test message');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(→)', 'gray(test message)');
    });

    it('should allow disabling verbose mode', () => {
      formatter.setVerbose(true);
      formatter.setVerbose(false);
      
      formatter.debug('test message');
      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });

  describe('Basic Output Methods', () => {
    it('should output success messages with green checkmark', () => {
      formatter.success('Operation completed');
      
      expect(mockConsole.log).toHaveBeenCalledWith('green(✓)', 'Operation completed');
    });

    it('should output error messages with red X', () => {
      formatter.error('Operation failed');
      
      expect(mockConsole.error).toHaveBeenCalledWith('red(✗)', 'Operation failed');
    });

    it('should output error messages with stack trace in verbose mode', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';
      
      formatter.setVerbose(true);
      formatter.error('Operation failed', error);
      
      expect(mockConsole.error).toHaveBeenCalledWith('red(✗)', 'Operation failed');
      expect(mockConsole.error).toHaveBeenCalledWith('gray(Error: Test error\n    at test.js:1:1)');
    });

    it('should output error messages with message only when no stack trace', () => {
      const error = new Error('Test error');
      delete error.stack;
      
      formatter.setVerbose(true);
      formatter.error('Operation failed', error);
      
      expect(mockConsole.error).toHaveBeenCalledWith('red(✗)', 'Operation failed');
      expect(mockConsole.error).toHaveBeenCalledWith('gray(Test error)');
    });

    it('should not show error details in non-verbose mode', () => {
      const error = new Error('Test error');
      
      formatter.error('Operation failed', error);
      
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledWith('red(✗)', 'Operation failed');
    });

    it('should output warning messages with yellow warning icon', () => {
      formatter.warn('This is a warning');
      
      expect(mockConsole.warn).toHaveBeenCalledWith('yellow(⚠)', 'This is a warning');
    });

    it('should output info messages with blue info icon', () => {
      formatter.info('This is information');
      
      expect(mockConsole.log).toHaveBeenCalledWith('blue(ℹ)', 'This is information');
    });

    it('should output debug messages only in verbose mode', () => {
      formatter.debug('Debug message');
      expect(mockConsole.log).not.toHaveBeenCalled();
      
      formatter.setVerbose(true);
      formatter.debug('Debug message');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(→)', 'gray(Debug message)');
    });
  });

  describe('Spinner Management', () => {
    it('should start a spinner with text', () => {
      formatter.startSpinner('Loading...');
      
      expect(ora).toHaveBeenCalledWith('Loading...');
      expect(mockSpinner.start).toHaveBeenCalled();
    });

    it('should stop existing spinner before starting new one', () => {
      formatter.startSpinner('First spinner');
      formatter.startSpinner('Second spinner');
      
      expect(mockSpinner.stop).toHaveBeenCalled();
      expect(ora).toHaveBeenCalledTimes(2);
    });

    it('should update spinner text', () => {
      formatter.startSpinner('Loading...');
      formatter.updateSpinner('Still loading...');
      
      expect(mockSpinner.text).toBe('Still loading...');
    });

    it('should not update spinner text when no spinner exists', () => {
      formatter.updateSpinner('No spinner');
      
      // Should not throw error
      expect(mockSpinner.text).toBe('');
    });

    it('should succeed spinner with optional text', () => {
      formatter.startSpinner('Loading...');
      formatter.succeedSpinner('Done!');
      
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Done!');
    });

    it('should succeed spinner without text', () => {
      formatter.startSpinner('Loading...');
      formatter.succeedSpinner();
      
      expect(mockSpinner.succeed).toHaveBeenCalledWith(undefined);
    });

    it('should fail spinner with optional text', () => {
      formatter.startSpinner('Loading...');
      formatter.failSpinner('Failed!');
      
      expect(mockSpinner.fail).toHaveBeenCalledWith('Failed!');
    });

    it('should fail spinner without text', () => {
      formatter.startSpinner('Loading...');
      formatter.failSpinner();
      
      expect(mockSpinner.fail).toHaveBeenCalledWith(undefined);
    });

    it('should stop spinner', () => {
      formatter.startSpinner('Loading...');
      formatter.stopSpinner();
      
      expect(mockSpinner.stop).toHaveBeenCalled();
    });

    it('should handle spinner operations when no spinner exists', () => {
      formatter.succeedSpinner('No spinner');
      formatter.failSpinner('No spinner');
      formatter.stopSpinner();
      
      // Should not throw errors
      expect(mockSpinner.succeed).not.toHaveBeenCalled();
      expect(mockSpinner.fail).not.toHaveBeenCalled();
      expect(mockSpinner.stop).not.toHaveBeenCalled();
    });
  });

  describe('List Formatting', () => {
    it('should format list with default bullet', () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];
      formatter.list(items);
      
      expect(mockConsole.log).toHaveBeenCalledTimes(3);
      expect(mockConsole.log).toHaveBeenCalledWith('gray(•)', 'Item 1');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(•)', 'Item 2');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(•)', 'Item 3');
    });

    it('should format list with custom bullet', () => {
      const items = ['Item 1', 'Item 2'];
      formatter.list(items, '-');
      
      expect(mockConsole.log).toHaveBeenCalledWith('gray(-)', 'Item 1');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(-)', 'Item 2');
    });

    it('should handle empty list', () => {
      formatter.list([]);
      
      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });

  describe('Table Formatting', () => {
    it('should format table with aligned columns', () => {
      const rows = [
        { label: 'Name', value: 'John Doe' },
        { label: 'Email', value: 'john.doe@example.com' },
        { label: 'Age', value: '30', color: 'yellow' },
      ];
      formatter.table(rows);
      
      expect(mockConsole.log).toHaveBeenCalledTimes(3);
      expect(mockConsole.log).toHaveBeenCalledWith('gray(Name ) white(John Doe)');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(Email) white(john.doe@example.com)');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(Age  ) yellow(30)');
    });

    it('should handle empty table', () => {
      formatter.table([]);
      
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it('should use white as default color', () => {
      const rows = [{ label: 'Key', value: 'Value' }];
      formatter.table(rows);
      
      expect(mockConsole.log).toHaveBeenCalledWith('gray(Key) white(Value)');
    });
  });

  describe('Code Block Formatting', () => {
    it('should format code block without language', () => {
      const code = 'const x = 1;\nconsole.log(x);';
      formatter.code(code);
      
      expect(mockConsole.log).toHaveBeenCalledWith('gray(```)');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(│)', 'const x = 1;');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(│)', 'console.log(x);');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(```)');
    });

    it('should format code block with language', () => {
      const code = 'console.log("Hello");';
      formatter.code(code, 'javascript');
      
      expect(mockConsole.log).toHaveBeenCalledWith('gray(```javascript)');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(│)', 'console.log("Hello");');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(```)');
    });

    it('should handle empty code', () => {
      formatter.code('');
      
      expect(mockConsole.log).toHaveBeenCalledTimes(3); // Opening, empty line, and closing markers
      expect(mockConsole.log).toHaveBeenCalledWith('gray(```)');
    });

    it('should handle single line code', () => {
      formatter.code('single line');
      
      expect(mockConsole.log).toHaveBeenCalledTimes(3);
      expect(mockConsole.log).toHaveBeenCalledWith('gray(│)', 'single line');
    });
  });

  describe('Text Formatting Helpers', () => {
    it('should format file paths in cyan', () => {
      const result = formatter.path('/path/to/file.txt');
      expect(result).toBe('cyan(/path/to/file.txt)');
    });

    it('should format commands in yellow', () => {
      const result = formatter.command('npm install');
      expect(result).toBe('yellow(npm install)');
    });

    it('should format package names in magenta', () => {
      const result = formatter.package('@context-pods/core');
      expect(result).toBe('magenta(@context-pods/core)');
    });

    it('should format template names in blue', () => {
      const result = formatter.template('typescript-advanced');
      expect(result).toBe('blue(typescript-advanced)');
    });
  });

  describe('Utility Methods', () => {
    it('should create divider with default character and length', () => {
      formatter.divider();
      
      expect(mockConsole.log).toHaveBeenCalledWith('gray(' + '─'.repeat(50) + ')');
    });

    it('should create divider with custom character', () => {
      formatter.divider('=');
      
      expect(mockConsole.log).toHaveBeenCalledWith('gray(' + '='.repeat(50) + ')');
    });

    it('should create divider with custom length', () => {
      formatter.divider('-', 20);
      
      expect(mockConsole.log).toHaveBeenCalledWith('gray(' + '-'.repeat(20) + ')');
    });

    it('should clear screen when TTY is available', () => {
      mockProcess.stdout.isTTY = true;
      formatter.clear();
      
      expect(mockProcess.stdout.write).toHaveBeenCalledWith('\x1b[2J\x1b[0f');
    });

    it('should not clear screen when TTY is not available', () => {
      mockProcess.stdout.isTTY = false;
      formatter.clear();
      
      expect(mockProcess.stdout.write).not.toHaveBeenCalled();
    });
  });

  describe('Duration Formatting', () => {
    it('should format milliseconds', () => {
      expect(formatter.duration(500)).toBe('500ms');
      expect(formatter.duration(999)).toBe('999ms');
    });

    it('should format seconds', () => {
      expect(formatter.duration(1000)).toBe('1.0s');
      expect(formatter.duration(1500)).toBe('1.5s');
      expect(formatter.duration(59999)).toBe('60.0s');
    });

    it('should format minutes and seconds', () => {
      expect(formatter.duration(60000)).toBe('1m 0.0s');
      expect(formatter.duration(90000)).toBe('1m 30.0s');
      expect(formatter.duration(125000)).toBe('2m 5.0s');
    });

    it('should handle zero duration', () => {
      expect(formatter.duration(0)).toBe('0ms');
    });

    it('should handle large durations', () => {
      expect(formatter.duration(3661000)).toBe('61m 1.0s'); // 1 hour, 1 minute, 1 second
    });
  });

  describe('Global Instance', () => {
    it('should export a global output instance', () => {
      expect(output).toBeInstanceOf(OutputFormatter);
    });

    it('should have global instance work correctly', () => {
      output.success('Global test');
      
      expect(mockConsole.log).toHaveBeenCalledWith('green(✓)', 'Global test');
    });
  });

  describe('Error Handling', () => {
    it('should handle spinner operations gracefully when ora fails', () => {
      vi.mocked(ora).mockImplementation(() => {
        throw new Error('Ora failed');
      });
      
      const newFormatter = new OutputFormatter();
      
      // Should catch error and not crash
      expect(() => newFormatter.startSpinner('Test')).toThrow('Ora failed');
    });

    it('should handle chalk methods not being available', () => {
      // Mock chalk to not have a method
      const rows = [{ label: 'Test', value: 'Value', color: 'unknownColor' }];
      expect(() => formatter.table(rows)).toThrow();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple spinners in sequence', () => {
      formatter.startSpinner('First');
      formatter.updateSpinner('First updated');
      formatter.failSpinner('First failed');
      
      formatter.startSpinner('Second');
      formatter.succeedSpinner('Second succeeded');
      
      expect(mockSpinner.start).toHaveBeenCalledTimes(2);
      expect(mockSpinner.fail).toHaveBeenCalledWith('First failed');
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Second succeeded');
    });

    it('should format complex table with various colors', () => {
      const rows = [
        { label: 'Status', value: 'Ready', color: 'green' },
        { label: 'Warnings', value: '2', color: 'yellow' },
        { label: 'Errors', value: '0', color: 'red' },
        { label: 'Path', value: '/project', color: 'cyan' },
      ];
      
      formatter.table(rows);
      
      expect(mockConsole.log).toHaveBeenCalledWith('gray(Status  ) green(Ready)');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(Warnings) yellow(2)');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(Errors  ) red(0)');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(Path    ) cyan(/project)');
    });

    it('should handle mixed output in verbose mode', () => {
      formatter.setVerbose(true);
      
      formatter.info('Starting process');
      formatter.debug('Debug info');
      formatter.warn('Warning occurred');
      formatter.success('Process completed');
      
      expect(mockConsole.log).toHaveBeenCalledWith('blue(ℹ)', 'Starting process');
      expect(mockConsole.log).toHaveBeenCalledWith('gray(→)', 'gray(Debug info)');
      expect(mockConsole.warn).toHaveBeenCalledWith('yellow(⚠)', 'Warning occurred');
      expect(mockConsole.log).toHaveBeenCalledWith('green(✓)', 'Process completed');
    });
  });
});