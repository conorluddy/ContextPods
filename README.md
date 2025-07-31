# Context-Pods

[![GitHub Stars](https://img.shields.io/github/stars/conorluddy/ContextPods?style=social)](https://github.com/conorluddy/ContextPods)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TurboRepo](https://img.shields.io/badge/built%20with-TurboRepo-blueviolet.svg)](https://turbo.build/)
[![Meta-MCP Server](https://img.shields.io/badge/Meta--MCP-Live-brightgreen.svg)](docs/META_MCP_GUIDE.md)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/conorluddy/ContextPods)
[![codecov](https://codecov.io/gh/conorluddy/ContextPods/graph/badge.svg?token=T7PABCGEO0)](https://codecov.io/gh/conorluddy/ContextPods)

> _The MCP development framework that creates MCP servers_

**Context-Pods** is a comprehensive development framework for creating, testing, and managing Model Context Protocol (MCP) servers. It provides a Meta-MCP Server that can generate other MCP servers through natural language descriptions or by wrapping existing scripts.

## 🚀 Quick Start

```bash
# Install and run Context-Pods CLI
npx @context-pods/create generate

# Or install globally
npm install -g @context-pods/create
context-pods generate
```

## ✨ Features

### 🎯 Multiple Language Support

Create MCP servers in your preferred language:

- **TypeScript** - Full type safety with TurboRepo optimization
- **Python** - Async support with built-in data science tools
- **Rust** - High-performance servers with Tokio async runtime
- **Shell** - Wrap existing CLI tools and scripts as MCP servers
- **JavaScript** - Simple, no-build-step servers (coming soon)

### 🤖 Meta-MCP Server

The Meta-MCP Server exposes Context-Pods functionality through the MCP protocol itself:

```json
{
  "tools": [
    "create-mcp", // Generate servers from descriptions
    "wrap-script", // Convert scripts to MCP servers
    "list-mcps", // Manage existing servers
    "validate-mcp" // Validate MCP compliance
  ]
}
```

### 🛠️ Advanced Features

- **TurboRepo Integration** - Optimized builds and caching
- **Hot Reloading** - Live development with automatic restarts
- **Comprehensive Testing** - Built-in MCP protocol compliance tests
- **Schema Validation** - Zod-based runtime validation
- **Multi-Transport Support** - stdio, HTTP, and WebSocket
- **Production Ready** - Error handling, logging, and monitoring

## 📦 Templates

### Basic Templates

#### `basic` (TypeScript)

Minimal TypeScript MCP server with essential features:

```bash
context-pods generate basic --name my-server
```

#### `python-basic`

Self-contained Python server with async support:

```bash
context-pods generate python-basic --name my_python_server
```

#### `rust-basic`

High-performance Rust server with Tokio:

```bash
context-pods generate rust-basic --name my_rust_server
```

#### `shell-wrapper`

Expose shell scripts and CLI tools via MCP:

```bash
context-pods generate shell-wrapper --name my_cli_wrapper
```

### Advanced Templates

#### `typescript-advanced`

Full-featured TypeScript server with utilities, validation, and testing:

```bash
context-pods generate typescript-advanced --name my-advanced-server
```

## 🔧 CLI Commands

```bash
# Generate a new MCP server
context-pods generate [template] [options]

# Wrap an existing script as MCP server
context-pods wrap <script> [options]

# List all managed MCP servers
context-pods list

# Run development server with hot reload
context-pods dev

# Build all packages
context-pods build

# Run tests
context-pods test

# Validate MCP compliance
context-pods validate <path>
```

## 🏗️ Architecture

Context-Pods uses a monorepo structure powered by TurboRepo:

```
context-pods/
├── packages/
│   ├── core/        # Core utilities and schemas
│   ├── cli/         # Command-line interface
│   ├── templates/   # Server templates
│   ├── testing/     # MCP testing framework
│   ├── server/      # Meta-MCP server
│   └── create/      # npx runner
├── docs/            # Documentation
└── examples/        # Example implementations
```

## 🔌 Integration

### Claude Desktop

Add to your Claude Desktop configuration:

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

### VS Code (Cody, Continue)

Configure in your extension settings:

```json
{
  "mcp.servers": {
    "context-pods": {
      "command": "npx",
      "args": ["@context-pods/server"]
    }
  }
}
```

## 🧪 Testing

Context-Pods includes a comprehensive testing framework:

```typescript
import { validateMCPServer, testHarness } from '@context-pods/testing';

// Validate MCP compliance
const validation = await validateMCPServer('./my-server');

// Test server communication
const harness = testHarness('./my-server');
await harness.testTool('my-tool', { input: 'test' });
```

## 📚 Documentation

- [Getting Started Guide](docs/getting-started.md)
- [Meta-MCP Server Guide](docs/META_MCP_GUIDE.md)
- [Template Development](docs/templates.md)
- [Testing Framework](docs/testing.md)
- [API Reference](docs/api-reference.md)

## 🤝 Contributing

Not open for contributions yet - I want to get this a bit more bulletproof first.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/conorluddy/ContextPods.git
cd ContextPods

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Start development
npm run dev
```

## 📈 Roadmap

- [ ] Additional language templates (Go, Ruby, Java)
- [ ] Visual template builder
- [ ] MCP server marketplace
- [ ] Cloud deployment options
- [ ] Performance profiling tools
- [ ] GraphQL transport support

## 📄 License

MIT © [Conor Luddy](https://github.com/conorluddy)

## 🙏 Acknowledgments

Built with the [Model Context Protocol SDK](https://github.com/anthropics/model-context-protocol) by Anthropic.

---

<p align="center">
  <i>Context-Pods: Where context creates context</i>
</p>
