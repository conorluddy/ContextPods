# @context-pods/core

Core utilities and types for the Context-Pods MCP (Model Context Protocol) development suite.

[![npm version](https://badge.fury.io/js/@context-pods%2Fcore.svg)](https://www.npmjs.com/package/@context-pods/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @context-pods/core
```

## Features

- **Error Handling**: Custom error classes for different failure scenarios
- **Logging**: Simple, configurable logger with multiple log levels
- **Type Definitions**: TypeScript types for pods, templates, and MCP components
- **Schema Validation**: Zod schemas for validating configurations and manifests

## Usage

### Error Handling

```typescript
import { ConfigurationError, TemplateError } from '@context-pods/core';

// Throw a configuration error
throw new ConfigurationError('Invalid pod name', { name: 'my pod' });

// Throw a template error
throw new TemplateError('Template not found', { template: 'unknown' });
```

### Logging

```typescript
import { Logger, LogLevel } from '@context-pods/core';

// Create a logger
const logger = new Logger({
  level: LogLevel.DEBUG,
  prefix: '[MyPod]',
});

// Log messages
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');

// Create a child logger
const childLogger = logger.child('Component');
childLogger.info('From child logger');
```

### Schema Validation

```typescript
import { PodConfigSchema } from '@context-pods/core';

// Validate pod configuration
const config = {
  name: 'my-pod',
  description: 'My awesome pod',
  template: 'basic',
};

const result = PodConfigSchema.safeParse(config);
if (result.success) {
  console.log('Valid configuration:', result.data);
} else {
  console.error('Invalid configuration:', result.error);
}
```

## API Reference

See the TypeScript definitions for detailed API documentation.

## Key Exports

- **Error Classes**: `ConfigurationError`, `TemplateError`, `ValidationError`
- **Logger**: Configurable logging with multiple levels
- **Schemas**: Zod schemas for validation (`PodConfigSchema`, `TemplateManifestSchema`, etc.)
- **Types**: TypeScript types for all MCP components
- **Template Engine**: Template processing and variable substitution
- **Template Selector**: Intelligent template selection based on context

## Related Packages

- [`@context-pods/cli`](https://www.npmjs.com/package/@context-pods/cli) - Command-line interface
- [`@context-pods/create`](https://www.npmjs.com/package/@context-pods/create) - npx runner for quick starts
- [`@context-pods/server`](https://www.npmjs.com/package/@context-pods/server) - MCP server implementation
- [`@context-pods/testing`](https://www.npmjs.com/package/@context-pods/testing) - Testing framework

## License

MIT
