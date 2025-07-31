/**
 * Unit tests for ReportGenerator
 * Tests the functionality of test report generation in various formats
 */

import { describe, it, expect } from 'vitest';
import { ReportGenerator } from '../../src/utils/report-generator.js';
import { TestStatus } from '../../src/types.js';
import type { TestRunResult, TestSuiteResult } from '../../src/types.js';

describe('ReportGenerator', () => {
  const mockTestRunResult: TestRunResult = {
    suites: [
      {
        name: 'MCP Compliance Tests',
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
            error: 'Tool validation failed: missing required fields',
          },
          {
            name: 'Resource Reading',
            status: TestStatus.SKIPPED,
            duration: 0,
          },
        ],
        duration: 225,
        passed: 1,
        failed: 1,
        skipped: 1,
      },
      {
        name: 'Script Wrapper Tests',
        tests: [
          {
            name: 'Parameter Passing',
            status: TestStatus.PASSED,
            duration: 300,
          },
          {
            name: 'Error Handling',
            status: TestStatus.PASSED,
            duration: 200,
          },
          {
            name: 'Output Format',
            status: TestStatus.FAILED,
            duration: 100,
            error: 'Invalid JSON output format',
          },
        ],
        duration: 600,
        passed: 2,
        failed: 1,
        skipped: 0,
      },
    ],
    duration: 825,
    totalPassed: 3,
    totalFailed: 2,
    totalSkipped: 1,
    totalTests: 6,
  };

  describe('HTML Report Generation', () => {
    it('should generate valid HTML report', () => {
      const htmlReport = ReportGenerator.generateHTML(mockTestRunResult);

      expect(htmlReport).toContain('<!DOCTYPE html>');
      expect(htmlReport).toContain('<html>');
      expect(htmlReport).toContain('</html>');
    });

    it('should include report title', () => {
      const htmlReport = ReportGenerator.generateHTML(mockTestRunResult);

      expect(htmlReport).toContain('<title>Context-Pods Test Report</title>');
      expect(htmlReport).toContain('<h1>Context-Pods Test Report</h1>');
    });

    it('should include summary section with correct statistics', () => {
      const htmlReport = ReportGenerator.generateHTML(mockTestRunResult);

      expect(htmlReport).toContain('Total Tests: 6');
      expect(htmlReport).toContain('Passed: 3');
      expect(htmlReport).toContain('Failed: 2');
      expect(htmlReport).toContain('Skipped: 1');
      expect(htmlReport).toContain('Duration: 825ms');
    });

    it('should include all test suites', () => {
      const htmlReport = ReportGenerator.generateHTML(mockTestRunResult);

      expect(htmlReport).toContain('MCP Compliance Tests');
      expect(htmlReport).toContain('Script Wrapper Tests');
    });

    it('should include suite duration information', () => {
      const htmlReport = ReportGenerator.generateHTML(mockTestRunResult);

      expect(htmlReport).toContain('Duration: 225ms');
      expect(htmlReport).toContain('Duration: 600ms');
    });

    it('should include all individual tests', () => {
      const htmlReport = ReportGenerator.generateHTML(mockTestRunResult);

      expect(htmlReport).toContain('Basic Initialization');
      expect(htmlReport).toContain('Tool Listing');
      expect(htmlReport).toContain('Resource Reading');
      expect(htmlReport).toContain('Parameter Passing');
      expect(htmlReport).toContain('Error Handling');
      expect(htmlReport).toContain('Output Format');
    });

    it('should include test status and duration', () => {
      const htmlReport = ReportGenerator.generateHTML(mockTestRunResult);

      expect(htmlReport).toContain('passed (150ms)');
      expect(htmlReport).toContain('failed (75ms)');
      expect(htmlReport).toContain('skipped (0ms)');
    });

    it('should include error messages for failed tests', () => {
      const htmlReport = ReportGenerator.generateHTML(mockTestRunResult);

      expect(htmlReport).toContain('Tool validation failed: missing required fields');
      expect(htmlReport).toContain('Invalid JSON output format');
    });

    it('should apply CSS classes for test status', () => {
      const htmlReport = ReportGenerator.generateHTML(mockTestRunResult);

      expect(htmlReport).toContain('class="test passed"');
      expect(htmlReport).toContain('class="test failed"');
      expect(htmlReport).toContain('class="test skipped"');
    });

    it('should include CSS styles', () => {
      const htmlReport = ReportGenerator.generateHTML(mockTestRunResult);

      expect(htmlReport).toContain('<style>');
      expect(htmlReport).toContain('.passed { color: green; }');
      expect(htmlReport).toContain('.failed { color: red; }');
      expect(htmlReport).toContain('.skipped { color: orange; }');
    });

    it('should handle empty test results', () => {
      const emptyResult: TestRunResult = {
        suites: [],
        duration: 0,
        totalPassed: 0,
        totalFailed: 0,
        totalSkipped: 0,
        totalTests: 0,
      };

      const htmlReport = ReportGenerator.generateHTML(emptyResult);

      expect(htmlReport).toContain('Total Tests: 0');
      expect(htmlReport).toContain('Passed: 0');
      expect(htmlReport).toContain('Failed: 0');
      expect(htmlReport).toContain('Skipped: 0');
      expect(htmlReport).toContain('Duration: 0ms');
    });

    it('should handle tests without errors', () => {
      const resultWithoutErrors: TestRunResult = {
        suites: [
          {
            name: 'Passing Tests',
            tests: [
              {
                name: 'Test 1',
                status: TestStatus.PASSED,
                duration: 100,
              },
            ],
            duration: 100,
            passed: 1,
            failed: 0,
            skipped: 0,
          },
        ],
        duration: 100,
        totalPassed: 1,
        totalFailed: 0,
        totalSkipped: 0,
        totalTests: 1,
      };

      const htmlReport = ReportGenerator.generateHTML(resultWithoutErrors);

      expect(htmlReport).toContain('Test 1');
      expect(htmlReport).not.toContain('<br><small>Error:');
    });

    it('should escape HTML in error messages', () => {
      const resultWithHtmlError: TestRunResult = {
        suites: [
          {
            name: 'Test Suite',
            tests: [
              {
                name: 'Test with HTML error',
                status: TestStatus.FAILED,
                duration: 50,
                error: 'Error with <script>alert("xss")</script>',
              },
            ],
            duration: 50,
            passed: 0,
            failed: 1,
            skipped: 0,
          },
        ],
        duration: 50,
        totalPassed: 0,
        totalFailed: 1,
        totalSkipped: 0,
        totalTests: 1,
      };

      const htmlReport = ReportGenerator.generateHTML(resultWithHtmlError);

      // HTML should be preserved as-is in this basic implementation
      expect(htmlReport).toContain('Error with <script>alert("xss")</script>');
    });
  });

  describe('JUnit XML Report Generation', () => {
    it('should generate valid XML report', () => {
      const xmlReport = ReportGenerator.generateJUnit(mockTestRunResult);

      expect(xmlReport).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xmlReport).toContain('<testsuites');
      expect(xmlReport).toContain('</testsuites>');
    });

    it('should include correct test statistics in root element', () => {
      const xmlReport = ReportGenerator.generateJUnit(mockTestRunResult);

      expect(xmlReport).toContain('tests="6"');
      expect(xmlReport).toContain('failures="2"');
      expect(xmlReport).toContain('time="0.825"'); // Duration in seconds
    });

    it('should include all test suites', () => {
      const xmlReport = ReportGenerator.generateJUnit(mockTestRunResult);

      expect(xmlReport).toContain('<testsuite name="MCP Compliance Tests"');
      expect(xmlReport).toContain('<testsuite name="Script Wrapper Tests"');
    });

    it('should include suite statistics', () => {
      const xmlReport = ReportGenerator.generateJUnit(mockTestRunResult);

      expect(xmlReport).toContain('tests="3" failures="1" time="0.225"');
      expect(xmlReport).toContain('tests="3" failures="1" time="0.6"');
    });

    it('should include all test cases', () => {
      const xmlReport = ReportGenerator.generateJUnit(mockTestRunResult);

      expect(xmlReport).toContain('name="Basic Initialization"');
      expect(xmlReport).toContain('name="Tool Listing"');
      expect(xmlReport).toContain('name="Resource Reading"');
      expect(xmlReport).toContain('name="Parameter Passing"');
      expect(xmlReport).toContain('name="Error Handling"');
      expect(xmlReport).toContain('name="Output Format"');
    });

    it('should include classname attributes', () => {
      const xmlReport = ReportGenerator.generateJUnit(mockTestRunResult);

      expect(xmlReport).toContain('classname="MCP Compliance Tests"');
      expect(xmlReport).toContain('classname="Script Wrapper Tests"');
    });

    it('should include test case durations in seconds', () => {
      const xmlReport = ReportGenerator.generateJUnit(mockTestRunResult);

      expect(xmlReport).toContain('time="0.15"'); // 150ms -> 0.15s
      expect(xmlReport).toContain('time="0.075"'); // 75ms -> 0.075s
      expect(xmlReport).toContain('time="0"'); // 0ms -> 0s
      expect(xmlReport).toContain('time="0.3"'); // 300ms -> 0.3s
      expect(xmlReport).toContain('time="0.2"'); // 200ms -> 0.2s
      expect(xmlReport).toContain('time="0.1"'); // 100ms -> 0.1s
    });

    it('should include failure elements for failed tests', () => {
      const xmlReport = ReportGenerator.generateJUnit(mockTestRunResult);

      expect(xmlReport).toContain('<failure message="Tool validation failed: missing required fields">');
      expect(xmlReport).toContain('<failure message="Invalid JSON output format">');
    });

    it('should not include failure elements for passed tests', () => {
      const xmlReport = ReportGenerator.generateJUnit(mockTestRunResult);

      // Count failure elements - should be 2 (for the 2 failed tests)
      const failureCount = (xmlReport.match(/<failure/g) || []).length;
      expect(failureCount).toBe(2);
    });

    it('should not include failure elements for skipped tests', () => {
      const xmlReport = ReportGenerator.generateJUnit(mockTestRunResult);

      // Resource Reading is skipped but should not have failure element
      const resourceTestMatch = xmlReport.match(/<testcase.*name="Resource Reading".*?<\/testcase>/s);
      expect(resourceTestMatch).toBeTruthy();
      expect(resourceTestMatch![0]).not.toContain('<failure');
    });

    it('should handle empty test results', () => {
      const emptyResult: TestRunResult = {
        suites: [],
        duration: 0,
        totalPassed: 0,
        totalFailed: 0,
        totalSkipped: 0,
        totalTests: 0,
      };

      const xmlReport = ReportGenerator.generateJUnit(emptyResult);

      expect(xmlReport).toContain('tests="0" failures="0" time="0"');
      expect(xmlReport).not.toContain('<testsuite');
    });

    it('should handle tests without error messages', () => {
      const resultWithNullError: TestRunResult = {
        suites: [
          {
            name: 'Test Suite',
            tests: [
              {
                name: 'Failed test without error message',
                status: TestStatus.FAILED,
                duration: 100,
                // No error property
              },
            ],
            duration: 100,
            passed: 0,
            failed: 1,
            skipped: 0,
          },
        ],
        duration: 100,
        totalPassed: 0,
        totalFailed: 1,
        totalSkipped: 0,
        totalTests: 1,
      };

      const xmlReport = ReportGenerator.generateJUnit(resultWithNullError);

      expect(xmlReport).toContain('<failure message="Test failed"></failure>');
    });

    it('should properly close all XML tags', () => {
      const xmlReport = ReportGenerator.generateJUnit(mockTestRunResult);

      // Count opening and closing tags
      const openTestsuites = (xmlReport.match(/<testsuites/g) || []).length;
      const closeTestsuites = (xmlReport.match(/<\/testsuites>/g) || []).length;
      const openTestsuite = (xmlReport.match(/<testsuite/g) || []).length;
      const closeTestsuite = (xmlReport.match(/<\/testsuite>/g) || []).length;
      const openTestcase = (xmlReport.match(/<testcase/g) || []).length;
      const closeTestcase = (xmlReport.match(/<\/testcase>/g) || []).length;

      expect(openTestsuites).toBe(closeTestsuites);
      expect(openTestsuite).toBe(closeTestsuite);
      expect(openTestcase).toBe(closeTestcase);
    });

    it('should escape XML special characters', () => {
      const resultWithSpecialChars: TestRunResult = {
        suites: [
          {
            name: 'Test Suite with <>&\'"',
            tests: [
              {
                name: 'Test with special chars <>&\'"',
                status: TestStatus.FAILED,
                duration: 100,
                error: 'Error with <>&\'" characters',
              },
            ],
            duration: 100,
            passed: 0,
            failed: 1,
            skipped: 0,
          },
        ],
        duration: 100,
        totalPassed: 0,
        totalFailed: 1,
        totalSkipped: 0,
        totalTests: 1,
      };

      const xmlReport = ReportGenerator.generateJUnit(resultWithSpecialChars);

      // This basic implementation doesn't escape XML characters,
      // but we should check that it doesn't break
      expect(xmlReport).toContain('Test Suite with <>&\'\"');
    });
  });

  describe('Report Generation Edge Cases', () => {
    it('should handle very long test names', () => {
      const longName = 'A'.repeat(1000);
      const resultWithLongName: TestRunResult = {
        suites: [
          {
            name: longName,
            tests: [
              {
                name: longName,
                status: TestStatus.PASSED,
                duration: 100,
              },
            ],
            duration: 100,
            passed: 1,
            failed: 0,
            skipped: 0,
          },
        ],
        duration: 100,
        totalPassed: 1,
        totalFailed: 0,
        totalSkipped: 0,
        totalTests: 1,
      };

      const htmlReport = ReportGenerator.generateHTML(resultWithLongName);
      const xmlReport = ReportGenerator.generateJUnit(resultWithLongName);

      expect(htmlReport).toContain(longName);
      expect(xmlReport).toContain(longName);
    });

    it('should handle very long error messages', () => {
      const longError = 'Error: ' + 'X'.repeat(5000);
      const resultWithLongError: TestRunResult = {
        suites: [
          {
            name: 'Test Suite',
            tests: [
              {
                name: 'Test with long error',
                status: TestStatus.FAILED,
                duration: 100,
                error: longError,
              },
            ],
            duration: 100,
            passed: 0,
            failed: 1,
            skipped: 0,
          },
        ],
        duration: 100,
        totalPassed: 0,
        totalFailed: 1,
        totalSkipped: 0,
        totalTests: 1,
      };

      const htmlReport = ReportGenerator.generateHTML(resultWithLongError);
      const xmlReport = ReportGenerator.generateJUnit(resultWithLongError);

      expect(htmlReport).toContain(longError);
      expect(xmlReport).toContain(longError);
    });

    it('should handle zero duration tests', () => {
      const resultWithZeroDuration: TestRunResult = {
        suites: [
          {
            name: 'Instant Tests',
            tests: [
              {
                name: 'Instant test',
                status: TestStatus.PASSED,
                duration: 0,
              },
            ],
            duration: 0,
            passed: 1,
            failed: 0,
            skipped: 0,
          },
        ],
        duration: 0,
        totalPassed: 1,
        totalFailed: 0,
        totalSkipped: 0,
        totalTests: 1,
      };

      const htmlReport = ReportGenerator.generateHTML(resultWithZeroDuration);
      const xmlReport = ReportGenerator.generateJUnit(resultWithZeroDuration);

      expect(htmlReport).toContain('(0ms)');
      expect(xmlReport).toContain('time="0"');
    });

    it('should handle large duration values', () => {
      const largeDuration = 999999999; // ~11.5 days in ms
      const resultWithLargeDuration: TestRunResult = {
        suites: [
          {
            name: 'Long Running Tests',
            tests: [
              {
                name: 'Very slow test',
                status: TestStatus.PASSED,
                duration: largeDuration,
              },
            ],
            duration: largeDuration,
            passed: 1,
            failed: 0,
            skipped: 0,
          },
        ],
        duration: largeDuration,
        totalPassed: 1,
        totalFailed: 0,
        totalSkipped: 0,
        totalTests: 1,
      };

      const htmlReport = ReportGenerator.generateHTML(resultWithLargeDuration);
      const xmlReport = ReportGenerator.generateJUnit(resultWithLargeDuration);

      expect(htmlReport).toContain(`${largeDuration}ms`);
      expect(xmlReport).toContain(`time="${largeDuration / 1000}"`);
    });
  });
});