# Context-Pods

[![GitHub Stars](https://img.shields.io/github/stars/conorluddy/ContextPods?style=social)](https://github.com/conorluddy/ContextPods)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TurboRepo](https://img.shields.io/badge/built%20with-TurboRepo-blueviolet.svg)](https://turbo.build/)
[![Meta-MCP Server](https://img.shields.io/badge/Meta--MCP-Live-brightgreen.svg)](docs/META_MCP_GUIDE.md)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/conorluddy/ContextPods)
[![codecov](https://codecov.io/gh/conorluddy/ContextPods/graph/badge.svg?token=T7PABCGEO0)](https://codecov.io/gh/conorluddy/ContextPods)

> _The MCP development framework that creates MCP servers_

**Context-Pods** is a comprehensive development framework for creating, testing, and managing Model Context Protocol (MCP) servers. It provides a Meta-MCP Server that can generate other MCP servers through natural language descriptions or by wrapping existing scripts.

> [!WARNING]
> You might need to massage this a little with your own LLM to get it to work for you - I haven't had a chance to harden it yet. I'll come back to it very soon.

## 🚀 Quick Start

```bash
# Install and run Context-Pods CLI
npx @context-pods/create

# Or install globally
npm install -g @context-pods/cli
context-pods generate

# For developers: Use the convenient shell shortcut
git clone https://github.com/conorluddy/ContextPods.git
cd ContextPods
npm install && npm run build
./pods wizard  # Interactive setup with all features
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
    "validate-mcp", // Validate MCP compliance
    "analyze-codebase" // AI-powered MCP opportunity detection
  ]
}
```

### 🛠️ Advanced Features

- **AI-Powered Analysis** - Automatically identify MCP opportunities in existing codebases
- **TurboRepo Integration** - Optimized builds and caching
- **Hot Reloading** - Live development with automatic restarts
- **Comprehensive Testing** - Built-in MCP protocol compliance tests with 95%+ coverage
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

## 🤖 AI-Powered Codebase Analysis

Context-Pods includes an intelligent codebase analyzer that identifies functions in your existing code that would make excellent MCP tools. This feature helps you discover MCP opportunities and provides implementation guidance.

### How It Works

The analyzer uses a multi-phase approach:

1. **File Discovery** - Recursively scans your codebase with intelligent filtering
2. **AST Parsing** - Extracts function metadata using language-specific parsers
3. **Pattern Detection** - Identifies MCP-suitable patterns (API calls, file operations, etc.)
4. **Scoring Algorithm** - Ranks functions using a sophisticated scoring system (0-100)
5. **Template Matching** - Suggests the best template for each opportunity

### Supported Languages

- **TypeScript/JavaScript** - Full AST analysis with type information
- **Python** - AST-based function extraction (coming soon)
- **Rust/Go** - Pattern-based analysis (planned)
- **Shell** - Script pattern detection (planned)

### Usage Examples

```bash
# Basic analysis
context-pods analyze ./src

# With filtering and output options
context-pods analyze ./src --min-score 80 --format summary --max-results 5

# Language-specific analysis
context-pods analyze ./src --languages typescript,python

# Include test files
context-pods analyze ./src --include-tests
```

### Via Meta-MCP Server

```json
{
  "tool": "analyze-codebase",
  "arguments": {
    "path": "./src",
    "minScore": 70,
    "outputFormat": "detailed",
    "maxResults": 10
  }
}
```

### What It Detects

The analyzer identifies functions with:

- **API Integration Patterns** - HTTP clients, REST calls, GraphQL queries
- **File Processing Operations** - File I/O, data transformation, parsing
- **Database Interactions** - SQL queries, ORM operations, data validation
- **Utility Functions** - Data validation, formatting, conversion
- **External Service Integrations** - Third-party API usage

### Scoring Factors

Functions are scored based on:

- **Complexity** - Sweet spot is medium complexity (3-15 cyclomatic complexity)
- **Accessibility** - Exported functions score higher
- **Documentation** - Well-documented functions are preferred
- **Parameters** - Clear input parameters (1-5 params optimal)
- **Patterns** - Detected MCP-suitable patterns boost scores
- **Async Nature** - Async functions often perform useful I/O operations

### Sample Output

```
🎯 Top MCP Opportunities Found (Score: 85+)

📁 src/api/weather.ts
└── fetchWeatherData (Score: 92/100)
    ├── Category: API Integration
    ├── Template: typescript-advanced
    ├── Complexity: Medium (8 cyclomatic)
    ├── Patterns: HTTP calls, JSON parsing
    └── Reasoning:
        • Exported async function with clear parameters
        • Makes external API calls (confidence: 0.9)
        • Well-documented with TypeScript types
        • Optimal complexity for MCP tool

📁 src/utils/validator.ts
└── validateUserInput (Score: 88/100)
    ├── Category: Validation
    ├── Template: basic
    ├── Complexity: Low (4 cyclomatic)
    ├── Patterns: Zod validation, error handling
    └── Implementation Guidance:
        • Tool Name: validate-user-input
        • Input Schema: { data: object, rules: string[] }
        • Dependencies: zod, validator
        • Estimated Effort: Low
```

## 🔧 CLI Commands

Context-Pods provides a comprehensive command-line interface with enhanced interactive features and extensive help documentation.

### Quick Access

Use the convenient shell shortcut from the project root:

```bash
# Quick access without typing the full command
./pods --help
./pods generate typescript-basic --name my-server
./pods wizard  # Interactive setup
```

Or use the full CLI:

```bash
npx @context-pods/cli <command>
context-pods <command>  # If installed globally
```

### Core Commands

#### 🎯 **generate** - Create MCP servers from templates

```bash
# Interactive template selection
context-pods generate

# Quick generation with specific template
context-pods generate typescript-basic --name weather-api

# Advanced options
context-pods generate python-basic --name data-processor --output ./servers

# With template variables
context-pods generate rust-advanced --name file-manager --var "port=3001"

# Generate with MCP config file
context-pods generate --generate-mcp-config --config-name my-server
```

**Options:**

- `-n, --name <name>` - MCP server name (required)
- `-o, --output <path>` - Output directory
- `-d, --description <text>` - Server description
- `-f, --force` - Overwrite existing files
- `--var <key=value...>` - Template variables
- `--generate-mcp-config` - Generate .mcp.json config
- `--config-name <name>` - Name for MCP config
- `--command <command>` - Run command for server
- `--env <key=value...>` - Environment variables

#### 🔧 **wrap** - Convert existing scripts to MCP servers

```bash
# Basic script wrapping
context-pods wrap ./my-script.py --name python-tools

# With custom output location
context-pods wrap ./data-processor.js --name data-tools --output ./generated

# Include description
context-pods wrap ./backup.sh --name backup-server --description "Server for backup operations"
```

**Supported Script Types:**

- Python (`.py`) - Creates async MCP wrapper
- Shell (`.sh`, `.bash`) - Command-line MCP interface
- JavaScript (`.js`, `.mjs`) - Node.js MCP wrapper
- TypeScript (`.ts`) - Transpiled MCP wrapper
- Executable files - Generic command-line wrapper

**Options:**

- `-n, --name <name>` - MCP server name (required)
- `-t, --template <name>` - Template to use (auto-detected)
- `-o, --output <path>` - Output directory
- `-d, --description <text>` - Server description
- `-f, --force` - Overwrite existing files

#### 📋 **list** - Manage MCP servers

```bash
# Show active MCP servers
context-pods list

# Show all servers including inactive
context-pods list --all

# JSON output for scripting
context-pods list --format json
```

#### 📚 **templates** - Explore available templates

```bash
# Show available templates
context-pods templates

# Show all templates including custom ones
context-pods templates --all

# JSON format for integration
context-pods templates --format json
```

#### ⚙️ **init** - Initialize project configuration

```bash
# Interactive project setup
context-pods init

# Quick setup with name
context-pods init my-mcp-project

# With preferred template
context-pods init --template typescript-basic --description "My MCP project"
```

#### 🏥 **doctor** - System health checks and diagnostics

```bash
# Run all health checks
context-pods doctor

# Detailed information
context-pods doctor --verbose

# Automatically fix issues
context-pods doctor --fix
```

**Health Checks:**

- Node.js and npm versions
- Workspace structure integrity
- Package build status
- Template availability
- Git repository status
- Dependencies installation
- MCP server functionality

#### 🧙‍♂️ **wizard** - Interactive guided setup

```bash
# Full interactive wizard
context-pods wizard

# Skip welcome message
context-pods wizard --skip-intro
```

**Wizard Features:**

- **Server Generation** - Guided template selection with language preferences
- **Script Wrapping** - Step-by-step script conversion
- **Project Initialization** - Interactive configuration setup
- **Template Explorer** - Browse and preview available templates
- **Advanced Options** - Custom variables, output paths, and configurations

### Development Commands

#### 🚀 **dev** - Development mode with hot reloading

```bash
# Start development server
context-pods dev

# Custom port
context-pods dev --port 3001

# Disable hot reload
context-pods dev --no-hot-reload
```

#### 🔨 **build** - Build packages

```bash
# Build all packages
context-pods build

# Clean build
context-pods build --clean

# Build specific target
context-pods build my-server
```

#### 🧪 **test** - Run tests

```bash
# Run all tests
context-pods test

# With coverage
context-pods test --coverage

# Watch mode
context-pods test --watch
```

### Management Commands

#### 💾 **cache** - Cache management

```bash
# Clear all cache
context-pods cache clear

# Show cache statistics
context-pods cache stats

# Clean expired entries
context-pods cache clean
```

#### 🖥️ **server** - Meta-MCP Server management

```bash
# Start Meta-MCP Server
context-pods server start

# Development mode
context-pods server dev

# Check status
context-pods server status

# Stop server
context-pods server stop
```

#### ⚙️ **config** - Configuration management

```bash
# Show current configuration
context-pods config show

# Reset to defaults
context-pods config reset
```

### Advanced Features

#### 📊 **analyze** - AI-powered codebase analysis

```bash
# Basic analysis
context-pods analyze ./src

# High-value opportunities only
context-pods analyze ./src --min-score 80

# Quick summary
context-pods analyze ./src --format summary --max-results 5

# Language-specific
context-pods analyze ./src --languages typescript,python

# Include test files
context-pods analyze ./src --include-tests
```

#### ✅ **validate** - MCP compliance validation

```bash
# Basic validation
context-pods validate ./my-server

# Full validation including build
context-pods validate ./my-server --check-build

# Schema validation only
context-pods validate ./my-server --check-schema
```

### Help and Documentation

Every command includes comprehensive help with examples:

```bash
# Global help
context-pods --help

# Command-specific help
context-pods generate --help
context-pods wrap --help
context-pods wizard --help
```

### Shell Integration

The `./pods` shortcut provides enhanced output with colors and progress indicators:

```bash
./pods                    # Shows usage help
./pods doctor            # System diagnostics
./pods wizard            # Interactive setup
./pods generate --help   # Command help
```

### Scripting and Automation

Use JSON output for integration with other tools:

```bash
# Get server list as JSON
context-pods list --format json | jq '.servers[] | .name'

# Get template information
context-pods templates --format json | jq '.templates[] | select(.language=="typescript")'

# Health check automation
context-pods doctor --format json | jq '.summary'
```

## 🏗️ Architecture

Context-Pods uses a monorepo structure powered by TurboRepo:

```
context-pods/
├── packages/
│   ├── core/        # Core utilities, schemas, and codebase analysis
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

## 🧪 Test Coverage

Context-Pods maintains comprehensive test coverage across all packages:

### Coverage by Package

| Package                   | Coverage | Tests | Description                                        |
| ------------------------- | -------- | ----- | -------------------------------------------------- |
| `@context-pods/server`    | 95%+     | 287+  | MCP server tools, registry, and protocol handling  |
| `@context-pods/cli`       | 90%+     | 150+  | CLI commands, caching, and output formatting       |
| `@context-pods/core`      | 90%+     | 75+   | Template engine, language detection, and utilities |
| `@context-pods/testing`   | 95%+     | 45+   | MCP protocol compliance and script wrapper testing |
| `@context-pods/templates` | 85%+     | 25+   | Template validation and structure verification     |
| `@context-pods/create`    | 75%+     | 30+   | NPX runner and package installation                |

### Test Categories

- **Unit Tests** - Individual function and class testing
- **Integration Tests** - End-to-end workflow validation
- **Protocol Compliance** - MCP specification adherence
- **Template Validation** - Generated code quality assurance
- **Error Handling** - Resilience and recovery testing
- **Performance Tests** - Scalability and resource usage

### Quality Assurance

- **Pre-commit Hooks** - Automated linting, type-checking, and testing
- **CI/CD Pipeline** - Continuous testing on multiple Node.js versions
- **Coverage Tracking** - Minimum 80% coverage requirement
- **Mutation Testing** - Advanced test quality verification

Run tests locally:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific package tests
npm test --workspace=@context-pods/server

# Run integration tests
npm run test:e2e
```

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
