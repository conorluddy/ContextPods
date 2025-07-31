# Testing Framework Guide

The Context-Pods testing framework (`@context-pods/testing`) provides comprehensive validation and testing capabilities for MCP servers. It ensures your servers comply with the MCP protocol and function correctly across different environments.

## Overview

The testing framework includes:

- **MCP Protocol Compliance Testing** - Validates servers against official MCP standards
- **Script Wrapper Testing** - Tests wrapped scripts in multiple languages
- **Integration Testing** - End-to-end server communication testing
- **Performance Benchmarking** - Performance analysis and optimization
- **Report Generation** - HTML and JUnit XML reports for CI/CD

## Installation

### As Development Dependency (Recommended)

```bash
npm install --save-dev @context-pods/testing
```

### Global Installation

```bash
npm install -g @context-pods/testing
```

### Using NPX (No Installation)

```bash
npx @context-pods/testing --help
```

## Quick Start

### Validate an MCP Server

```bash
# Basic validation
npx @context-pods/testing validate-mcp ./my-server

# Comprehensive validation with all checks
npx @context-pods/testing validate-mcp ./my-server \
  --check-schema \
  --check-registry \
  --check-build
```

### Test a Script Wrapper

```bash
# Test a Python script wrapper
npx @context-pods/testing test-wrapper ./script.py --language python

# Test with custom parameters
npx @context-pods/testing test-wrapper ./script.sh \
  --language shell \
  --timeout 30000 \
  --args '["param1", "param2"]'
```

## MCP Protocol Compliance Testing

### Basic Protocol Validation

```typescript
import { validateMCPServer } from '@context-pods/testing';

const results = await validateMCPServer('./path/to/server', {
  checkTools: true,
  checkResources: true,
  checkProtocol: true,
  timeout: 30000,
});

console.log('Server is valid:', results.isValid);
console.log('Validation errors:', results.errors);
console.log('Warnings:', results.warnings);
```

### Advanced Validation Options

```typescript
const results = await validateMCPServer('./my-server', {
  // Protocol compliance checks
  checkTools: true,
  checkResources: true,
  checkProtocol: true,

  // Schema validation
  checkSchema: true,
  validateInputSchemas: true,
  validateOutputSchemas: true,

  // Communication tests
  testToolCalls: true,
  testResourceAccess: true,
  testErrorHandling: true,

  // Performance tests
  checkPerformance: true,
  maxResponseTime: 5000,

  // Environment
  timeout: 60000,
  environment: {
    NODE_ENV: 'test',
    DEBUG: 'mcp*',
  },
});
```

### Validation Results

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  performance: PerformanceMetrics;
  coverage: CoverageReport;
}

interface ValidationError {
  type: 'protocol' | 'schema' | 'communication' | 'performance';
  message: string;
  details: any;
  severity: 'error' | 'warning';
}
```

## Script Wrapper Testing

### Testing Python Wrappers

```typescript
import { testScriptWrapper } from '@context-pods/testing';

const results = await testScriptWrapper('./data-processor.py', {
  language: 'python',
  testCases: [
    {
      name: 'basic_processing',
      input: { data: [1, 2, 3, 4, 5] },
      expectedOutput: { processed: true, count: 5 },
    },
    {
      name: 'error_handling',
      input: { invalid: 'data' },
      expectError: true,
    },
  ],
});
```

### Testing Shell Script Wrappers

```typescript
const results = await testScriptWrapper('./system-info.sh', {
  language: 'shell',
  testCases: [
    {
      name: 'get_system_info',
      input: {},
      validateOutput: (output) => {
        return output.includes('os') && output.includes('memory');
      },
    },
  ],
  environment: {
    PATH: '/usr/local/bin:/usr/bin:/bin',
    HOME: '/tmp',
  },
});
```

### Testing TypeScript Wrappers

```typescript
const results = await testScriptWrapper('./api-client.ts', {
  language: 'typescript',
  buildCommand: 'npm run build',
  testCases: [
    {
      name: 'api_call',
      input: { endpoint: '/users', method: 'GET' },
      timeout: 10000,
    },
  ],
});
```

### Testing Rust Wrappers

```typescript
const results = await testScriptWrapper('./file-processor.rs', {
  language: 'rust',
  buildCommand: 'cargo build --release',
  executablePath: './target/release/file-processor',
  testCases: [
    {
      name: 'process_file',
      input: { path: './test-file.txt', operation: 'count_lines' },
    },
  ],
});
```

## Integration Testing

### Test Server Communication

```typescript
import { TestHarness } from '@context-pods/testing';

const harness = new TestHarness('./my-server');

// Start the server
await harness.start();

// Test initialization
const initResult = await harness.sendMessage({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  },
});

// Test tool listing
const toolsResult = await harness.sendMessage({
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
});

// Test tool calls
const callResult = await harness.sendMessage({
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: {
    name: 'my_tool',
    arguments: { param: 'value' },
  },
});

// Clean up
await harness.stop();
```

### Automated Integration Tests

```typescript
import { runIntegrationTests } from '@context-pods/testing';

const results = await runIntegrationTests('./my-server', {
  tests: [
    'initialization',
    'tool_listing',
    'resource_listing',
    'tool_calls',
    'resource_access',
    'error_handling',
    'cleanup',
  ],
  timeout: 120000,
});
```

## Performance Testing

### Basic Performance Testing

```typescript
import { benchmarkServer } from '@context-pods/testing';

const results = await benchmarkServer('./my-server', {
  duration: 60000, // 1 minute
  concurrency: 10,
  operations: [
    { method: 'tools/list', weight: 0.2 },
    { method: 'tools/call', params: { name: 'test_tool' }, weight: 0.8 },
  ],
});

console.log('Average response time:', results.averageResponseTime);
console.log('Requests per second:', results.requestsPerSecond);
console.log('Error rate:', results.errorRate);
```

### Load Testing

```typescript
const loadTestResults = await benchmarkServer('./my-server', {
  phases: [
    { duration: 30000, concurrency: 1 }, // Warm up
    { duration: 60000, concurrency: 5 }, // Ramp up
    { duration: 120000, concurrency: 20 }, // Peak load
    { duration: 30000, concurrency: 1 }, // Cool down
  ],
});
```

### Memory and Resource Monitoring

```typescript
const resourceResults = await benchmarkServer('./my-server', {
  monitoring: {
    memory: true,
    cpu: true,
    fileDescriptors: true,
    networkConnections: true,
  },
  duration: 300000, // 5 minutes
});
```

## Test Report Generation

### HTML Reports

```bash
# Generate HTML report
npx @context-pods/testing generate-report ./test-results.json \
  --format html \
  --output ./reports/

# Open report in browser
open ./reports/index.html
```

### JUnit XML Reports

```bash
# Generate JUnit XML for CI/CD
npx @context-pods/testing generate-report ./test-results.json \
  --format junit \
  --output ./junit.xml
```

### Custom Report Templates

```typescript
import { generateReport } from '@context-pods/testing';

await generateReport(testResults, {
  format: 'custom',
  template: './custom-report-template.hbs',
  output: './custom-report.html',
  data: {
    projectName: 'My MCP Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  },
});
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: MCP Server Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build server
        run: npm run build

      - name: Validate MCP compliance
        run: npx @context-pods/testing validate-mcp ./ --junit-output

      - name: Test script wrappers
        run: npx @context-pods/testing test-wrapper ./scripts/ --all-languages

      - name: Generate reports
        run: npx @context-pods/testing generate-report ./test-results.json --format html

      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: ./reports/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - report

mcp_validation:
  stage: test
  script:
    - npm ci
    - npm run build
    - npx @context-pods/testing validate-mcp ./
  artifacts:
    reports:
      junit: junit.xml
    paths:
      - test-results.json

generate_reports:
  stage: report
  script:
    - npx @context-pods/testing generate-report ./test-results.json --format html
  artifacts:
    paths:
      - reports/
```

## Advanced Testing Scenarios

### Testing with External Dependencies

```typescript
import { validateMCPServer } from '@context-pods/testing';

const results = await validateMCPServer('./api-server', {
  environment: {
    API_KEY: 'test-key',
    DATABASE_URL: 'sqlite://test.db',
  },
  setup: async () => {
    // Setup test database
    await setupTestDatabase();
  },
  teardown: async () => {
    // Clean up resources
    await cleanupTestDatabase();
  },
});
```

### Multi-Environment Testing

```typescript
const environments = ['development', 'staging', 'production'];

for (const env of environments) {
  const results = await validateMCPServer('./my-server', {
    environment: { NODE_ENV: env },
    configFile: `./config/${env}.json`,
  });

  console.log(`${env} validation:`, results.isValid);
}
```

### Testing Error Scenarios

```typescript
const errorTests = await runIntegrationTests('./my-server', {
  tests: [
    {
      name: 'invalid_tool_call',
      message: {
        method: 'tools/call',
        params: { name: 'non_existent_tool' },
      },
      expectError: true,
      expectedErrorCode: -32601,
    },
    {
      name: 'malformed_request',
      message: '{"invalid": "json"',
      expectError: true,
    },
  ],
});
```

## Testing Best Practices

### 1. Test Early and Often

```bash
# Run validation during development
npm run dev & npx @context-pods/testing validate-mcp ./
```

### 2. Comprehensive Test Coverage

```typescript
// Test all aspects of your server
const fullValidation = await validateMCPServer('./my-server', {
  checkTools: true,
  checkResources: true,
  checkProtocol: true,
  checkSchema: true,
  testToolCalls: true,
  testResourceAccess: true,
  testErrorHandling: true,
  checkPerformance: true,
});
```

### 3. Use Version Control for Test Results

```bash
# Store test baselines in version control
npx @context-pods/testing validate-mcp ./ --baseline ./test-baseline.json
```

### 4. Monitor Performance Over Time

```typescript
// Track performance regressions
const baseline = await loadBaseline('./performance-baseline.json');
const current = await benchmarkServer('./my-server');
const regression = comparePerformance(baseline, current);
```

### 5. Test in Production-Like Environments

```bash
# Use Docker for consistent testing
docker run -v $(pwd):/app node:18 \
  npx @context-pods/testing validate-mcp /app/
```

## Troubleshooting Tests

### Common Issues

#### Server Won't Start During Testing

```bash
# Check server logs
DEBUG=mcp* npx @context-pods/testing validate-mcp ./my-server

# Verify server builds correctly
npm run build
node ./dist/index.js --test
```

#### Tool Calls Failing Validation

```typescript
// Enable verbose logging
const results = await validateMCPServer('./my-server', {
  verbose: true,
  logLevel: 'debug',
});
```

#### Performance Tests Timing Out

```typescript
// Increase timeouts for slow operations
const results = await benchmarkServer('./my-server', {
  timeout: 60000,
  warmupDuration: 10000,
});
```

### Debug Mode

```bash
# Run with debug information
DEBUG=context-pods:testing npx @context-pods/testing validate-mcp ./
```

## Configuration Files

### Test Configuration

```json
// context-pods-test.json
{
  "server": {
    "path": "./",
    "buildCommand": "npm run build",
    "startCommand": "npm run dev"
  },
  "validation": {
    "checkTools": true,
    "checkResources": true,
    "checkProtocol": true,
    "timeout": 30000
  },
  "performance": {
    "enabled": true,
    "maxResponseTime": 5000,
    "benchmarkDuration": 60000
  },
  "reports": {
    "format": "html",
    "output": "./reports/"
  }
}
```

### Using Configuration File

```bash
npx @context-pods/testing validate-mcp --config ./context-pods-test.json
```

## Examples and Templates

### Testing Template Servers

Each template includes pre-configured tests:

```bash
# Test a generated TypeScript server
cd my-typescript-server
npm test

# Run Context-Pods specific tests
npm run test:mcp
```

### Real-World Testing Examples

Check out the `/packages/testing/examples/` directory for:

- **API Integration Server Tests** - Testing servers that call external APIs
- **Database-Backed Server Tests** - Testing servers with database connections
- **File Processing Server Tests** - Testing servers that manipulate files
- **Multi-Language Wrapper Tests** - Testing wrapped scripts in different languages

## Next Steps

- **Getting Started**: New to testing? Start with our [Getting Started Guide](getting-started.md)
- **API Reference**: Detailed testing API in the [API Reference](api-reference.md)
- **Templates**: Test template servers with our [Templates Guide](templates.md)
- **Contributing**: Help improve the testing framework with our [CONTRIBUTING.md](../CONTRIBUTING.md) guide

Happy testing! 🧪
