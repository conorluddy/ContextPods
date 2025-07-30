# @context-pods/server

MCP server implementation for the Context-Pods development suite.

[![npm version](https://badge.fury.io/js/@context-pods%2Fserver.svg)](https://www.npmjs.com/package/@context-pods/server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This package provides a complete MCP (Model Context Protocol) server implementation with built-in support for:

- Tool registration and execution
- Resource management
- WebSocket and stdio transports
- Hot reloading in development
- Comprehensive error handling
- TypeScript support

## Installation

```bash
npm install @context-pods/server
```

## Quick Start

### Basic Server

```typescript
import { MCPServer } from '@context-pods/server';

const server = new MCPServer({
  name: 'my-mcp-server',
  version: '1.0.0',
  description: 'My awesome MCP server',
});

// Register a tool
server.registerTool({
  name: 'get-weather',
  description: 'Get weather for a location',
  inputSchema: {
    type: 'object',
    properties: {
      location: { type: 'string' },
    },
    required: ['location'],
  },
  handler: async ({ location }) => {
    // Your tool logic here
    return {
      temperature: 72,
      condition: 'sunny',
      location,
    };
  },
});

// Start the server
server.start();
```

### With Resources

```typescript
server.registerResource({
  uri: 'weather://current/{location}',
  name: 'Current Weather',
  description: 'Get current weather for a location',
  mimeType: 'application/json',
  handler: async ({ location }) => {
    const weather = await fetchWeather(location);
    return {
      content: JSON.stringify(weather),
      mimeType: 'application/json',
    };
  },
});
```

### WebSocket Server

```typescript
import { WebSocketServer } from '@context-pods/server';

const wsServer = new WebSocketServer({
  port: 3000,
  server: mcpServer,
});

wsServer.start();
```

## Features

### Tool Management

- **Registration**: Easy tool registration with schema validation
- **Execution**: Automatic parameter validation and error handling
- **Discovery**: Built-in tool listing and introspection

### Resource Management

- **Dynamic Resources**: Support for parameterized resource URIs
- **Multiple Formats**: JSON, text, binary, and custom MIME types
- **Caching**: Built-in caching support for expensive operations

### Transport Support

- **stdio**: For command-line integration
- **WebSocket**: For network-based communication
- **Custom**: Extensible transport interface

### Development Features

- **Hot Reload**: Automatic server restart on code changes
- **Debug Mode**: Comprehensive logging and error traces
- **TypeScript**: Full type safety and IntelliSense support

## Configuration

```typescript
interface ServerConfig {
  name: string;
  version: string;
  description?: string;
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
  transport?: 'stdio' | 'websocket' | 'custom';
  debug?: boolean;
}
```

## Error Handling

The server includes comprehensive error handling with custom error types:

```typescript
import { ServerError, ValidationError } from '@context-pods/server';

server.registerTool({
  name: 'my-tool',
  handler: async (params) => {
    if (!params.required) {
      throw new ValidationError('Missing required parameter');
    }

    try {
      return await riskyOperation();
    } catch (error) {
      throw new ServerError('Operation failed', { cause: error });
    }
  },
});
```

## Testing

The server includes testing utilities:

```typescript
import { TestHarness } from '@context-pods/server/testing';

const harness = new TestHarness(server);

// Test tool execution
const result = await harness.executeTool('get-weather', {
  location: 'San Francisco',
});

// Test resource fetching
const resource = await harness.fetchResource('weather://current/sf');
```

## Related Packages

- [`@context-pods/core`](https://www.npmjs.com/package/@context-pods/core) - Core utilities and types
- [`@context-pods/cli`](https://www.npmjs.com/package/@context-pods/cli) - Command-line interface
- [`@context-pods/testing`](https://www.npmjs.com/package/@context-pods/testing) - Testing framework
- [`@context-pods/create`](https://www.npmjs.com/package/@context-pods/create) - npx runner

## License

MIT
