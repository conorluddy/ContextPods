/**
 * Test report generator
 */

import { TestStatus } from '../types.js';
import type { TestSuiteResult, TestRunResult } from '../types.js';

/**
 * Generate test reports in various formats
 */
export class ReportGenerator {
  /**
   * Generate HTML report
   */
  static generateHTML(result: TestRunResult): string {
    const { suites, totalPassed, totalFailed, totalSkipped } = result;

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Context-Pods Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .passed { color: green; }
        .failed { color: red; }
        .skipped { color: orange; }
        .suite { margin: 20px 0; border: 1px solid #ddd; padding: 15px; }
        .test { margin: 10px 0; padding: 5px; }
    </style>
</head>
<body>
    <h1>Context-Pods Test Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Tests: ${totalPassed + totalFailed + totalSkipped}</p>
        <p class="passed">Passed: ${totalPassed}</p>
        <p class="failed">Failed: ${totalFailed}</p>
        <p class="skipped">Skipped: ${totalSkipped}</p>
        <p>Duration: ${result.duration}ms</p>
    </div>
    
    ${suites
      .map(
        (suite: TestSuiteResult) => `
        <div class="suite">
            <h3>${suite.name}</h3>
            <p>Duration: ${suite.duration}ms</p>
            ${suite.tests
              .map(
                (test) => `
                <div class="test ${test.status}">
                    <strong>${test.name}</strong> - ${test.status} (${test.duration}ms)
                    ${test.error ? `<br><small>Error: ${String(test.error)}</small>` : ''}
                </div>
            `,
              )
              .join('')}
        </div>
    `,
      )
      .join('')}
</body>
</html>`;
  }

  /**
   * Generate JUnit XML report
   */
  static generateJUnit(result: TestRunResult): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="${result.totalTests}" failures="${result.totalFailed}" time="${result.duration / 1000}">
${result.suites
  .map(
    (suite: TestSuiteResult) => `
  <testsuite name="${suite.name}" tests="${suite.tests.length}" failures="${suite.failed}" time="${suite.duration / 1000}">
${suite.tests
  .map(
    (test) => `
    <testcase classname="${suite.name}" name="${test.name}" time="${test.duration / 1000}">
${test.status === TestStatus.FAILED ? `<failure message="${String(test.error) || 'Test failed'}">${String(test.error) || ''}</failure>` : ''}
    </testcase>`,
  )
  .join('')}
  </testsuite>`,
  )
  .join('')}
</testsuites>`;
  }
}
