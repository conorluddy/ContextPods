# TypeScript Advanced MCP Server Template

A comprehensive, production-ready Model Context Protocol (MCP) server template with advanced features, full TypeScript support, and extensive testing capabilities.

## 🚀 Features

This template includes all MCP protocol features and advanced capabilities:

### Core MCP Features
- **🔧 Tools** - Define and execute tools with JSON Schema validation
- **📦 Resources** - Expose data and files with subscription support
- **💬 Prompts** - Pre-configured prompt templates with dynamic arguments
- **📊 Progress Notifications** - Real-time progress tracking for long operations

### Advanced Capabilities
- **🤖 Sampling/LLM Integration** - Built-in LLM interaction support
- **🖼️ Multi-Modal Content** - Handle text, images, audio, video, and more
- **📁 Root Listing** - Secure file system navigation with sandboxing
- **✨ Completion Providers** - Auto-complete suggestions for multiple languages

### Developer Experience
- **📝 Full TypeScript** - Complete type safety with strict mode
- **🧪 Comprehensive Testing** - Unit tests, integration tests, and mocks
- **📖 Extensive Documentation** - Inline JSDoc and usage examples
- **🔒 Security First** - Input validation, path sandboxing, rate limiting
- **📊 Structured Logging** - Built-in logger with multiple levels
- **🎯 ES Modules** - Modern JavaScript with proper module support

## 📋 Prerequisites

- Node.js 18+ (20+ recommended)
- npm, yarn, or pnpm
- TypeScript 5.0+

## 🛠️ Installation

### Using Context-Pods CLI (Recommended)

```bash
npx @context-pods/cli generate typescript-advanced --name my-mcp-server
cd my-mcp-server
npm install
```

### Manual Installation

```bash
# Clone the template
git clone <repository-url>
cd typescript-advanced

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

## 🏗️ Project Structure

```
typescript-advanced/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── server.ts                 # Server configuration
│   ├── tools/                   # Tool implementations
│   │   ├── index.ts             # Tool registration
│   │   ├── advanced-tools.ts    # Tools with schemas
│   │   ├── file-tools.ts        # File operations
│   │   ├── data-tools.ts        # Data processing
│   │   └── utility-tools.ts     # Utility functions
│   ├── resources/               # Resource handlers
│   │   ├── index.ts             # Resource registration
│   │   └── subscriptions.ts     # Subscription management
│   ├── prompts/                 # Prompt templates
│   │   └── index.ts             # Prompt management
│   ├── notifications/           # Progress tracking
│   │   └── progress.ts          # Progress notifications
│   ├── sampling/                # LLM integration
│   │   └── index.ts             # Sampling service
│   ├── content/                 # Multi-modal content
│   │   └── multimodal.ts        # Content processor
│   ├── roots/                   # File system access
│   │   └── index.ts             # Root manager
│   ├── completion/              # Auto-complete
│   │   └── index.ts             # Completion providers
│   └── utils/                   # Utilities
│       ├── logger.ts            # Logging utility
│       └── validation.ts        # Input validation
├── tests/                       # Test files
├── dist/                        # Compiled output
├── package.json                 # Dependencies
├── tsconfig.json               # TypeScript config
└── README.md                   # This file
```

## 🔧 Configuration

### Server Configuration

Edit `src/server.ts` to configure server capabilities:

```typescript
const server = new Server(
  {
    name: 'my-mcp-server',
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
```

### Environment Variables

Create a `.env` file for configuration:

```env
# Logging
LOG_LEVEL=info  # debug, info, warn, error

# Server
SERVER_NAME=my-mcp-server
SERVER_VERSION=1.0.0

# Features (optional)
ENABLE_SAMPLING=true
ENABLE_MULTIMODAL=true
ENABLE_ROOTS=true
ENABLE_COMPLETION=true
```

## 📚 Usage Examples

### Implementing a Tool

```typescript
// src/tools/my-tool.ts
export const myTool = {
  name: 'calculate',
  description: 'Perform calculations',
  inputSchema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Math expression to evaluate',
      },
    },
    required: ['expression'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      result: { type: 'number' },
      formula: { type: 'string' },
    },
  },
  handler: async (args: { expression: string }) => {
    const result = eval(args.expression); // Note: Use a safe math parser in production
    return {
      result,
      formula: args.expression,
    };
  },
};
```

### Creating a Resource

```typescript
// src/resources/my-resource.ts
export const myResource = {
  uri: 'myserver://data',
  name: 'Server Data',
  description: 'Dynamic server data',
  mimeType: 'application/json',
  handler: async () => {
    return {
      contents: [{
        uri: 'myserver://data',
        mimeType: 'application/json',
        text: JSON.stringify({
          timestamp: new Date().toISOString(),
          status: 'running',
        }),
      }],
    };
  },
};
```

### Adding a Prompt Template

```typescript
// src/prompts/my-prompt.ts
export const myPrompt = {
  name: 'debug-helper',
  title: 'Debug Assistant',
  description: 'Help debug code issues',
  arguments: [
    {
      name: 'error',
      description: 'Error message or stack trace',
      required: true,
    },
  ],
  handler: async (args: { error: string }) => {
    return {
      messages: [
        {
          role: 'system',
          content: {
            type: 'text',
            text: 'You are a debugging assistant.',
          },
        },
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Help me debug this error: ${args.error}`,
          },
        },
      ],
    };
  },
};
```

### Progress Tracking

```typescript
import { withProgress } from './notifications/progress.js';

async function longOperation(data: any[]) {
  return withProgress('Processing data', async (progress) => {
    const results = [];
    
    for (let i = 0; i < data.length; i++) {
      results.push(await processItem(data[i]));
      
      // Update progress
      const percent = ((i + 1) / data.length) * 100;
      await progress(percent, `Processed ${i + 1} of ${data.length}`);
    }
    
    return results;
  });
}
```

### Multi-Modal Content

```typescript
import { multiModalProcessor } from './content/multimodal.js';

// Process an image file
const imageContent = await multiModalProcessor.processFile('image.jpg');
console.log(imageContent.type); // 'image/jpeg'
console.log(imageContent.metadata); // { size, dimensions, etc. }

// Create text content
const textContent = multiModalProcessor.createTextContent(
  '# Hello World',
  'markdown'
);
```

## 🧪 Testing

The template includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test suites
npm test -- tools
npm test -- resources
npm test -- sampling
```

### Test Structure

```typescript
// tests/my-feature.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('My Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should work correctly', async () => {
    // Test implementation
    expect(result).toBeDefined();
  });
});
```

## 📝 Development

### Available Scripts

```bash
# Development
npm run dev          # Run with auto-reload
npm run build        # Build for production
npm run type-check   # Check TypeScript types
npm run lint         # Run ESLint
npm run format       # Format with Prettier

# Testing
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report

# Production
npm start            # Run built server
```

### Adding New Features

1. **Create feature module** in appropriate directory
2. **Add TypeScript types** for full type safety
3. **Write unit tests** for the feature
4. **Register with server** in server.ts
5. **Document usage** with JSDoc comments
6. **Update README** with examples

## 🔒 Security

This template includes security best practices:

- **Input Validation** - All inputs validated with Zod schemas
- **Path Sandboxing** - File operations restricted to allowed paths
- **Rate Limiting** - Built-in rate limiting for tools
- **Error Handling** - Comprehensive error catching and logging
- **No Eval** - Safe expression evaluation without eval()
- **Secrets Management** - Environment variables for sensitive data

## 🚀 Deployment

### Building for Production

```bash
# Install dependencies
npm ci --production

# Build TypeScript
npm run build

# Run production server
NODE_ENV=production npm start
```

### Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
```

### MCP Client Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["path/to/my-server/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## 📖 API Reference

### Tools API

All tools follow this structure:

```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
  handler: (args: any) => Promise<any>;
}
```

### Resources API

```typescript
interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: () => Promise<ResourceContent>;
}
```

### Prompts API

```typescript
interface Prompt {
  name: string;
  title: string;
  description: string;
  arguments: PromptArgument[];
  handler: (args: any) => Promise<PromptMessages>;
}
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT - See LICENSE file for details

## 🙏 Acknowledgments

Built with the Model Context Protocol SDK by Anthropic.

## 📞 Support

- GitHub Issues: [Report bugs or request features]
- Documentation: [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- Community: [MCP Discord Server]

---

Made with ❤️ in Dublin