# MCP SDK Migration Guide: 0.5.0 → 1.17.4

This guide helps you migrate your MCP servers from SDK version 0.5.0 to 1.17.4, leveraging all the new features and improvements.

## Table of Contents
- [Breaking Changes](#breaking-changes)
- [Import Path Updates](#import-path-updates)
- [Server Configuration](#server-configuration)
- [New Features](#new-features)
- [Code Examples](#code-examples)
- [Testing Updates](#testing-updates)

## Breaking Changes

### 1. Import Paths
The SDK now uses subpath exports with explicit `.js` extensions for ES modules.

**Before (0.5.0):**
```typescript
import { Server } from '@modelcontextprotocol/sdk';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/transport/stdio';
```

**After (1.17.4):**
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
```

### 2. TypeScript Configuration
Update your `tsconfig.json` for proper ES module support:

```json
{
  "compilerOptions": {
    "module": "Node16",
    "moduleResolution": "Node16",
    "target": "ES2022",
    "lib": ["ES2022"],
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

### 3. Package.json Type Field
Add explicit module type:

```json
{
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  }
}
```

## Import Path Updates

### Complete Import Migration Table

| Old Import (0.5.0) | New Import (1.17.4) |
|-------------------|---------------------|
| `@modelcontextprotocol/sdk` | `@modelcontextprotocol/sdk/server/index.js` |
| `@modelcontextprotocol/sdk/transport/stdio` | `@modelcontextprotocol/sdk/server/stdio.js` |
| `@modelcontextprotocol/sdk/types` | `@modelcontextprotocol/sdk/types.js` |
| `@modelcontextprotocol/sdk/protocol` | `@modelcontextprotocol/sdk/protocol.js` |

### File Extension Requirements
All relative imports must include `.js` extension:

```typescript
// ❌ Old way (will fail)
import { myFunction } from './utils';

// ✅ New way
import { myFunction } from './utils.js';
```

## Server Configuration

### Enhanced Capabilities
The new SDK supports expanded capabilities:

```typescript
const server = new Server(
  {
    name: 'my-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {
        subscribe: true,
        listChanged: true,
      },
      prompts: {
        listChanged: true,
      },
      // New in 1.17.4
      sampling: {},
      roots: {
        listChanged: true,
      },
      completion: {
        argumentHints: true,
      },
    },
  },
);
```

### Request Handler Updates
No changes to the request handler API:

```typescript
// Still works the same
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: myTools };
});
```

## New Features

### 1. Sampling/LLM Integration
```typescript
import { CreateMessageRequestSchema } from '@modelcontextprotocol/sdk/types.js';

server.setRequestHandler(CreateMessageRequestSchema, async (request) => {
  const { messages, modelPreferences } = request.params;
  // Handle LLM sampling
  return {
    model: modelPreferences?.hints?.[0]?.name || 'default',
    role: 'assistant',
    content: { type: 'text', text: 'Response' },
  };
});
```

### 2. Progress Notifications
```typescript
await server.notification({
  method: 'notifications/progress',
  params: {
    progressToken: 'operation-123',
    progress: 50,
    total: 100,
    message: 'Processing...',
  },
});
```

### 3. Resource Subscriptions
```typescript
import { SubscribeRequestSchema } from '@modelcontextprotocol/sdk/types.js';

server.setRequestHandler(SubscribeRequestSchema, async (request) => {
  const { uri } = request.params;
  // Subscribe to resource changes
  return {
    meta: { subscriptionId: `sub-${uri}` },
  };
});
```

### 4. Root Listing
```typescript
import { ListRootsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

server.setRequestHandler(ListRootsRequestSchema, async () => {
  return {
    roots: [
      { uri: 'file:///workspace', name: 'Workspace' },
      { uri: 'file:///home', name: 'Home' },
    ],
  };
});
```

### 5. Completion Providers
```typescript
import { CompleteRequestSchema } from '@modelcontextprotocol/sdk/types.js';

server.setRequestHandler(CompleteRequestSchema, async (request) => {
  const { ref, argument } = request.params;
  // Generate completions
  return {
    completion: {
      values: ['suggestion1', 'suggestion2'],
      total: 2,
    },
  };
});
```

## Code Examples

### Complete Migration Example

**Old Server (0.5.0):**
```typescript
import { Server } from '@modelcontextprotocol/sdk';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/transport/stdio';

const server = new Server({
  name: 'old-server',
  version: '0.1.0',
});

server.setRequestHandler('tools/list', async () => {
  return { tools: [] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

**New Server (1.17.4):**
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'new-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: { subscribe: true },
      prompts: { listChanged: true },
      sampling: {},
      roots: { listChanged: true },
      completion: { argumentHints: true },
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'my-tool',
        description: 'Tool with schema validation',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
          required: ['input'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'my-tool') {
    return {
      content: [
        {
          type: 'text',
          text: `Processed: ${args.input}`,
        },
      ],
    };
  }
  
  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Testing Updates

### Vitest Configuration
Update your test setup for ES modules:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    conditions: ['node', 'import', 'default'],
  },
});
```

### Mock Imports
```typescript
import { vi } from 'vitest';

// Mock ES modules
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn(),
}));
```

## Migration Checklist

- [ ] Update all import paths to use new subpath exports
- [ ] Add `.js` extensions to all relative imports
- [ ] Update `tsconfig.json` with Node16 module settings
- [ ] Add `"type": "module"` to package.json
- [ ] Update server initialization with new capabilities
- [ ] Migrate to typed request schemas
- [ ] Add input/output schemas to tools
- [ ] Implement new features (sampling, subscriptions, etc.)
- [ ] Update tests for ES modules
- [ ] Run full test suite to verify

## Common Issues and Solutions

### Issue: "Cannot find module" errors
**Solution:** Ensure all imports use `.js` extension and correct subpath exports.

### Issue: TypeScript compilation errors
**Solution:** Update tsconfig.json with `"module": "Node16"` and `"moduleResolution": "Node16"`.

### Issue: Runtime ES module errors
**Solution:** Add `"type": "module"` to package.json.

### Issue: Test import failures
**Solution:** Update test mocks to use full import paths with `.js` extensions.

## Resources

- [MCP SDK 1.17.4 Documentation](https://github.com/modelcontextprotocol/sdk)
- [TypeScript ES Modules Guide](https://www.typescriptlang.org/docs/handbook/esm-node.html)
- [Node.js ES Modules Documentation](https://nodejs.org/api/esm.html)

## Getting Help

If you encounter issues during migration:

1. Check the error messages for import path issues
2. Verify your TypeScript configuration
3. Ensure all dependencies are updated
4. Review the example implementations in this repository
5. Open an issue in the Context-Pods repository for assistance