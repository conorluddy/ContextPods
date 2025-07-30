# {{serverName}}

{{serverDescription}}

## Overview

This is an advanced TypeScript Model Context Protocol (MCP) server implementation with full TurboRepo optimization and Context-Pods utilities. It provides a robust foundation for building production-ready MCP servers.

## Features

- 🚀 **TurboRepo Optimized** - Fast builds with caching and hot reloading
- 📦 **Context-Pods Integration** - Leverages shared utilities and components
- 🛡️ **Type Safety** - Full TypeScript support with strict typing
- 📝 **Structured Logging** - Built-in logging with Context-Pods logger
- ⚡ **Hot Reload** - Development mode with instant feedback
- 🧪 **Testing** - Comprehensive test setup with Vitest

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Development Mode

```bash
# Run with hot reloading
npm run dev
```

### Production Mode

```bash
# Build and run
npm run build
npm start
```

### Configuring with MCP Clients

Add the following to your MCP client configuration:

```json
{
  "mcpServers": {
    "{{serverName}}": {
      "command": "node",
      "args": ["/path/to/{{serverName}}/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Available Tools

{{#if toolCategories}}
{{#each toolCategories}}

### {{this}} Tools

- Tools for {{this}} operations
  {{/each}}
  {{else}}
- **Example Tool** - Demonstrates tool implementation
  {{/if}}

## Available Resources

- **{{serverName}}://status** - Server status and health information
- **{{serverName}}://config** - Current configuration

## Project Structure

```
{{serverName}}/
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # MCP server setup
│   ├── tools/            # Tool implementations
│   │   ├── index.ts
│   │   ├── file-tools.ts
│   │   ├── data-tools.ts
│   │   └── utility-tools.ts
│   ├── resources/        # Resource implementations
│   │   └── index.ts
│   └── utils/            # Utility functions
│       ├── validation.ts
│       ├── helpers.ts
│       └── logger.ts
├── tests/                # Test files
├── dist/                 # Compiled output
└── package.json
```

## Development

### Adding New Tools

1. Create a new file in `src/tools/` or add to existing category files
2. Export your tool from `src/tools/index.ts`
3. Tools are automatically registered with the server

Example:

```typescript
export const myTool: Tool = {
  name: 'my-tool',
  description: 'Description of what the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'Parameter description' },
    },
    required: ['param'],
  },
  handler: async (args) => {
    // Implementation
    return { result: 'success' };
  },
};
```

### Adding New Resources

1. Add resources to `src/resources/index.ts`
2. Resources are automatically registered with the server

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Available environment variables:

- `NODE_ENV` - Environment mode (development/production)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check
```

## Scripts

- `npm run build` - Build the TypeScript project
- `npm run dev` - Start development server with hot reload
- `npm start` - Run the built server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - Check TypeScript types

## License

MIT
