# @context-pods/testing

Comprehensive testing framework for MCP (Model Context Protocol) servers in the Context-Pods development suite.

[![npm version](https://badge.fury.io/js/@context-pods%2Ftesting.svg)](https://www.npmjs.com/package/@context-pods/testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This package provides a complete testing solution for MCP servers, including:

- Protocol compliance validation
- Script wrapper testing
- Integration testing utilities
- Performance benchmarking
- Test report generation

## Installation

```bash
npm install --save-dev @context-pods/testing
```

## Features

### MCP Protocol Compliance Testing

Validate that your MCP server correctly implements the protocol:

```typescript
import { validateMCPServer } from '@context-pods/testing';

const results = await validateMCPServer('./path/to/server', {
  checkTools: true,
  checkResources: true,
  checkProtocol: true,
  timeout: 30000,
});

console.log(results.isValid); // true/false
console.log(results.errors); // Array of validation errors
```

### Script Wrapper Testing

Test wrapped scripts in multiple languages:

```typescript
import { testScriptWrapper } from '@context-pods/testing';

const results = await testScriptWrapper('./my-script.py', {
  language: 'python',
  testCases: [
    {
      input: { arg1: 'value1' },
      expectedOutput: { result: 'expected' },
    },
  ],
});
```

### Test Harness

Comprehensive testing harness for MCP communication:

```typescript
import { TestHarness } from '@context-pods/testing';

const harness = new TestHarness({
  serverPath: './my-mcp-server',
  transport: 'stdio',
});

// Start the server
await harness.start();

// Test tool execution
const result = await harness.executeTool('my-tool', {
  param1: 'value1',
});

// Test resource fetching
const resource = await harness.fetchResource('resource://my-resource');

// Stop the server
await harness.stop();
```

### Integration Testing

```typescript
import { MCPTestSuite } from '@context-pods/testing';

const suite = new MCPTestSuite('My MCP Server Tests');

suite.addTest('Tool execution test', async (harness) => {
  const result = await harness.executeTool('calculate', {
    operation: 'add',
    a: 5,
    b: 3,
  });

  expect(result).toEqual({ result: 8 });
});

suite.addTest('Resource fetching test', async (harness) => {
  const resource = await harness.fetchResource('data://config');
  expect(resource.mimeType).toBe('application/json');
});

// Run all tests
const results = await suite.run();
```

### Performance Benchmarking

```typescript
import { benchmark } from '@context-pods/testing';

const results = await benchmark({
  serverPath: './my-mcp-server',
  iterations: 100,
  tools: ['tool1', 'tool2'],
  concurrent: 10,
});

console.log(results.averageResponseTime);
console.log(results.throughput);
```

### Report Generation

Generate test reports in multiple formats:

```typescript
import { generateReport } from '@context-pods/testing';

// HTML report
await generateReport(testResults, {
  format: 'html',
  outputPath: './test-report.html',
  includeGraphs: true,
});

// JUnit XML for CI/CD
await generateReport(testResults, {
  format: 'junit',
  outputPath: './junit.xml',
});

// Markdown for documentation
await generateReport(testResults, {
  format: 'markdown',
  outputPath: './test-results.md',
});
```

## CLI Usage

The package includes a CLI for quick testing:

```bash
# Validate MCP compliance
npx @context-pods/testing validate ./my-server

# Test a wrapped script
npx @context-pods/testing test-wrapper ./script.py --language python

# Run a test suite
npx @context-pods/testing run ./test-suite.js

# Generate a report
npx @context-pods/testing report ./results.json --format html
```

## Configuration

Create a `.mcp-test.json` file for test configuration:

```json
{
  "defaultTimeout": 30000,
  "transport": "stdio",
  "validation": {
    "strict": true,
    "checkTools": true,
    "checkResources": true,
    "checkProtocol": true
  },
  "reporting": {
    "format": "html",
    "outputDir": "./test-reports"
  }
}
```

## Writing Test Cases

### Basic Test

```typescript
import { describe, it, expect } from '@context-pods/testing';

describe('My MCP Server', () => {
  it('should execute the greeting tool', async (harness) => {
    const result = await harness.executeTool('greet', {
      name: 'World',
    });

    expect(result).toBe('Hello, World!');
  });
});
```

### Advanced Test with Setup

```typescript
import { TestSuite } from '@context-pods/testing';

const suite = new TestSuite({
  serverPath: './my-server',

  beforeAll: async (harness) => {
    // Global setup
    await harness.initialize();
  },

  beforeEach: async (harness) => {
    // Test-specific setup
    await harness.reset();
  },

  afterEach: async (harness) => {
    // Test cleanup
    await harness.cleanup();
  },

  afterAll: async (harness) => {
    // Global cleanup
    await harness.shutdown();
  },
});
```

## Validation Schemas

The testing framework uses Zod schemas to validate MCP protocol compliance:

- Tool definitions
- Resource definitions
- Request/response formats
- Error handling
- Protocol negotiation

## Related Packages

- [`@context-pods/core`](https://www.npmjs.com/package/@context-pods/core) - Core utilities and types
- [`@context-pods/cli`](https://www.npmjs.com/package/@context-pods/cli) - Command-line interface
- [`@context-pods/server`](https://www.npmjs.com/package/@context-pods/server) - MCP server implementation
- [`@context-pods/create`](https://www.npmjs.com/package/@context-pods/create) - npx runner

## License

MIT
