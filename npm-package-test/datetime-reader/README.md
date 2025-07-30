# system-datetime-reader

MCP server that reads and formats system datetime

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

- **system-datetime-reader://example**: An example resource

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
    "system-datetime-reader": {
      "command": "node",
      "args": ["path/to/system-datetime-reader/dist/index.js"]
    }
  }
}
```