# MCP Client Configuration Guide

This guide explains how to connect to the Context-Pods Meta-MCP Server from various MCP clients.

## Overview

The Context-Pods Meta-MCP Server exposes the Context-Pods toolkit as an MCP protocol interface, allowing AI systems to create and manage MCP servers programmatically.

## Claude Desktop Configuration

Add this configuration to your Claude Desktop settings file:

### macOS
Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows  
Location: `%APPDATA%/Claude/claude_desktop_config.json`

### Configuration

```json
{
  "mcpServers": {
    "context-pods": {
      "command": "npx",
      "args": ["@context-pods/server"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Development Configuration

For local development, use this configuration:

```json
{
  "mcpServers": {
    "context-pods-dev": {
      "command": "node",
      "args": ["./packages/server/dist/index.js"],
      "cwd": "/path/to/MCPTemplate",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "context-pods:*"
      }
    }
  }
}
```

## Available Tools

Once connected, the following MCP tools will be available:

### Core Generation Tools

- **`create-mcp`** - Generate new MCP servers from templates
- **`wrap-script`** - Convert existing scripts to MCP servers  
- **`list-mcps`** - Show all managed MCP servers
- **`validate-mcp`** - Validate MCP servers against standards

### Example Usage

```
Human: I need an MCP server that can interact with a PostgreSQL database

Claude: I'll help you create a PostgreSQL MCP server using Context-Pods!

*Claude calls the create-mcp tool*

Tool: create-mcp
Arguments: {
  "name": "postgresql-server", 
  "description": "MCP server for PostgreSQL database operations",
  "language": "typescript"
}

Result: ✅ Successfully created postgresql-server at ./postgresql-server
```

## Available Resources

The Meta-MCP Server provides these resources:

- **`context-pods://templates/`** - List of available templates
- **`context-pods://mcps/`** - All managed MCP servers  
- **`context-pods://status`** - System status and health
- **`context-pods://statistics`** - Usage statistics

## Alternative MCP Clients

### Cody (VS Code)

Add to VS Code settings.json:

```json
{
  "cody.experimental.mcp": {
    "servers": {
      "context-pods": {
        "command": "npx",
        "args": ["@context-pods/server"]
      }
    }
  }
}
```

### Continue (VS Code)

Add to continue configuration:

```json
{
  "mcpServers": [
    {
      "name": "context-pods",
      "command": "npx",
      "args": ["@context-pods/server"]
    }
  ]
}
```

### Custom Integration

For custom integrations, use the MCP SDK to connect:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['@context-pods/server']
});

const client = new Client({
  name: 'my-client',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools.tools);

// Call the create-mcp tool
const result = await client.callTool({
  name: 'create-mcp',
  arguments: {
    name: 'my-server',
    description: 'My custom MCP server'
  }
});
```

## Troubleshooting

### Common Issues

1. **Server not starting**
   - Ensure Node.js 18+ is installed
   - Run `npm install` in the Context-Pods directory
   - Check that `@context-pods/server` is built: `npm run build`

2. **Permission errors**
   - Ensure the client has permission to execute Node.js
   - Check file permissions on the server directory

3. **Tools not appearing**
   - Restart your MCP client
   - Check the client logs for connection errors
   - Verify the configuration file syntax

### Debug Mode

Enable debug logging by setting environment variables:

```json
{
  "mcpServers": {
    "context-pods": {
      "command": "npx",
      "args": ["@context-pods/server"],
      "env": {
        "DEBUG": "context-pods:*",
        "NODE_ENV": "development"
      }
    }
  }
}
```

### Log Locations

- **Claude Desktop**: Check the application logs
- **Development**: Logs appear in the terminal where the server is running
- **Production**: Logs are written to the system log

## Next Steps

1. Install and configure your MCP client
2. Test the connection by listing available tools
3. Try creating your first MCP server with the `create-mcp` tool
4. Explore the available templates and resources

For more information, see:
- [Templates Guide](./TEMPLATES.md)
- [Server Architecture](./ARCHITECTURE.md)
- [Contributing Guide](../CONTRIBUTING.md)