# @context-pods/create

npx runner for Context-Pods MCP (Model Context Protocol) development suite.

[![npm version](https://badge.fury.io/js/@context-pods%2Fcreate.svg)](https://www.npmjs.com/package/@context-pods/create)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Usage

Run Context-Pods CLI directly with npx:

```bash
npx @context-pods/create generate
npx @context-pods/create wrap ./my-script.py my-wrapper
npx @context-pods/create list
```

This package acts as a lightweight proxy that:

1. Temporarily installs the full Context-Pods CLI and its dependencies
2. Forwards your commands to the CLI
3. Cleans up after execution

## Why this package?

The main `@context-pods/cli` package uses ES modules and has dependencies that aren't automatically resolved by `npx`. This runner package solves that issue by handling the installation of all required dependencies in a temporary directory.

## For regular use

If you plan to use Context-Pods frequently, we recommend installing the CLI globally:

```bash
npm install -g @context-pods/cli
```

## How it works

1. Creates a temporary directory
2. Installs `@context-pods/cli` and `@context-pods/core` with all their dependencies
3. Executes your command using the installed CLI
4. Cleans up the temporary directory

This approach ensures all dependencies are properly resolved without polluting your global or project node_modules.

## Related Packages

- [`@context-pods/cli`](https://www.npmjs.com/package/@context-pods/cli) - Full CLI for regular use
- [`@context-pods/core`](https://www.npmjs.com/package/@context-pods/core) - Core utilities and types
- [`@context-pods/server`](https://www.npmjs.com/package/@context-pods/server) - MCP server implementation
- [`@context-pods/testing`](https://www.npmjs.com/package/@context-pods/testing) - Testing framework

## License

MIT
