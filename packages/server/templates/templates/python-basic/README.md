# {{serverName}}

{{serverDescription}}

## Overview

This is a Model Context Protocol (MCP) server implementation in Python. It provides tools and resources that can be used by MCP clients.

## Installation

```bash
# Install dependencies
pip install -r requirements.txt
```

## Usage

### Running the Server

```bash
python main.py
```

### Configuring with MCP Clients

To use this server with an MCP client, add the following configuration:

```json
{
  "mcpServers": {
    "{{serverName}}": {
      "command": "python",
      "args": ["/path/to/{{serverName}}/main.py"]
    }
  }
}
```

## Available Tools

- **example_tool**: An example tool that echoes the input message

## Available Resources

- **{{serverName}}://example**: An example resource demonstrating the resource system

## Development

### Adding New Tools

1. Open `src/tools.py`
2. Add your tool definition to the `get_tools()` function
3. Add the tool handler in the `handle_tool_call()` function

### Adding New Resources

1. Open `src/resources.py`
2. Add your resource definition to the `get_resources()` function
3. Add the resource handler in the `handle_resource_read()` function

## Testing

```bash
# Run tests (if available)
python -m pytest tests/
```

## License

MIT
