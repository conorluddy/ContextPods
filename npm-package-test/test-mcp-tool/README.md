# test-mcp-tool-demo

Test MCP server created via MCP tool

## Installation

```bash
npm install
npm run build
```

## Usage

This MCP server can be used with any MCP-compatible client.

### Available Tools

- **example-tool**: An example tool that echoes input

### Available Resources

- **test-mcp-tool-demo://example**: An example resource

## Development

```bash
# Build the server
npm run build

# Run in development mode with auto-reload
npm run dev

# Run the server
npm start
```

## Configuration

Add this server to your MCP client configuration:

```json
{
  "mcpServers": {
    "test-mcp-tool-demo": {
      "command": "node",
      "args": ["path/to/test-mcp-tool-demo/dist/index.js"]
    }
  }
}
```