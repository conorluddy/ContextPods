# test-mcp-basic

MCP server generated from basic template

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

- **test-mcp-basic://example**: An example resource

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
    "test-mcp-basic": {
      "command": "node",
      "args": ["path/to/test-mcp-basic/dist/index.js"]
    }
  }
}
```