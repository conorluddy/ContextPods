# Meta-MCP Server Guide

## What is the Meta-MCP Server?

The Meta-MCP Server is Context-Pods' groundbreaking feature that exposes the entire Context-Pods toolkit as an MCP (Model Context Protocol) server. This means AI systems like Claude can directly call Context-Pods tools to create, manage, and validate MCP servers using natural language.

## 🎯 **Core Concept**

Instead of manually running CLI commands, you describe what you need in natural language, and the AI creates complete MCP servers for you:

```
Human: "I need an MCP server that can read PDF files and extract text"

Claude: I'll create a PDF processing MCP server for you!
*calls Context-Pods Meta-MCP create-mcp tool*
→ Complete TypeScript MCP server with PDF processing capabilities
→ Proper dependencies (pdf-parse, @modelcontextprotocol/sdk)
→ Error handling and logging
→ Tests and documentation
→ Ready to use immediately
```

## 🚀 **Quick Setup**

### 1. Install and Build

```bash
git clone https://github.com/conorluddy/ContextPods.git
cd ContextPods
npm install
npm run build
```

### 2. Verify Server Status

```bash
npm run mcp:status
```

You should see:
```
🟢 Status: READY
   The Meta-MCP Server is ready to run!
```

### 3. Configure Your MCP Client

#### For Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

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

#### For Other Clients

See [MCP_CLIENT_SETUP.md](./MCP_CLIENT_SETUP.md) for Cody, Continue, and custom integrations.

### 4. Test the Connection

```bash
npm run mcp:test
```

You should see:
```
🎉 Context-Pods Meta-MCP Server is working correctly.
```

## 🔧 **Available Tools**

The Meta-MCP Server exposes these tools via the MCP protocol:

### `create-mcp`
Create new MCP servers from natural language descriptions or templates.

**Example Usage:**
```
Human: "Create an MCP server for interacting with Stripe payments"

Claude calls: create-mcp
Arguments: {
  "name": "stripe-payments", 
  "description": "MCP server for Stripe payment processing",
  "language": "typescript"
}

Result: ✅ Complete Stripe MCP server with payment tools, webhook handling, and TypeScript types
```

### `wrap-script`
Convert existing scripts into MCP servers.

**Example Usage:**
```
Human: "Turn my Python backup script into an MCP server"

Claude calls: wrap-script
Arguments: {
  "scriptPath": "/path/to/backup.py",
  "name": "backup-manager"
}

Result: ✅ MCP server that exposes your backup script as MCP tools
```

### `list-mcps`
Show all managed MCP servers with their status and metadata.

### `validate-mcp`
Validate MCP servers against the official MCP specification and best practices.

## 📚 **Available Resources**

### `context-pods://templates/`
Lists all available templates with their capabilities and languages.

### `context-pods://mcps/`
Shows all managed MCP servers with status, metadata, and build information.

### `context-pods://status`
System status, configuration, and health information.

### `context-pods://statistics`
Usage statistics and analytics about generated servers.

## 🎯 **Real-World Examples**

### Example 1: Database Integration

```
Human: "I need to connect to my PostgreSQL database and run queries"

Claude: I'll create a PostgreSQL MCP server with query capabilities!

*Creates complete MCP server with:*
- Database connection tools
- Query execution with parameterization
- Connection pooling
- Error handling for SQL errors
- TypeScript types for results
```

### Example 2: API Wrapper

```
Human: "Wrap the GitHub API so I can manage repositories and issues"

Claude: I'll create a comprehensive GitHub MCP server!

*Creates MCP server with:*
- Repository management tools
- Issue creation and management
- Pull request operations
- Authentication handling
- Rate limiting support
```

### Example 3: File Processing

```
Human: "I need to process CSV files and convert them to different formats"

Claude: I'll create a CSV processing MCP server!

*Creates MCP server with:*
- CSV reading and parsing tools
- Format conversion (JSON, Excel, etc.)
- Data validation and cleaning
- Batch processing capabilities
- Progress reporting
```

## 🛠️ **Development Workflow**

### Live Development

Start the server in development mode with hot reloading:

```bash
npm run mcp:dev
```

This provides:
- Automatic restart on code changes
- Debug logging
- Source map support
- Development-friendly error messages

### Testing Changes

Test your changes without affecting your MCP client:

```bash
npm run mcp:test
```

### Status Monitoring

Check the health of all components:

```bash
npm run mcp:status
```

## 🔍 **Troubleshooting**

### Server Won't Start

1. **Check Node.js version**: Requires Node.js 18+
   ```bash
   node --version
   ```

2. **Rebuild packages**: 
   ```bash
   npm run build
   ```

3. **Check for port conflicts**: The server uses stdio, not ports

### Tools Not Appearing in Client

1. **Restart your MCP client**
2. **Check client logs** for connection errors
3. **Verify configuration syntax** in your client config file
4. **Test manually**:
   ```bash
   npm run mcp:test
   ```

### Permission Errors

1. **Check file permissions** on the Context-Pods directory
2. **Ensure Node.js can be executed** by your MCP client
3. **Try running manually** to isolate permission issues

## 🎉 **What's Next?**

Once you have the Meta-MCP Server running:

1. **Start Simple**: Try creating a basic utility server
2. **Explore Templates**: Ask to see available templates and their capabilities
3. **Build Complex Servers**: Combine multiple APIs and services
4. **Share Your Creations**: Generated servers are standalone and shareable

The Meta-MCP Server transforms Context-Pods from a development tool into a living, breathing MCP development organism where AI can create its own tools on demand!

## 📖 **Additional Resources**

- [MCP Client Configuration](./MCP_CLIENT_SETUP.md) - Setup for different clients
- [Architecture Overview](./ARCHITECTURE.md) - Technical details
- [Template Development](./TEMPLATES.md) - Creating custom templates
- [Contributing Guide](../CONTRIBUTING.md) - Contributing to Context-Pods