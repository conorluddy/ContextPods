# Context-Pods

[![GitHub Stars](https://img.shields.io/github/stars/conorluddy/ContextPods?style=social)](https://github.com/conorluddy/ContextPods)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TurboRepo](https://img.shields.io/badge/built%20with-TurboRepo-blueviolet.svg)](https://turbo.build/)
[![Meta-MCP Server](https://img.shields.io/badge/Meta--MCP-Live-brightgreen.svg)](docs/META_MCP_GUIDE.md)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/conorluddy/ContextPods)
[![codecov](https://codecov.io/gh/conorluddy/ContextPods/graph/badge.svg?token=T7PABCGEO0)](https://codecov.io/gh/conorluddy/ContextPods)

> _The comprehensive MCP development suite with advanced protocol features_

**Context-Pods** is a production-ready development framework for creating, testing, and managing Model Context Protocol (MCP) servers. Built with TypeScript and powered by TurboRepo, it provides everything from basic templates to advanced MCP protocol features including sampling/LLM integration, multi-modal content support, resource subscriptions, and comprehensive testing frameworks.

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

The Meta-MCP Server exposes Context-Pods functionality through the MCP protocol itself, providing 7 powerful tools:

```json
{
  "tools": [
    "create-mcp", // Generate MCP servers from templates
    "wrap-script", // Convert existing scripts to MCP servers
    "list-mcps", // List and manage existing MCP servers
    "validate-mcp", // Validate MCP protocol compliance
    "analyze-codebase" // AI-powered MCP opportunity detection
  ],
  "capabilities": {
    "tools": true,
    "resources": { "subscribe": true, "listChanged": true },
    "prompts": { "listChanged": true },
    "sampling": true,
    "roots": { "listChanged": true },
    "completion": { "wordCompletion": true, "lineCompletion": true }
  }
}
```

**Key Features:**

- **Server Generation** - Create production-ready MCP servers with advanced features
- **Script Wrapping** - Convert Python, Shell, TypeScript, and other scripts
- **Server Management** - List, validate, and manage existing MCP servers
- **AI Analysis** - Intelligent codebase analysis with AST parsing and pattern detection
- **Registry System** - SQLite-based server registry with metadata tracking
- **Template System** - 5 optimized templates with TurboRepo integration

### 🛠️ Advanced MCP Protocol Features

**Modern MCP SDK 1.17.4 Implementation:**

- **Sampling & LLM Integration** - Built-in LLM capabilities with model preferences and temperature control
- **Multi-Modal Content** - Support for text, images, audio, video, and embedded resources
- **Resource Subscriptions** - Real-time resource updates with subscription management
- **Roots Capability** - Secure file system navigation with sandboxed access
- **Completion Providers** - Auto-complete functionality for enhanced user experience
- **Progress Notifications** - Long-running operation tracking with real-time updates
- **Prompt Templates** - Dynamic prompt management with argument support

**Development & Quality Assurance:**

- **AI-Powered Analysis** - Automatically identify MCP opportunities in existing codebases
- **TurboRepo Optimization** - Advanced caching, hot reloading, and incremental builds
- **Comprehensive Testing** - 805+ tests across packages with 85-95%+ coverage
- **MCP Protocol Compliance** - Automated validation against official MCP schemas
- **Quality Gates** - Pre-commit hooks ensuring build, lint, type-check, and test success
- **Multi-Language Support** - TypeScript, Python, Rust, and Shell templates

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

Production-ready TypeScript server with complete MCP SDK 1.17.4 feature implementation:

**Advanced MCP Protocol Features:**

- **Sampling & LLM Integration** - Built-in AI capabilities with configurable models
- **Multi-Modal Content** - Text, image, audio, video, and embedded resource support
- **Resource Subscriptions** - Real-time updates with subscription management
- **Roots Capability** - Secure sandboxed file system access
- **Completion Providers** - Auto-complete functionality
- **Progress Notifications** - Long-running operation tracking
- **Prompt Templates** - Dynamic prompt management system

**Development Features:**

- **TurboRepo Optimization** - Hot reloading and intelligent caching
- **Comprehensive Utilities** - Data validation, file operations, error handling
- **Advanced Tools** - File, data, and utility tool categories
- **Schema Validation** - Zod-based runtime validation
- **Structured Logging** - Production-ready logging with Context-Pods logger
- **Testing Ready** - Built-in test structure and MCP compliance validation

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

Context-Pods provides a comprehensive command-line interface with **11 commands**, enhanced interactive features, and extensive help documentation.

### Complete Command Overview

| Command       | Purpose                           | Key Features                                              |
| ------------- | --------------------------------- | --------------------------------------------------------- |
| **generate**  | Create MCP servers from templates | 5 templates, interactive selection, MCP config generation |
| **wrap**      | Convert scripts to MCP servers    | Auto-detection, Python/Shell/TS/JS support                |
| **init**      | Initialize project configuration  | Interactive setup, template preferences                   |
| **list**      | Manage MCP servers                | Active/inactive status, JSON output                       |
| **templates** | Explore available templates       | Built-in and custom templates, detailed info              |
| **wizard**    | Interactive guided setup          | Step-by-step server creation, all features                |
| **doctor**    | System health diagnostics         | Dependency checks, auto-fix issues                        |
| **dev**       | Development mode                  | Hot reloading, custom ports, file watching                |
| **build**     | Build packages                    | Clean builds, TurboRepo optimization                      |
| **test**      | Run test suites                   | Coverage reports, watch mode, 805+ tests                  |
| **server**    | Meta-MCP server management        | Start/stop/status, development mode                       |

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

Context-Pods uses a TurboRepo monorepo structure with optimized caching and build pipelines:

```
context-pods/
├── packages/
│   ├── core/         # Core utilities, schemas, and AI-powered codebase analysis
│   ├── cli/          # Feature-rich CLI with 11 commands and interactive wizards
│   ├── templates/    # 5 production-ready templates (TypeScript, Python, Rust, Shell)
│   ├── testing/      # Comprehensive MCP protocol compliance testing framework
│   ├── server/       # Meta-MCP server with 7 tools for server management
│   └── create/       # npx create-context-pods runner
├── docs/             # Comprehensive documentation (12+ guides)
├── examples/         # Real-world usage examples and integrations
└── coverage/         # Test coverage reports and metrics
```

### Package Overview

| Package                     | Purpose                  | Key Features                                                 | Test Coverage   |
| --------------------------- | ------------------------ | ------------------------------------------------------------ | --------------- |
| **@context-pods/core**      | Core engine and analysis | Template processing, AI codebase analysis, schema validation | 160 tests, 90%+ |
| **@context-pods/cli**       | Command-line interface   | 11 commands, interactive wizards, TurboRepo integration      | 251 tests, 90%+ |
| **@context-pods/server**    | Meta-MCP server          | 7 tools, server registry, MCP protocol implementation        | 285 tests, 95%+ |
| **@context-pods/templates** | Template collection      | 5 languages, advanced MCP features, production-ready         | 91 tests, 85%+  |
| **@context-pods/testing**   | Testing framework        | Protocol compliance, wrapper testing, report generation      | Framework ready |
| **@context-pods/create**    | Package runner           | npx integration, dependency management, CLI bootstrapping    | 22 tests, 75%+  |

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

## 🧪 Testing Framework

Context-Pods includes a comprehensive testing framework with **805+ tests** across all packages:

### MCP Protocol Compliance Testing

Validate servers against official MCP specifications:

```typescript
import {
  MCPComplianceTestSuite,
  validateMCPServer,
  MCPMessageTestHarness,
} from '@context-pods/testing';

// Full compliance test suite
const suite = new MCPComplianceTestSuite('./my-server');
const results = await suite.runFullSuite();

// Individual compliance checks
const validation = await validateMCPServer('./my-server', {
  checkTools: true,
  checkResources: true,
  checkProtocol: true,
  timeout: 30000,
});

// Test harness for communication testing
const harness = new MCPMessageTestHarness({
  serverPath: './my-server',
  transport: 'stdio',
  timeout: 5000,
});

await harness.initialize();
const toolResult = await harness.callTool('my-tool', { input: 'test' });
```

### Script Wrapper Testing

Test wrapped scripts across multiple languages:

```typescript
import { testScriptWrapper } from '@context-pods/testing';

// Test Python script wrapper
const pythonResults = await testScriptWrapper('./script.py', {
  language: 'python',
  testCases: [{ input: { data: 'test' }, expectedOutput: 'processed' }],
});

// Test shell script wrapper
const shellResults = await testScriptWrapper('./script.sh', {
  language: 'shell',
  testEnvironment: { NODE_ENV: 'test' },
});
```

### Test Categories

- **Unit Tests** - Individual function and class testing (599+ tests)
- **Integration Tests** - End-to-end workflow validation (156+ tests)
- **Protocol Compliance** - MCP specification adherence (50+ tests)
- **Template Validation** - Generated code quality assurance
- **Performance Tests** - Scalability and resource usage benchmarks
- **Error Handling** - Resilience and recovery testing

## 📚 Documentation

- [Getting Started Guide](docs/getting-started.md)
- [Meta-MCP Server Guide](docs/META_MCP_GUIDE.md)
- [Template Development](docs/templates.md)
- [Testing Framework](docs/testing.md)
- [API Reference](docs/api-reference.md)

## 🧪 Test Coverage & Quality Assurance

Context-Pods maintains exceptional test coverage with **805+ total tests** across all packages:

### Coverage by Package

| Package                   | Coverage  | Tests | Focus Areas                                               |
| ------------------------- | --------- | ----- | --------------------------------------------------------- |
| `@context-pods/server`    | 95%+      | 285   | MCP protocol implementation, tools, registry, validation  |
| `@context-pods/cli`       | 90%+      | 251   | All 11 CLI commands, caching, TurboRepo integration       |
| `@context-pods/core`      | 90%+      | 160   | Template engine, AI analysis, schema validation           |
| `@context-pods/templates` | 85%+      | 91    | Template validation, MCP feature coverage, SDK compliance |
| `@context-pods/create`    | 75%+      | 22    | NPX runner, dependency management, error handling         |
| `@context-pods/testing`   | Framework | Ready | MCP compliance testing, wrapper validation                |

### Test Categories

- **Unit Tests** - Individual function and class testing
- **Integration Tests** - End-to-end workflow validation
- **Protocol Compliance** - MCP specification adherence
- **Template Validation** - Generated code quality assurance
- **Error Handling** - Resilience and recovery testing
- **Performance Tests** - Scalability and resource usage

### Quality Gates & Standards

**All quality gates must pass before any commit:**

1. **Build** (`npm run build`) - All 6 packages compile successfully
2. **Type Check** (`npm run type-check`) - Strict TypeScript validation
3. **Lint** (`npm run lint`) - Zero ESLint errors across all files
4. **Format** (`npm run format`) - Consistent code formatting
5. **Test** (`npm run test`) - All 805+ tests pass

**Additional Quality Features:**

- **TurboRepo Caching** - Intelligent build and test result caching
- **Pre-commit Hooks** - Automated quality gate enforcement
- **MCP Protocol Validation** - Schema compliance testing against official specs
- **Template Integrity** - Generated code quality assurance
- **Performance Benchmarks** - Build time and execution optimization

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

# Install dependencies (uses npm workspaces)
npm install

# Build all packages (TurboRepo optimized)
npm run build

# Run comprehensive test suite (805+ tests)
npm test

# Start development with hot reloading
npm run dev

# Quick access via shell shortcut
./pods --help
./pods wizard  # Interactive setup
```

**Quality Development Commands:**

```bash
# Run all quality gates
npm run lint && npm run type-check && npm test

# Clean build (clears TurboRepo cache)
npm run clean && npm run build

# Generate coverage reports
npm run test:coverage

# MCP server development and testing
npm run mcp:start    # Start Meta-MCP server
npm run mcp:test     # Test MCP connection
npm run mcp:status   # Check server status
```

## 📈 Roadmap

**Current Status:** Production-ready MCP development framework with advanced protocol features

**Upcoming Enhancements:**

- [ ] **Additional Language Templates** - Go, Ruby, Java support
- [ ] **Visual Template Builder** - Web-based template customization interface
- [ ] **MCP Server Marketplace** - Community template and server sharing
- [ ] **Cloud Deployment** - AWS Lambda, Vercel, and Docker deployment options
- [ ] **Advanced Analytics** - Performance profiling and usage analytics
- [ ] **Extended Transport Support** - HTTP, WebSocket, and GraphQL transports
- [ ] **IDE Extensions** - VS Code, JetBrains integration for enhanced developer experience

**Recently Completed (v0.1.10):**

- ✅ **MCP SDK 1.17.4** - Full modern MCP protocol implementation
- ✅ **Advanced Protocol Features** - Sampling, multi-modal, subscriptions, roots, completion
- ✅ **Comprehensive Testing** - 805+ tests with 85-95%+ coverage across packages
- ✅ **Quality Gates** - Pre-commit hooks, automated CI/CD, strict TypeScript
- ✅ **AI-Powered Analysis** - Intelligent codebase analysis with AST parsing
- ✅ **TurboRepo Optimization** - Advanced caching, hot reloading, incremental builds

## 📄 License

MIT © [Conor Luddy](https://github.com/conorluddy)

## 🙏 Acknowledgments

Built with the [Model Context Protocol SDK v1.17.4](https://github.com/anthropics/model-context-protocol) by Anthropic.

**Core Technologies:**

- **TypeScript** - Type-safe development with strict compiler settings
- **TurboRepo** - Advanced monorepo management with intelligent caching
- **Vitest** - Fast, modern testing framework with comprehensive coverage
- **Zod** - Runtime type validation and schema generation
- **SQLite** - Lightweight database for server registry management

## 📊 Project Stats

- **Total Lines of Code:** 25,000+ (production code)
- **Test Files:** 805+ comprehensive tests across all packages
- **Templates:** 5 production-ready templates (TypeScript, Python, Rust, Shell)
- **CLI Commands:** 11 comprehensive commands with interactive wizards
- **MCP Tools:** 7 powerful tools in the Meta-MCP server
- **Documentation:** 12+ comprehensive guides and API references
- **Quality Gates:** 5 automated checks (build, type-check, lint, format, test)

---

<p align="center">
  <strong>Context-Pods: The complete MCP development suite</strong><br/>
  <i>From concept to production-ready MCP servers</i>
</p>
