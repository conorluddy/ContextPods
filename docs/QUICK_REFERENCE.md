# Context-Pods Quick Reference

## Common Commands

### Generate MCP Server

```bash
# Basic TypeScript server
npx @context-pods/cli generate basic --name my-server

# Advanced TypeScript server with tools
npx @context-pods/cli generate typescript-advanced \
  --name my-server \
  --includeTools true \
  --toolCategories '["file", "data"]'

# Python server
npx @context-pods/cli generate python-basic \
  --name my-python-server \
  --pythonVersion "3.11"

# From config file
npx @context-pods/cli generate typescript-advanced --config config.json
```

### Wrap Existing Scripts

```bash
# Wrap Python script
npx @context-pods/cli wrap ./script.py --name wrapped-script

# Wrap Node.js script
npx @context-pods/cli wrap ./script.js --name wrapped-script

# Wrap with custom output
npx @context-pods/cli wrap ./script.sh \
  --name wrapped-script \
  --output ./servers/wrapped
```

### Meta-MCP Server

```bash
# Start Meta-MCP Server
npx @context-pods/cli server start

# Check server status
npx @context-pods/cli server status

# Stop server
npx @context-pods/cli server stop

# Test server connection
npx @context-pods/cli server test

# Development mode with hot reload
npm run mcp:dev
```

### Validation & Testing

```bash
# Validate MCP server
npx @context-pods/cli validate-mcp ./my-server

# Test script wrapper
npx @context-pods/testing test-wrapper ./script.py --language python

# Run compliance tests
npx @context-pods/testing validate-mcp ./dist

# Generate test report
npx @context-pods/testing generate-report ./results.json --format html
```

### Management

```bash
# List all templates
npx @context-pods/cli templates

# List generated servers
npx @context-pods/cli list

# Show server details
npx @context-pods/cli info my-server

# Update server
npx @context-pods/cli update my-server
```

## Variable Reference

### Common Variables

| Variable    | Type   | Required | Default                     | Pattern             |
| ----------- | ------ | -------- | --------------------------- | ------------------- |
| serverName  | string | ✓        | -                           | `^[a-z][a-z0-9-]*$` |
| description | string | ✗        | "A Context-Pods MCP server" | -                   |
| author      | string | ✗        | "Context-Pods Developer"    | -                   |
| license     | string | ✗        | "MIT"                       | -                   |
| version     | string | ✗        | "0.1.0"                     | Semver              |

### TypeScript Template Variables

| Variable         | Type    | Options                              | Default          |
| ---------------- | ------- | ------------------------------------ | ---------------- |
| includeTools     | boolean | -                                    | true             |
| includeResources | boolean | -                                    | false            |
| includePrompts   | boolean | -                                    | false            |
| toolCategories   | array   | file, data, utility, network, system | ["file", "data"] |
| useStrictMode    | boolean | -                                    | true             |
| nodeVersion      | string  | "18", "20", "21"                     | "20"             |

### Python Template Variables

| Variable            | Type    | Options                       | Default |
| ------------------- | ------- | ----------------------------- | ------- |
| pythonVersion       | string  | "3.9", "3.10", "3.11", "3.12" | "3.11"  |
| usePoetry           | boolean | -                             | false   |
| includeAsyncSupport | boolean | -                             | true    |

## Configuration File Format

### Basic Configuration

```json
{
  "serverName": "my-server",
  "description": "My MCP server",
  "author": "Your Name",
  "license": "MIT",
  "version": "1.0.0"
}
```

### Advanced Configuration

```json
{
  "serverName": "advanced-server",
  "description": "Advanced MCP server with all features",
  "includeTools": true,
  "includeResources": true,
  "toolCategories": ["file", "data", "network"],
  "optimization": {
    "turboRepo": true,
    "hotReload": true
  }
}
```

## Claude Desktop Configuration

### Basic Setup

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["./path/to/dist/index.js"]
    }
  }
}
```

### With Environment Variables

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "/absolute/path/to/server",
      "env": {
        "LOG_LEVEL": "debug",
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

### Meta-MCP Server

```json
{
  "mcpServers": {
    "context-pods": {
      "command": "npx",
      "args": ["@context-pods/server"]
    }
  }
}
```

## Error Quick Fixes

### Invalid serverName

```bash
# ❌ Wrong
--name "My_Server"
--name "123-server"
--name "server name"

# ✅ Correct
--name "my-server"
--name "api-gateway"
--name "pdf-processor"
```

### Array Format

```bash
# ❌ Wrong
--toolCategories file,data
--toolCategories "file data"

# ✅ Correct
--toolCategories '["file", "data"]'
```

### File Paths

```bash
# ❌ Wrong (relative paths in some contexts)
--output ./my-server
--config ./config.json

# ✅ Correct (absolute paths when needed)
--output /Users/me/projects/my-server
--config /Users/me/config.json
```

## Development Workflow

### 1. Generate Server

```bash
npx @context-pods/cli generate typescript-advanced \
  --name dev-server \
  --includeTools true
```

### 2. Navigate and Install

```bash
cd generated/dev-server
npm install
```

### 3. Build and Test

```bash
npm run build
npm test
```

### 4. Run Locally

```bash
# Test with MCP protocol
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}' | node dist/index.js

# Or use npm start
npm start
```

### 5. Configure Client

Add to Claude Desktop config and restart.

## Environment Variables

### Common Variables

```bash
# Logging
LOG_LEVEL=debug

# Node environment
NODE_ENV=production

# Custom
MCP_SERVER_NAME="My Server"
```

### Database Servers

```bash
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=postgres
DB_PASSWORD=password

# MongoDB
MONGODB_URI=mongodb://localhost:27017/mydb
```

### API Servers

```bash
# API Keys
API_KEY=your-api-key
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...

# Endpoints
API_BASE_URL=https://api.example.com
WEBHOOK_URL=https://hooks.example.com
```

## Useful Aliases

Add to your shell configuration:

```bash
# Context-Pods aliases
alias mcp-gen='npx @context-pods/cli generate'
alias mcp-wrap='npx @context-pods/cli wrap'
alias mcp-list='npx @context-pods/cli list'
alias mcp-validate='npx @context-pods/cli validate-mcp'

# Quick generate
alias mcp-ts='npx @context-pods/cli generate typescript-advanced'
alias mcp-py='npx @context-pods/cli generate python-basic'

# Meta-MCP
alias mcp-start='npx @context-pods/cli server start'
alias mcp-status='npx @context-pods/cli server status'
```

## Links

- [GitHub Repository](https://github.com/conorluddy/ContextPods)
- [Issue Tracker](https://github.com/conorluddy/ContextPods/issues)
- [NPM Package](https://www.npmjs.com/package/@context-pods/cli)
- [MCP Protocol Docs](https://modelcontextprotocol.io)
