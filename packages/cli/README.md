# @context-pods/cli

Command-line interface for the Context-Pods MCP (Model Context Protocol) development suite.

[![npm version](https://badge.fury.io/js/@context-pods%2Fcli.svg)](https://www.npmjs.com/package/@context-pods/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

### Global Installation (Recommended)

```bash
npm install -g @context-pods/cli
```

### Using npx

For one-off usage without installation:

```bash
npx @context-pods/create <command>
```

Note: We provide a separate [`@context-pods/create`](https://www.npmjs.com/package/@context-pods/create) package specifically for npx usage.

## Usage

```bash
context-pods <command> [options]
```

## Commands

### `generate [template]`

Generate a new MCP server from a template.

```bash
context-pods generate
context-pods generate typescript-basic --name my-server
context-pods generate --output ./my-server --name weather-api
```

Options:

- `-o, --output <path>` - Output directory
- `-n, --name <name>` - MCP server name
- `-d, --description <text>` - MCP server description
- `-f, --force` - Overwrite existing files
- `--var <key=value...>` - Template variables

### `wrap <script> <name>`

Wrap an existing script as an MCP server.

```bash
context-pods wrap ./my-script.py my-wrapper
context-pods wrap ./analyze.sh data-analyzer --output ./servers
```

Options:

- `-o, --output <path>` - Output directory
- `-d, --description <text>` - MCP server description
- `-t, --template <name>` - Specific template to use
- `--var <key=value...>` - Template variables

### `list`

List all available MCP servers.

```bash
context-pods list
context-pods list --format json
context-pods list --status ready
```

Options:

- `--format <format>` - Output format (table, json, summary)
- `--status <status>` - Filter by status
- `--search <term>` - Search in names and descriptions

### `server <command>`

Manage MCP servers.

```bash
context-pods server start my-server
context-pods server stop my-server
context-pods server status my-server
context-pods server logs my-server
```

### `templates`

List available templates.

```bash
context-pods templates
context-pods templates --language typescript
context-pods templates --category wrapper
```

### `build [servers...]`

Build one or more MCP servers.

```bash
context-pods build
context-pods build my-server
context-pods build server1 server2 --parallel
```

### `dev [server]`

Start development mode with hot reload.

```bash
context-pods dev my-server
context-pods dev --all
```

### `test [servers...]`

Run tests for MCP servers.

```bash
context-pods test
context-pods test my-server
context-pods test --coverage
```

### `init`

Initialize a new Context-Pods workspace.

```bash
context-pods init
context-pods init --turbo
```

## Configuration

Context-Pods looks for configuration in the following order:

1. `.context-pods.json` in the current directory
2. `context-pods.json` in the current directory
3. `.context-pods/config.json` in the home directory
4. Environment variables with `CONTEXT_PODS_` prefix

Example configuration:

```json
{
  "defaultTemplate": "typescript-basic",
  "outputDirectory": "./servers",
  "turbo": {
    "enabled": true,
    "pipeline": {
      "build": {
        "dependsOn": ["^build"]
      }
    }
  }
}
```

## Related Packages

- [`@context-pods/core`](https://www.npmjs.com/package/@context-pods/core) - Core utilities and types
- [`@context-pods/create`](https://www.npmjs.com/package/@context-pods/create) - npx runner for quick starts
- [`@context-pods/server`](https://www.npmjs.com/package/@context-pods/server) - MCP server implementation
- [`@context-pods/testing`](https://www.npmjs.com/package/@context-pods/testing) - Testing framework

## License

MIT
