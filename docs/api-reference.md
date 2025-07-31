# API Reference

This document provides comprehensive API documentation for all Context-Pods packages. Use this reference to integrate Context-Pods into your applications or to understand the underlying architecture.

## Table of Contents

- [Core Package API](#core-package-api)
- [CLI Package API](#cli-package-api)
- [Server Package API](#server-package-api)
- [Testing Package API](#testing-package-api)
- [Templates Package API](#templates-package-api)
- [Create Package API](#create-package-api)
- [Meta-MCP Server Tools](#meta-mcp-server-tools)
- [Error Handling](#error-handling)
- [TypeScript Types](#typescript-types)

## Core Package API

The `@context-pods/core` package provides the foundational functionality for template processing and MCP server generation.

### Template Engine

#### `TemplateEngine`

Core class for processing templates and generating MCP servers.

```typescript
import { TemplateEngine } from '@context-pods/core';

class TemplateEngine {
  constructor(options: TemplateEngineOptions);

  // Generate MCP server from template
  async generateFromTemplate(
    templatePath: string,
    outputPath: string,
    variables: Record<string, any>,
  ): Promise<GenerationResult>;

  // Validate template structure
  async validateTemplate(templatePath: string): Promise<ValidationResult>;

  // Process template variables
  processVariables(
    variables: Record<string, any>,
    schema: Record<string, TemplateVariable>,
  ): ProcessedVariables;
}
```

**Options:**

```typescript
interface TemplateEngineOptions {
  templatesPath?: string;
  cacheEnabled?: boolean;
  optimization?: TemplateOptimization;
}
```

**Example:**

```typescript
const engine = new TemplateEngine({
  templatesPath: './templates',
  cacheEnabled: true,
});

const result = await engine.generateFromTemplate(
  './templates/typescript-advanced',
  './output/my-server',
  {
    serverName: 'weather-api',
    description: 'Weather information server',
    authorName: 'John Doe',
  },
);
```

### Template Selector

#### `TemplateSelector`

Utility for selecting appropriate templates based on requirements.

```typescript
import { TemplateSelector } from '@context-pods/core';

class TemplateSelector {
  constructor(templatesPath: string);

  // Select best template for requirements
  selectTemplate(requirements: TemplateRequirements): TemplateSelection;

  // List available templates
  async listTemplates(): Promise<TemplateInfo[]>;

  // Get template metadata
  async getTemplateMetadata(templateName: string): Promise<TemplateMetadata>;
}
```

**Example:**

```typescript
const selector = new TemplateSelector('./templates');

const selection = selector.selectTemplate({
  language: TemplateLanguage.TYPESCRIPT,
  complexity: 'advanced',
  features: ['tools', 'resources', 'validation'],
});

console.log('Selected template:', selection.template);
```

### Path Resolution

#### Path resolution utilities for template and output management.

```typescript
import { PathResolver } from '@context-pods/core';

// Resolve template paths
const templatePath = PathResolver.resolveTemplatePath('typescript-advanced');

// Resolve output paths
const outputPath = PathResolver.resolveOutputPath('./my-server', 'generated');

// Validate paths
const isValidPath = PathResolver.validatePath('./some/path');
```

### Types and Schemas

#### Core type definitions and Zod schemas for validation.

```typescript
import {
  TemplateLanguage,
  TemplateMetadata,
  TemplateVariable,
  MCPConfig,
} from '@context-pods/core';

// Enum for supported languages
enum TemplateLanguage {
  NODEJS = 'nodejs',
  TYPESCRIPT = 'typescript',
  PYTHON = 'python',
  RUST = 'rust',
  SHELL = 'shell',
}

// Template metadata interface
interface TemplateMetadata {
  name: string;
  description: string;
  version: string;
  language: TemplateLanguage;
  variables: Record<string, TemplateVariable>;
  files: TemplateFile[];
  dependencies?: PackageDependencies;
}
```

## CLI Package API

The `@context-pods/cli` package provides command-line interface functionality.

### CLI Commands

#### Generate Command

```typescript
import { generateCommand } from '@context-pods/cli';

// Generate MCP server programmatically
const result = await generateCommand({
  name: 'my-server',
  template: 'typescript-advanced',
  output: './output',
  variables: { authorName: 'John Doe' },
});
```

#### Wrap Command

```typescript
import { wrapCommand } from '@context-pods/cli';

// Wrap existing script as MCP server
const result = await wrapCommand({
  script: './my-script.py',
  name: 'python-wrapper',
  template: 'python-basic',
  output: './wrapped-server',
});
```

#### List Command

```typescript
import { listCommand } from '@context-pods/cli';

// List available templates
const templates = await listCommand({ type: 'templates' });

// List generated MCP servers
const servers = await listCommand({ type: 'servers' });
```

### CLI Configuration

#### Global Configuration Management

```typescript
import { CLIConfig, loadConfig, saveConfig } from '@context-pods/cli';

// Load CLI configuration
const config = await loadConfig();

// Modify configuration
config.turbo.enabled = true;
config.dev.hotReload = false;

// Save configuration
await saveConfig(config);
```

### Command Context

```typescript
interface CommandContext {
  config: CLIConfig;
  projectConfig?: ProjectConfig;
  workingDir: string;
  templatePaths: string[];
  outputPath: string;
  verbose: boolean;
}
```

## Server Package API

The `@context-pods/server` package provides the Meta-MCP Server functionality.

### Meta-MCP Server

#### Server Registration and Management

```typescript
import { MCPServer, ServerRegistry } from '@context-pods/server';

// Create server instance
const server = new MCPServer({
  name: 'context-pods-meta',
  version: '1.0.0',
});

// Register with local registry
const registry = new ServerRegistry();
await registry.register(server);
```

### Registry Operations

#### Database Operations for Server Management

```typescript
import { RegistryDatabase, ServerRecord } from '@context-pods/server';

class RegistryDatabase {
  // Initialize database
  async initialize(): Promise<void>;

  // Add server record
  async addServer(server: ServerRecord): Promise<string>;

  // Get server by ID
  async getServer(id: string): Promise<ServerRecord | null>;

  // List all servers
  async listServers(filter?: ServerFilter): Promise<ServerRecord[]>;

  // Update server status
  async updateServerStatus(id: string, status: ServerStatus): Promise<void>;

  // Remove server
  async removeServer(id: string): Promise<void>;
}
```

**Example:**

```typescript
const db = new RegistryDatabase('./registry.db');
await db.initialize();

const serverId = await db.addServer({
  name: 'weather-api',
  path: './my-server',
  template: 'typescript-advanced',
  status: 'active',
  createdAt: new Date(),
});
```

### MCP Tools

#### Available Meta-MCP Server Tools

```typescript
// Tool implementations
import { CreateMCPTool, WrapScriptTool, ListMCPsTool, ValidateMCPTool } from '@context-pods/server';

// Create MCP tool usage
const createTool = new CreateMCPTool();
const result = await createTool.execute({
  name: 'my-server',
  template: 'typescript-advanced',
  description: 'My custom MCP server',
});
```

## Testing Package API

The `@context-pods/testing` package provides comprehensive testing utilities.

### MCP Validation

#### Protocol Compliance Testing

```typescript
import { validateMCPServer, ValidationOptions } from '@context-pods/testing';

// Validate MCP server compliance
const results = await validateMCPServer('./my-server', {
  checkTools: true,
  checkResources: true,
  checkProtocol: true,
  checkSchema: true,
  timeout: 30000,
});

console.log('Valid:', results.isValid);
console.log('Errors:', results.errors);
```

#### Validation Options

```typescript
interface ValidationOptions {
  // Protocol checks
  checkTools?: boolean;
  checkResources?: boolean;
  checkProtocol?: boolean;

  // Schema validation
  checkSchema?: boolean;
  validateInputSchemas?: boolean;
  validateOutputSchemas?: boolean;

  // Communication tests
  testToolCalls?: boolean;
  testResourceAccess?: boolean;
  testErrorHandling?: boolean;

  // Performance
  checkPerformance?: boolean;
  maxResponseTime?: number;

  // Environment
  timeout?: number;
  environment?: Record<string, string>;
}
```

### Script Wrapper Testing

#### Multi-Language Script Testing

```typescript
import { testScriptWrapper, WrapperTestOptions } from '@context-pods/testing';

// Test Python script wrapper
const results = await testScriptWrapper('./script.py', {
  language: 'python',
  testCases: [
    {
      name: 'basic_test',
      input: { data: 'test' },
      expectedOutput: { processed: true },
    },
  ],
});
```

### Test Harness

#### Server Communication Testing

```typescript
import { TestHarness } from '@context-pods/testing';

// Create test harness
const harness = new TestHarness('./my-server');

// Start server
await harness.start();

// Send MCP messages
const response = await harness.sendMessage({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
});

// Clean up
await harness.stop();
```

### Performance Testing

#### Benchmarking and Load Testing

```typescript
import { benchmarkServer, BenchmarkOptions } from '@context-pods/testing';

// Run performance benchmark
const results = await benchmarkServer('./my-server', {
  duration: 60000,
  concurrency: 10,
  operations: [
    { method: 'tools/list', weight: 0.2 },
    { method: 'tools/call', params: { name: 'test' }, weight: 0.8 },
  ],
});

console.log('Avg response time:', results.averageResponseTime);
console.log('Requests/sec:', results.requestsPerSecond);
```

### Report Generation

#### Test Report Creation

```typescript
import { generateReport, ReportOptions } from '@context-pods/testing';

// Generate HTML report
await generateReport(testResults, {
  format: 'html',
  output: './reports/',
  template: 'default',
});

// Generate JUnit XML report
await generateReport(testResults, {
  format: 'junit',
  output: './junit.xml',
});
```

## Templates Package API

The `@context-pods/templates` package manages template repositories.

### Template Manager

#### Template Repository Management

```typescript
import { TemplateManager } from '@context-pods/templates';

class TemplateManager {
  // List available templates
  async listTemplates(): Promise<TemplateInfo[]>;

  // Get template by name
  async getTemplate(name: string): Promise<Template>;

  // Install template from repository
  async installTemplate(source: string, name?: string): Promise<void>;

  // Update template
  async updateTemplate(name: string): Promise<void>;

  // Remove template
  async removeTemplate(name: string): Promise<void>;
}
```

### Template Validation

#### Template Structure Validation

```typescript
import { validateTemplate, TemplateValidationOptions } from '@context-pods/templates';

// Validate template structure
const results = await validateTemplate('./my-template', {
  checkMetadata: true,
  checkFiles: true,
  checkVariables: true,
  checkDependencies: true,
});
```

## Create Package API

The `@context-pods/create` package provides the main entry point for server creation.

### Create Function

#### Main Server Creation API

```typescript
import { createMCPServer, CreateOptions } from '@context-pods/create';

// Create MCP server
const result = await createMCPServer({
  name: 'my-server',
  template: 'typescript-advanced',
  output: './my-server',
  variables: {
    description: 'Custom MCP server',
    authorName: 'John Doe',
  },
});
```

#### Create Options

```typescript
interface CreateOptions {
  name: string;
  template?: string;
  language?: TemplateLanguage;
  output?: string;
  variables?: Record<string, any>;
  force?: boolean;
  generateMcpConfig?: boolean;
  configPath?: string;
}
```

## Meta-MCP Server Tools

The Meta-MCP Server exposes these tools through the MCP protocol:

### create-mcp

Create a new MCP server from a template.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the MCP server to create"
    },
    "template": {
      "type": "string",
      "description": "Template to use (optional)"
    },
    "description": {
      "type": "string",
      "description": "Description of the server (optional)"
    },
    "language": {
      "type": "string",
      "enum": ["typescript", "python", "rust", "shell"],
      "description": "Programming language preference"
    },
    "outputPath": {
      "type": "string",
      "description": "Output directory (optional)"
    },
    "variables": {
      "type": "object",
      "description": "Template variables (optional)"
    }
  },
  "required": ["name"]
}
```

### wrap-script

Wrap an existing script as an MCP server.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "scriptPath": {
      "type": "string",
      "description": "Path to script to wrap"
    },
    "name": {
      "type": "string",
      "description": "Name for the wrapped server"
    },
    "template": {
      "type": "string",
      "description": "Template to use (optional)"
    },
    "outputPath": {
      "type": "string",
      "description": "Output directory (optional)"
    },
    "variables": {
      "type": "object",
      "description": "Additional variables (optional)"
    }
  },
  "required": ["scriptPath", "name"]
}
```

### list-mcps

List managed MCP servers with filtering options.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["created", "building", "ready", "error", "archived"],
      "description": "Filter by status"
    },
    "template": {
      "type": "string",
      "description": "Filter by template name"
    },
    "language": {
      "type": "string",
      "description": "Filter by programming language"
    },
    "search": {
      "type": "string",
      "description": "Search in names and descriptions"
    },
    "format": {
      "type": "string",
      "enum": ["table", "json", "summary"],
      "default": "table",
      "description": "Output format"
    }
  }
}
```

### validate-mcp

Validate MCP server compliance.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "mcpPath": {
      "type": "string",
      "description": "Path to MCP server directory"
    },
    "checkSchema": {
      "type": "boolean",
      "default": true,
      "description": "Check MCP protocol compliance"
    },
    "checkRegistry": {
      "type": "boolean",
      "default": true,
      "description": "Check registry status"
    },
    "checkBuild": {
      "type": "boolean",
      "default": false,
      "description": "Validate build process"
    }
  },
  "required": ["mcpPath"]
}
```

## Error Handling

### Error Types

Context-Pods defines several error types for different scenarios:

```typescript
// Base error class
class ContextPodsError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}

// Template-related errors
class TemplateError extends ContextPodsError {
  constructor(message: string) {
    super(message, 'TEMPLATE_ERROR');
  }
}

// Validation errors
class ValidationError extends ContextPodsError {
  constructor(
    message: string,
    public details?: any,
  ) {
    super(message, 'VALIDATION_ERROR');
  }
}

// Generation errors
class GenerationError extends ContextPodsError {
  constructor(message: string) {
    super(message, 'GENERATION_ERROR');
  }
}

// Registry errors
class RegistryError extends ContextPodsError {
  constructor(message: string) {
    super(message, 'REGISTRY_ERROR');
  }
}
```

### Error Handling Best Practices

```typescript
import { ContextPodsError, TemplateError } from '@context-pods/core';

try {
  await engine.generateFromTemplate(templatePath, outputPath, variables);
} catch (error) {
  if (error instanceof TemplateError) {
    console.error('Template error:', error.message);
  } else if (error instanceof ContextPodsError) {
    console.error('Context-Pods error:', error.code, error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## TypeScript Types

### Core Types

```typescript
// Template language enumeration
enum TemplateLanguage {
  NODEJS = 'nodejs',
  TYPESCRIPT = 'typescript',
  PYTHON = 'python',
  RUST = 'rust',
  SHELL = 'shell',
}

// Template variable definition
interface TemplateVariable {
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: unknown;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[];
  };
}

// Template metadata
interface TemplateMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;
  tags?: string[];
  language: TemplateLanguage;
  optimization: TemplateOptimization;
  variables: Record<string, TemplateVariable>;
  files: TemplateFile[];
  dependencies?: PackageDependencies;
  scripts?: Record<string, string>;
  mcpConfig?: MCPConfigDefaults;
}

// Generation result
interface GenerationResult {
  success: boolean;
  outputPath: string;
  generatedFiles: string[];
  warnings?: string[];
  errors?: string[];
  metadata: GeneratedServerMetadata;
}

// Validation result
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  performance?: PerformanceMetrics;
  coverage?: CoverageReport;
}
```

### CLI Types

```typescript
// Command result
interface CommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: Error;
}

// Generate options
interface GenerateOptions {
  template?: string;
  output?: string;
  name: string;
  description?: string;
  variables?: Record<string, any>;
  force?: boolean;
  generateMcpConfig?: boolean;
  configName?: string;
  configPath?: string;
}

// Server info
interface MCPInfo {
  name: string;
  path: string;
  status: 'active' | 'inactive' | 'error';
  template?: string;
  createdAt: Date;
  lastModified: Date;
}
```

### Testing Types

```typescript
// Validation options
interface ValidationOptions {
  checkTools?: boolean;
  checkResources?: boolean;
  checkProtocol?: boolean;
  checkSchema?: boolean;
  testToolCalls?: boolean;
  testResourceAccess?: boolean;
  testErrorHandling?: boolean;
  checkPerformance?: boolean;
  maxResponseTime?: number;
  timeout?: number;
  environment?: Record<string, string>;
}

// Test case definition
interface TestCase {
  name: string;
  input: any;
  expectedOutput?: any;
  expectError?: boolean;
  timeout?: number;
  validateOutput?: (output: any) => boolean;
}

// Benchmark results
interface BenchmarkResults {
  averageResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  totalRequests: number;
  totalErrors: number;
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}
```

## Version Compatibility

### Supported Versions

- **Node.js**: 18.0.0 or higher
- **TypeScript**: 4.9.0 or higher
- **Python**: 3.8 or higher
- **Rust**: 1.70.0 or higher

### Breaking Changes

#### v2.0.0

- `TemplateEngine` constructor now requires options object
- `validateMCPServer` returns different result structure
- CLI command signatures changed

#### v1.5.0

- Added performance testing capabilities
- New validation options for schema checking
- Registry database schema updates

## Examples

### Complete Server Generation Example

```typescript
import { TemplateEngine, TemplateSelector, TemplateLanguage } from '@context-pods/core';
import { validateMCPServer } from '@context-pods/testing';

async function createAndValidateServer() {
  // Select appropriate template
  const selector = new TemplateSelector('./templates');
  const selection = selector.selectTemplate({
    language: TemplateLanguage.TYPESCRIPT,
    complexity: 'advanced',
  });

  // Generate server
  const engine = new TemplateEngine({
    templatesPath: './templates',
    cacheEnabled: true,
  });

  const result = await engine.generateFromTemplate(selection.templatePath, './my-weather-server', {
    serverName: 'weather-api',
    description: 'Comprehensive weather information server',
    authorName: 'John Doe',
    authorEmail: 'john@example.com',
    includeExamples: true,
  });

  if (!result.success) {
    throw new Error(`Generation failed: ${result.errors?.join(', ')}`);
  }

  // Validate generated server
  const validation = await validateMCPServer('./my-weather-server', {
    checkTools: true,
    checkResources: true,
    checkProtocol: true,
    checkSchema: true,
    testToolCalls: true,
    checkPerformance: true,
  });

  if (!validation.isValid) {
    console.error('Validation failed:', validation.errors);
  } else {
    console.log('Server generated and validated successfully!');
  }

  return {
    generation: result,
    validation: validation,
  };
}
```

## Next Steps

- **Getting Started**: New to Context-Pods? Start with our [Getting Started Guide](getting-started.md)
- **Templates**: Learn about available [Templates](templates.md)
- **Testing**: Master the [Testing Framework](testing.md)
- **Contributing**: Help improve the API with our [CONTRIBUTING.md](../CONTRIBUTING.md) guide

For questions about the API, please check our [FAQ](faq.md) or open an issue on [GitHub](https://github.com/conorluddy/ContextPods/issues).

---

_This API reference is generated from TypeScript definitions and is kept up-to-date with each release._
