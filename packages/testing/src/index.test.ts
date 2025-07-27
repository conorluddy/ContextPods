/**
 * Basic tests for the testing framework
 */

import { describe, it, expect } from 'vitest';
import { TestStatus } from './types.js';
import { ReportGenerator } from './utils/report-generator.js';
import { MockHelpers } from './utils/mock-helpers.js';

describe('Testing Framework', () => {
  describe('TestStatus enum', () => {
    it('should have correct status values', () => {
      expect(TestStatus.PASSED).toBe('passed');
      expect(TestStatus.FAILED).toBe('failed');
      expect(TestStatus.SKIPPED).toBe('skipped');
      expect(TestStatus.PENDING).toBe('pending');
    });
  });

  describe('ReportGenerator', () => {
    it('should generate HTML report', () => {
      const mockResult = {
        suites: [],
        duration: 1000,
        totalTests: 0,
        totalPassed: 0,
        totalFailed: 0,
        totalSkipped: 0,
        success: true,
      };

      const html = ReportGenerator.generateHTML(mockResult);
      expect(html).toContain('Context-Pods Test Report');
      expect(html).toContain('Total Tests: 0');
    });

    it('should generate JUnit XML report', () => {
      const mockResult = {
        suites: [],
        duration: 1000,
        totalTests: 0,
        totalPassed: 0,
        totalFailed: 0,
        totalSkipped: 0,
        success: true,
      };

      const xml = ReportGenerator.generateJUnit(mockResult);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<testsuites');
    });
  });

  describe('MockHelpers', () => {
    it('should create mock request', () => {
      const request = MockHelpers.createMockRequest('test/method', { param: 'value' });

      expect(request).toMatchObject({
        jsonrpc: '2.0',
        method: 'test/method',
        params: { param: 'value' },
      });
      expect(request.id).toBeTypeOf('number');
    });

    it('should create mock response', () => {
      const response = MockHelpers.createMockResponse(1, { success: true });

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        result: { success: true },
        id: 1,
      });
    });

    it('should create mock error response', () => {
      const response = MockHelpers.createMockResponse(1, undefined, {
        code: -1,
        message: 'Test error',
      });

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        error: { code: -1, message: 'Test error' },
        id: 1,
      });
    });
  });
});
