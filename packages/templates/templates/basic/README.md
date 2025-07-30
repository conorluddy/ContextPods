# {{serverName}}

{{serverDescription}}

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

- **{{serverName}}://example**: An example resource

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
    "{{serverName}}": {
      "command": "node",
      "args": ["path/to/{{serverName}}/dist/index.js"]
    }
  }
}
```
