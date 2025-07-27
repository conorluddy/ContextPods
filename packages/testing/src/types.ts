/**
 * Core types for the testing framework
 */

/**
 * Test result status
 */
export enum TestStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  PENDING = 'pending',
}

/**
 * Individual test result
 */
export interface TestResult {
  name: string;
  status: TestStatus;
  duration: number;
  error?: Error | string;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Test suite result
 */
export interface TestSuiteResult {
  name: string;
  tests: TestResult[];
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
}

/**
 * MCP validation result
 */
export interface MCPValidationResult {
  valid: boolean;
  protocol: {
    handshake: TestResult;
    messageFormat: TestResult;
    jsonRpc: TestResult;
  };
  tools?: TestResult[];
  resources?: TestResult[];
  prompts?: TestResult[];
  errors: string[];
  warnings: string[];
  manifest?: MCPServerManifest;
}

/**
 * Performance test result
 */
export interface PerformanceResult {
  operation: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p95Time: number;
  p99Time: number;
  throughput: number;
  memoryUsed: number;
  cpuUsage: number;
}

/**
 * Script wrapper test configuration
 */
export interface WrapperTestConfig {
  scriptPath: string;
  language: 'typescript' | 'python' | 'rust' | 'shell';
  testCases: WrapperTestCase[];
  timeout?: number;
}

/**
 * Individual wrapper test case
 */
export interface WrapperTestCase {
  name: string;
  input: Record<string, unknown>;
  expectedOutput?: unknown;
  expectedError?: string | RegExp;
  timeout?: number;
}

/**
 * Language-specific test configuration
 */
export interface LanguageTestConfig {
  language: 'typescript' | 'python' | 'rust' | 'shell';
  setupCommands?: string[];
  cleanupCommands?: string[];
  environmentVariables?: Record<string, string>;
  requiredDependencies?: string[];
}

/**
 * Test generation options
 */
export interface TestGenerationOptions {
  templatePath: string;
  outputPath: string;
  includeUnitTests?: boolean;
  includeIntegrationTests?: boolean;
  includeE2ETests?: boolean;
  coverage?: number;
}

/**
 * Health monitoring metrics
 */
export interface HealthMetrics {
  uptime: number;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
}

/**
 * MCP Server test harness configuration
 */
export interface TestHarnessConfig {
  serverPath: string;
  transport: 'stdio' | 'http' | 'websocket';
  timeout?: number;
  retries?: number;
  debug?: boolean;
}

/**
 * Validation rule for MCP messages
 */
export interface ValidationRule {
  name: string;
  description: string;
  validate: (message: unknown) => boolean | Promise<boolean>;
  errorMessage?: string;
}