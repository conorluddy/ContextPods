# Getting Started with Context-Pods

Context-Pods is the comprehensive MCP development framework that creates MCP servers through natural language descriptions or by wrapping existing scripts. This guide will walk you through creating your first MCP server from scratch.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** - Download from [nodejs.org](https://nodejs.org)
- **npm** - Comes with Node.js
- **Git** - For version control
- **Claude Desktop** - For testing your MCP servers

### System Requirements

- **Operating System**: macOS, Linux, or Windows with WSL2
- **Memory**: 4GB RAM minimum (8GB recommended)
- **Storage**: 500MB free space

## Quick Installation

### Option 1: NPX (Recommended for First-Time Users)

```bash
# Generate your first MCP server interactively
npx @context-pods/create generate

# Follow the prompts to select language and template
```

### Option 2: Global Installation

```bash
# Install globally for repeated use
npm install -g @context-pods/create

# Generate a server
context-pods generate
```

## Your First MCP Server

Let's create a simple weather information MCP server:

### Step 1: Generate the Server

```bash
npx @context-pods/create generate
```

You'll be prompted to choose:

- **Server name**: `weather-info`
- **Language**: TypeScript (recommended for beginners)
- **Template**: `typescript-advanced`
- **Description**: "Provides weather information and forecasts"

### Step 2: Navigate to Your Server

```bash
cd weather-info
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Build the Server

```bash
npm run build
```

### Step 5: Test the Server

```bash
# Run the server to check it works
npm run dev

# In another terminal, test with the testing framework
npx @context-pods/testing validate-mcp .
```

## Setting Up Claude Desktop Integration

To use your MCP server with Claude Desktop:

### Step 1: Locate Claude Desktop Config

The configuration file is typically located at:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Step 2: Add Your Server

Add your server to the configuration:

```json
{
  "mcpServers": {
    "weather-info": {
      "command": "node",
      "args": ["/path/to/your/weather-info/dist/index.js"]
    }
  }
}
```

### Step 3: Restart Claude Desktop

Restart Claude Desktop to load your new MCP server.

### Step 4: Test the Integration

In Claude Desktop, try asking:

> "What weather tools do you have available?"

You should see your server's tools listed and available for use.

## Understanding the Generated Structure

Your generated MCP server includes:

```
weather-info/
├── src/
│   ├── index.ts          # Main server entry point
│   ├── server.ts         # MCP server implementation
│   ├── tools/            # Tool implementations
│   │   ├── index.ts      # Tool exports
│   │   └── *.ts          # Individual tool files
│   ├── resources/        # Resource implementations
│   └── utils/            # Utility functions
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # Server-specific documentation
```

### Key Files Explained

- **`src/index.ts`**: The main entry point that starts the MCP server
- **`src/server.ts`**: Implements the MCP protocol and registers tools/resources
- **`src/tools/`**: Contains individual tool implementations
- **`src/resources/`**: Contains resource providers (data sources)

## Common Development Workflow

### 1. Add New Tools

```typescript
// src/tools/forecast.ts
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const forecastTool: Tool = {
  name: 'get_forecast',
  description: 'Get weather forecast for a location',
  inputSchema: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'City name or coordinates',
      },
      days: {
        type: 'number',
        description: 'Number of days to forecast',
        default: 3,
      },
    },
    required: ['location'],
  },
};

export async function handleForecast(args: any) {
  // Your implementation here
  return {
    content: [
      {
        type: 'text',
        text: `Weather forecast for ${args.location}...`,
      },
    ],
  };
}
```

### 2. Register Tools in Server

```typescript
// src/server.ts
import { forecastTool, handleForecast } from './tools/forecast.js';

// Add to your server's tools array
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_forecast':
      return await handleForecast(args);
    // ... other tools
  }
});
```

### 3. Test Your Changes

```bash
# Build the server
npm run build

# Test the server
npm run dev

# Validate MCP compliance
npx @context-pods/testing validate-mcp .
```

### 4. Update Claude Desktop

After making changes, restart Claude Desktop to reload your server.

## Troubleshooting Common Issues

### Server Won't Start

```bash
# Check for TypeScript errors
npm run build

# Check for missing dependencies
npm install

# Run in debug mode
DEBUG=mcp* npm run dev
```

### Claude Desktop Can't Find Server

1. **Check file paths** in `claude_desktop_config.json`
2. **Verify permissions** on the server file
3. **Check server logs** in Claude Desktop's developer console

### Tools Not Appearing

1. **Verify server is running** with `npm run dev`
2. **Check tool registration** in `src/server.ts`
3. **Validate MCP compliance** with the testing framework

## Next Steps

Now that you have a basic MCP server running:

1. **Explore Templates** - Check out different [templates](templates.md) for various use cases
2. **Read the API Reference** - Dive deeper with the [API documentation](api-reference.md)
3. **Learn Testing** - Master the [testing framework](testing.md)
4. **Join the Community** - See our [CONTRIBUTING.md](../CONTRIBUTING.md) guide

## Advanced Topics

### Environment Variables

Your server can use environment variables for configuration:

```typescript
// src/config.ts
export const config = {
  apiKey: process.env.WEATHER_API_KEY || '',
  timeout: Number(process.env.REQUEST_TIMEOUT) || 5000,
};
```

### Error Handling

Implement robust error handling:

```typescript
export async function handleWeatherTool(args: any) {
  try {
    // Your implementation
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
```

### Logging

Use the built-in logger for debugging:

```typescript
import { Logger } from '../utils/logger.js';

export async function handleTool(args: any) {
  Logger.info('Processing request', { args });
  // ... implementation
}
```

## Getting Help

- **Documentation**: Explore all guides in the [docs/](../docs/) directory
- **Examples**: Check out real-world examples in template directories
- **Issues**: Report bugs on our [GitHub Issues](https://github.com/conorluddy/ContextPods/issues)
- **Community**: Join discussions in GitHub Discussions

Happy building with Context-Pods! 🚀
