# TypeScript Advanced Template Examples

This file provides specific examples for using the TypeScript Advanced template.

## Basic Generation

```bash
npx @context-pods/cli generate typescript-advanced \
  --name my-advanced-server \
  --description "An advanced MCP server with full features"
```

## With All Features Enabled

```bash
npx @context-pods/cli generate typescript-advanced \
  --name full-featured-server \
  --description "MCP server with all features enabled" \
  --includeTools true \
  --includeResources true \
  --includePrompts true \
  --toolCategories '["file", "data", "utility", "network", "system"]'
```

## Custom Tool Categories

```bash
# File and network operations only
npx @context-pods/cli generate typescript-advanced \
  --name file-network-server \
  --includeTools true \
  --toolCategories '["file", "network"]'

# Data processing focus
npx @context-pods/cli generate typescript-advanced \
  --name data-processor \
  --includeTools true \
  --toolCategories '["data", "utility"]'
```

## Configuration File Example

Create a `config.json`:

```json
{
  "serverName": "enterprise-server",
  "description": "Enterprise-grade MCP server",
  "author": "Enterprise Team",
  "license": "Apache-2.0",
  "version": "1.0.0",
  "includeTools": true,
  "includeResources": true,
  "includePrompts": false,
  "toolCategories": ["file", "data", "system"],
  "useStrictMode": true,
  "nodeVersion": "20"
}
```

Then generate:

```bash
npx @context-pods/cli generate typescript-advanced --config config.json
```

## Post-Generation Customization

After generation, you can extend the server:

### Adding a Custom Tool

1. Create a new tool file in `src/tools/`:

```typescript
// src/tools/custom-tool.ts
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const myCustomTool: Tool = {
  name: 'my_custom_tool',
  description: 'A custom tool for specific operations',
  inputSchema: {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description: 'Input for the tool',
      },
    },
    required: ['input'],
  },
};

export async function handleMyCustomTool(params: any) {
  const { input } = params;

  // Your custom logic here
  return {
    content: [
      {
        type: 'text',
        text: `Processed: ${input}`,
      },
    ],
  };
}
```

2. Register it in `src/index.ts`:

```typescript
import { myCustomTool, handleMyCustomTool } from './tools/custom-tool.js';

// In the tools registration section
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ... existing tools
    myCustomTool,
  ],
}));

// In the tool execution section
if (params.name === 'my_custom_tool') {
  return handleMyCustomTool(params.arguments);
}
```

### Adding a Resource

```typescript
// src/resources/custom-resource.ts
import { Resource } from '@modelcontextprotocol/sdk/types.js';

export const customResource: Resource = {
  uri: 'custom://my-resource',
  name: 'My Custom Resource',
  description: 'A custom resource with dynamic content',
  mimeType: 'application/json',
};

export async function getCustomResourceContent() {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            data: 'Custom resource data',
          },
          null,
          2,
        ),
      },
    ],
  };
}
```

## Environment Variables

The template supports these environment variables:

```bash
# Set log level
LOG_LEVEL=debug npm start

# Node environment
NODE_ENV=production npm start

# Custom server configuration
MCP_SERVER_NAME="My Custom Server" npm start
```

## Testing Your Server

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Test specific functionality
npm test -- --grep "tool execution"

# Test with coverage
npm run test:coverage
```

## Building for Production

```bash
# Clean previous build
npm run clean

# Build for production
npm run build

# Type check without building
npm run type-check

# Lint code
npm run lint

# Format code
npm run format
```

## Integration Examples

### With Claude Desktop

```json
{
  "mcpServers": {
    "my-advanced-server": {
      "command": "node",
      "args": ["path/to/my-advanced-server/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### With Continue

```json
{
  "models": [...],
  "mcpServers": {
    "my-advanced-server": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "path/to/my-advanced-server"
    }
  }
}
```

## Troubleshooting

### TypeScript Errors

If you encounter TypeScript errors after generation:

```bash
# Ensure all dependencies are installed
npm install

# Check TypeScript version
npx tsc --version

# Run type checking
npm run type-check
```

### Missing Dependencies

If tools fail due to missing dependencies:

```bash
# For file operations
npm install @types/node

# For network operations
npm install axios @types/axios

# For data processing
npm install lodash @types/lodash
```

### Build Issues

```bash
# Clean and rebuild
npm run clean && npm run build

# Check for conflicting global types
npm ls @types/node

# Ensure tsconfig is correct
cat tsconfig.json
```
