# Context-Pods

[![GitHub Stars](https://img.shields.io/github/stars/conorluddy/ContextPods?style=social)](https://github.com/conorluddy/ContextPods)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TurboRepo](https://img.shields.io/badge/built%20with-TurboRepo-blueviolet.svg)](https://turbo.build/)
[![Meta-MCP Server](https://img.shields.io/badge/Meta--MCP-Live-brightgreen.svg)](docs/META_MCP_GUIDE.md)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/conorluddy/ContextPods)
[![codecov](https://codecov.io/gh/conorluddy/ContextPods/graph/badge.svg?token=T7PABCGEO0)](https://codecov.io/gh/conorluddy/ContextPods)

> _Where context creates context_

> 💬 **TL;DR**: _"Context-Pods: An MCP server that creates other MCP servers. Describe what you need in plain language, get a complete, tested MCP server in minutes. Supports TypeScript, Python, Rust, and Shell. Like npm init, but for MCP servers."_

**Context-Pods** is a meta-MCP development framework that streamlines the creation and management of Model Context Protocol (MCP) servers. By exposing MCP server generation through the MCP protocol itself, it enables developers and AI systems to create production-ready MCP servers through natural language descriptions or by wrapping existing scripts.

## 🧠 **The Core Concept**

Context-Pods provides a programmatic interface for MCP server generation through the MCP protocol itself. This meta-approach allows both developers and AI systems to create new MCP servers by:

1. **Natural Language Description**: Describe the desired functionality, and Context-Pods generates appropriate MCP server code
2. **Script Wrapping**: Convert existing scripts (Python, TypeScript, Rust, Shell) into MCP-compliant servers
3. **Template-Based Generation**: Use pre-built templates optimized for different languages and use cases

**Example workflow:**

```
Request: "I need an MCP server that can read PDF files and extract text"

Context-Pods generates:
- Complete TypeScript MCP server with PDF parsing capabilities
- Proper error handling and input validation
- MCP protocol compliance with tool definitions
- Unit tests and documentation
- Package configuration for immediate use
```

The Meta-MCP Server is available for integration with Claude Desktop, Cody, Continue, and other MCP-compatible clients.

## 🏗️ **The Architecture**

### **🚀 Meta-MCP Server **

The revolutionary **Meta-MCP Server** exposes Context-Pods functionality via the MCP protocol itself - enabling AI systems to create their own tools:

**🔧 Live MCP Tools:**

- `create-mcp` - Generate new MCP servers from natural language descriptions
- `wrap-script` - Convert existing scripts into MCP servers
- `list-mcps` - Show all managed MCP servers with status
- `validate-mcp` - Validate MCP servers against standards

**📋 Live MCP Resources:**

- `context-pods://templates/` - Available templates with metadata
- `context-pods://mcps/` - All managed MCP servers
- `context-pods://status` - System status and health
- `context-pods://statistics` - Usage statistics and analytics

**⚡ Ready for Production:**

- ✅ **Full MCP Protocol Compliance** - Works with Claude Desktop, Cody, Continue
- ✅ **Error Handling & Logging** - Production-ready reliability
- ✅ **CLI Integration** - `context-pods server start|stop|status|test`
- ✅ **Development Tools** - Hot reloading, debug modes, testing scripts

### **🌱 Generated Ecosystem**: The Pod Garden

Each conversation creates new MCP servers that become part of your growing ecosystem:

```
generated/
├── pdf-processor/        # "I need PDF processing" → Complete PDF MCP server
├── postgresql-manager/   # "Connect to PostgreSQL" → Database MCP server
├── stripe-integration/   # "Wrap the Stripe API" → Payments MCP server
└── file-operations/      # "Local file operations" → File management MCP server
```

**All generated servers are:**

- 🔧 **Immediately usable** - Ready to connect to any MCP client
- 📦 **Self-contained** - Complete with dependencies, tests, docs
- 🔄 **Hot-reloadable** - Changes reflect instantly during development
- 🏗️ **TurboRepo optimized** - Fast builds and coordinated development

## 🚀 **Real Usage Scenarios**

### **Scenario 1: Rapid Prototyping**

```
Developer: "I need to connect to my company's Slack workspace and create channels"

Context-Pods:
1. Analyzes the request
2. Generates a complete Slack MCP server
3. Sets up authentication handling
4. Creates tools for channel management
5. Adds proper error handling and logging
6. Runs tests automatically
7. Server is ready to use in minutes
```

### **Scenario 2: Iterative Development**

```
Developer: "Add the ability to read message history to my Slack server"

Context-Pods:
1. Modifies existing Slack server
2. Adds new tools for message retrieval
3. Updates tests and documentation
4. Preserves existing functionality
5. Hot-reloads the updated server
```

### **Scenario 3: Enterprise Integration**

```
Developer: "Create a server that connects our CRM, email system, and project management tools"

Context-Pods:
1. Generates a multi-integration server
2. Sets up secure authentication for each service
3. Creates unified tools that work across systems
4. Implements proper error handling and retries
5. Adds monitoring and logging
6. Generates deployment configurations
```

## 🎯 **Key Technical Features**

### **1. Self-Hosting Architecture**

- Context-Pods can generate and manage its own infrastructure
- Template system supports iterative improvements
- Registry tracks all generated servers with metadata

### **2. Build System Optimization**

- TurboRepo integration for efficient monorepo management
- Intelligent caching reduces build times
- Hot reloading support for development workflows
- Parallel task execution across multiple packages

### **3. Template-Based Generation**

- Language-specific templates (TypeScript, Python, Rust, Shell)
- Variable substitution with validation
- Automatic dependency resolution
- Pre-flight checks ensure valid output

### **4. Production Considerations**

Generated servers include:

- Error handling with appropriate MCP error codes
- Input validation using Zod schemas
- Structured logging for debugging
- Test suites with MCP protocol compliance checks
- Configuration files for various deployment targets
- Documentation generated from code structure

## 🎯 **Current Implementation Status**

The Meta-MCP Server is fully operational and can be used to generate MCP servers through natural language descriptions or script wrapping.

### ✅ **Completed Features**

#### **Meta-MCP Server**

- **✅ Full MCP Protocol Implementation** - Complete MCP server using official SDK
- **✅ All Core Tools Operational** - create-mcp, wrap-script, list-mcps, validate-mcp
- **✅ Complete Resource System** - Templates, servers, status, statistics via MCP protocol
- **✅ Multi-Client Support** - Claude Desktop, Cody, Continue, custom integrations
- **✅ Production Infrastructure** - Error handling, logging, graceful shutdown, process management
- **✅ CLI Integration** - Full server management via `context-pods server` commands
- **✅ Development Tools** - Hot reloading, testing scripts, status monitoring
- **✅ Comprehensive Documentation** - Setup guides, examples, troubleshooting

#### **Foundation Layer**

- **TurboRepo Infrastructure** ([#3](https://github.com/conorluddy/ContextPods/issues/3)) - Complete monorepo setup with optimized builds
- **Core MCP Server** - Base infrastructure for the Context-Pods ecosystem

#### **Template System** ([#4](https://github.com/conorluddy/ContextPods/issues/4)) - **✅ COMPLETE**

- **Node.js Primary Template System** with full TurboRepo optimization
- **Intelligent Template Selection** with automatic language detection
- **Multi-Language Support** (TypeScript, Python, Rust, Shell)
- **Advanced TypeScript Templates** leveraging Context-Pods utilities
- **Template Processing Engine** with variable validation and substitution

#### **Testing & Validation Framework** ([#6](https://github.com/conorluddy/ContextPods/issues/6), [#23](https://github.com/conorluddy/ContextPods/issues/23)) - **✅ COMPLETE**

- **Comprehensive Testing Framework** - Complete `@context-pods/testing` package for MCP server validation
- **MCP Protocol Compliance Testing** - Full validation against MCP standards using Zod schemas
- **Script Wrapper Testing** - Multi-language script testing (TypeScript, Python, Rust, Shell)
- **Test Harness** - Communication testing for MCP servers via stdio transport
- **Report Generation** - HTML and JUnit XML report generators for CI/CD integration
- **Template Engine Unit Tests** - 33 comprehensive tests for template generation, validation, and file operations
- **GitHub Actions CI/CD** - Automated testing with Node.js 20.x, 22.x, 24.x matrix
- **Pre-commit Hooks** - Automated linting, type checking, building, and testing
- **Vitest Framework** - Fast unit testing with memfs for file system mocking

#### **Template Generation Fixes** ([#51](https://github.com/conorluddy/ContextPods/issues/51)) - **✅ COMPLETE**

- **Enhanced Variable Validation** - Fixed array validation to properly check individual elements
- **Standalone Templates** - Removed workspace dependencies for truly portable templates
- **Complete Utility Files** - Added missing validation.ts and helpers.ts with ES module support
- **Self-Contained TypeScript Config** - Templates now have independent tsconfig.json files
- **Improved Error Messages** - Multi-line, actionable error messages guide users to solutions
- **Pre-flight Validation** - Checks template integrity before processing begins
- **Comprehensive Documentation** - Added 7 new documentation files covering all aspects:
  - [Template Variables](docs/TEMPLATE_VARIABLES.md) - Complete variable reference
  - [Usage Examples](docs/USAGE_EXAMPLES.md) - Real-world scenarios
  - [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
  - [Migration Guide](docs/MIGRATION_GUIDE.md) - Upgrading existing servers
  - [Template Development](docs/TEMPLATE_DEVELOPMENT.md) - Creating custom templates
  - [Quick Reference](docs/QUICK_REFERENCE.md) - Command cheat sheet
- **Extensive Test Coverage** - 33 tests ensure reliability across all scenarios

### 🏗️ **Template Architecture**

#### **Primary Templates (TurboRepo Optimized)**

```
templates/
├── basic/                    # Enhanced basic TypeScript template
├── typescript-advanced/      # Full-featured template with utilities
└── python-basic/            # Self-contained Python template
```

**Features:**

- **Fast Generation**: Template processing with build caching
- **Hot Reloading**: Development mode with instant feedback
- **Shared Dependencies**: Leverage @context-pods/core utilities
- **Type Safety**: Full TypeScript support with proper definitions
- **Language Detection**: Automatic template selection based on script analysis

#### **Template Capabilities**

- **Variable Validation**: Zod-based schema validation with array element checking
- **File Processing**: Template substitution with mustache-style variables
- **Pre-flight Checks**: Validates template integrity before processing
- **Enhanced Error Messages**: Multi-line guidance with examples and allowed values
- **Standalone Operation**: Templates work independently without workspace dependencies
- **ES Module Support**: Full compatibility with import.meta.url and .js extensions
- **Optimization Paths**: Different strategies for TurboRepo vs self-contained packages
- **Scoring System**: Intelligent template matching based on criteria

### 🔄 **Development Roadmap**

| Phase            | Status          | Focus                          | Issues                                                                                                                     |
| ---------------- | --------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **Foundation**   | ✅ **COMPLETE** | TurboRepo setup, Core Pod      | [#2](https://github.com/conorluddy/ContextPods/issues/2), [#3](https://github.com/conorluddy/ContextPods/issues/3)         |
| **Generation**   | ✅ **COMPLETE** | Template system, CLI tools     | [#4](https://github.com/conorluddy/ContextPods/issues/4) ✅, [#5](https://github.com/conorluddy/ContextPods/issues/5) ✅   |
| **Meta-MCP**     | ✅ **COMPLETE** | MCP Server Interface           | [#22](https://github.com/conorluddy/ContextPods/issues/22) ✅                                                              |
| **Testing**      | ✅ **COMPLETE** | Testing & Validation Framework | [#6](https://github.com/conorluddy/ContextPods/issues/6) ✅, [#23](https://github.com/conorluddy/ContextPods/issues/23) ✅ |
| **Management**   | 🚀 **NEXT**     | Pod modification, Deployment   | [#7](https://github.com/conorluddy/ContextPods/issues/7), [#12](https://github.com/conorluddy/ContextPods/issues/12)       |
| **Scale**        | 📋 **PLANNED**  | Orchestration, Deployment      | [#12](https://github.com/conorluddy/ContextPods/issues/12), [#16](https://github.com/conorluddy/ContextPods/issues/16)     |
| **Intelligence** | 📋 **PLANNED**  | AI optimization, Polish        | [#15](https://github.com/conorluddy/ContextPods/issues/15), [#11](https://github.com/conorluddy/ContextPods/issues/11)     |

> 📋 **Track Progress**: [View all issues](https://github.com/conorluddy/ContextPods/issues) | [Active PR #18](https://github.com/conorluddy/ContextPods/pull/18)

## 🏗️ **Current Technical Architecture**

### **Core Packages**

```
packages/
├── core/                    # @context-pods/core
│   ├── template-engine.ts   # Template processing with optimization
│   ├── template-selector.ts # Intelligent template selection
│   ├── types.ts            # Enhanced metadata schemas
│   └── schemas.ts          # Zod validation schemas
├── server/                 # @context-pods/server (MCP server)
└── testing/                # @context-pods/testing (Testing framework)
    ├── protocol/           # MCP protocol validation
    ├── wrappers/          # Script wrapper testing
    ├── utils/             # Test runners and reporters
    └── types.ts           # Testing framework types
```

### **Template System**

- **DefaultTemplateEngine**: Processes templates with variable substitution
- **TemplateSelector**: Automatic language detection and scoring
- **Enhanced Metadata**: Optimization flags, validation rules, file definitions
- **Multi-Language Support**: TypeScript (optimized), Python, Rust, Shell

### **Testing & Validation Framework**

- **MCPComplianceTestSuite**: Complete MCP protocol validation using official schemas
- **ScriptWrapperTester**: Multi-language script wrapper testing infrastructure
- **MCPMessageTestHarness**: Communication testing for MCP servers via stdio transport
- **ReportGenerator**: HTML and JUnit XML report generation for CI/CD integration
- **ParameterValidator**: Validation of script parameter passing and type conversion
- **OutputValidator**: Validation of script outputs in various formats (JSON, CSV, XML, YAML)

### **Key Features Implemented**

- ✅ **TurboRepo Optimization** for Node.js/TypeScript templates
- ✅ **Language Detection** from file extensions and content analysis
- ✅ **Template Scoring** based on optimization preferences
- ✅ **Variable Validation** with custom rules and patterns
- ✅ **Build Caching** and hot reloading support
- ✅ **Multi-Language Architecture** with self-contained packages
- ✅ **Context-Pods Utilities Integration** for advanced templates
- ✅ **Comprehensive Testing Framework** - Complete MCP server validation toolkit
- ✅ **Protocol Compliance Testing** - Automated validation against MCP standards
- ✅ **Multi-Language Script Testing** - TypeScript, Python, Rust, Shell support
- ✅ **CI/CD Pipeline** with GitHub Actions and Node.js matrix testing

### **🎯 Key Innovations Delivered**

#### **1. Dual-Path Architecture**

- **TurboRepo Optimized**: TypeScript/Node.js templates get first-class treatment with shared dependencies, fast builds, and hot reloading
- **Self-Contained**: Python, Rust, Shell templates work independently with native tooling

#### **2. Intelligent Template Selection**

- **Automatic Language Detection**: Analyzes file extensions and content to suggest optimal templates
- **Scoring Algorithm**: Ranks templates based on optimization preferences, language match, and complexity requirements
- **Context-Aware Recommendations**: Prefers TypeScript for Node.js projects to maximize TurboRepo benefits

#### **3. Production-Ready Templates**

- **Advanced TypeScript Template**: Full MCP server with structured tools, resources, and utilities
- **Context-Pods Integration**: Leverages shared logger, error handling, and validation from core package
- **Comprehensive Metadata**: Enhanced schemas with optimization flags, validation rules, and dependency management

## 🚀 **Quick Start - Meta-MCP Server**

**🎉 The revolutionary Meta-MCP Server is ready to use!** Connect to Claude Desktop and start creating MCP servers with natural language:

### **Step 1: Setup Context-Pods**

```bash
# Clone the repository
git clone https://github.com/conorluddy/ContextPods.git
cd ContextPods

# Install dependencies and build
npm install
npm run build

# Setup pre-commit hooks (automatically runs after npm install)
# Pre-commit hooks enforce code quality with linting, type checking, building, and testing

# Run tests to verify everything works
npm test
# ✅ All tests pass: Template engine tests, CI/CD validation

# Verify everything is ready
npm run mcp:status
# ✅ Status: READY - The Meta-MCP Server is ready to run!
```

### **Development Workflow**

Context-Pods includes pre-commit hooks that automatically enforce code quality:

- **Linting**: ESLint with auto-fix for staged files
- **Formatting**: Prettier auto-formatting for staged files
- **Type Checking**: Full TypeScript validation
- **Building**: Ensures all packages build successfully
- **Testing**: Runs the complete test suite

**Bypassing hooks** (emergency use only):

```bash
git commit --no-verify -m "Emergency commit"
```

### **Step 2: Connect to Claude Desktop**

Add this to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

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

### **Step 3: Start Creating MCP Servers!**

Now you can create MCP servers by simply asking Claude:

```
Human: "I need an MCP server that can interact with a PostgreSQL database"

Claude: I'll create a PostgreSQL MCP server for you!
*calls Context-Pods create-mcp tool*
→ ✅ Complete postgresql-manager server created
→ 🔧 Database connection tools
→ 📝 Query execution with parameterization
→ 🛡️ Connection pooling and error handling
→ 📚 Complete documentation and tests
```

**🎯 That's it!** You're now using AI to create AI tools!

---

## 🎉 **Getting Started**

**Quick setup to start using Context-Pods:**

1. **Setup** - Clone repository, install dependencies, build packages
2. **Configure** - Add to Claude Desktop or other MCP client configuration
3. **Create** - Describe the MCP server you need or wrap an existing script
4. **Use** - Connect the generated server to your MCP client

**[📖 Detailed Setup Guide →](docs/META_MCP_GUIDE.md)**

---

### **Alternative: CLI Tools & Development**

**For advanced users or development:**

```bash
# Use the CLI to create servers directly
npx @context-pods/cli generate my-server --template typescript-advanced

# Wrap an existing script into an MCP server
npx @context-pods/cli wrap ./my-script.py --name my-python-server

# Manage the Meta-MCP Server
npx @context-pods/cli server start     # Start the server
npx @context-pods/cli server status    # Check status
npx @context-pods/cli server test      # Test connection

# Development mode with hot reloading
npm run mcp:dev
```

**NPM Packages**

All Context-Pods packages are published to npm:

- [@context-pods/core](https://www.npmjs.com/package/@context-pods/core) - Core utilities and template engine
- [@context-pods/cli](https://www.npmjs.com/package/@context-pods/cli) - Command-line interface
- [@context-pods/server](https://www.npmjs.com/package/@context-pods/server) - MCP server implementation
- [@context-pods/testing](https://www.npmjs.com/package/@context-pods/testing) - Testing framework

```bash
# Install individual packages
npm install @context-pods/server
npm install @context-pods/cli

# Or install all packages
npm install @context-pods/core @context-pods/cli @context-pods/server @context-pods/testing
```

**Releases**

Context-Pods follows semantic versioning and releases are automated through GitHub Releases. See [RELEASE.md](RELEASE.md) for the release process.

**📖 Complete Documentation:**

- [Quick Reference](docs/QUICK_REFERENCE.md) - Common commands and quick fixes
- [Meta-MCP Server Guide](docs/META_MCP_GUIDE.md) - Detailed usage and examples
- [Template Variables Documentation](docs/TEMPLATE_VARIABLES.md) - All supported variables and validation rules
- [Usage Examples](docs/USAGE_EXAMPLES.md) - Real-world scenarios and integration examples
- [Template Development Guide](docs/TEMPLATE_DEVELOPMENT.md) - Create your own custom templates
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Migration Guide](docs/MIGRATION_GUIDE.md) - Upgrade existing servers and templates
- [MCP Client Setup](docs/MCP_CLIENT_SETUP.md) - Configuration for all MCP clients
- [Architecture Guide](docs/ARCHITECTURE.md) - Technical implementation details

### **Using the Template System**

```typescript
import { TemplateSelector, DefaultTemplateEngine } from '@context-pods/core';

// Create template selector
const selector = new TemplateSelector('./templates');

// Auto-detect language and get recommendations
const suggestions = await selector.getTemplateSuggestions('./my-script.ts');

// Process template with variables
const engine = new DefaultTemplateEngine();
const result = await engine.process(template, {
  variables: { serverName: 'my-server', serverDescription: 'My MCP server' },
  outputPath: './output',
  templatePath: './templates/typescript-advanced',
  optimization: { turboRepo: true, hotReload: true },
});
```

### **Using the Testing Framework**

```typescript
import {
  MCPComplianceTestSuite,
  ScriptWrapperTester,
  ReportGenerator,
} from '@context-pods/testing';

// Test MCP server compliance
const complianceSuite = new MCPComplianceTestSuite('./my-mcp-server', true);
const complianceResults = await complianceSuite.runFullSuite();

// Test script wrapper functionality
const wrapperTester = new ScriptWrapperTester({
  scriptPath: './my-script.py',
  language: 'python',
  testCases: [
    {
      name: 'Basic Execution',
      input: { param1: 'value1' },
      expectedOutput: { result: 'processed_value1' },
    },
  ],
});
const wrapperResults = await wrapperTester.runTests();

// Generate test reports
const htmlReport = ReportGenerator.generateHTML({
  suites: [complianceResults, wrapperResults],
  totalTests: 25,
  totalPassed: 23,
  totalFailed: 2,
  totalSkipped: 0,
  duration: 5000,
  success: false,
});
```

## 🎉 **Benefits and Use Cases**

Context-Pods simplifies MCP development by:

- **Reducing Development Time** - Generate working MCP servers in minutes instead of hours
- **Ensuring Consistency** - All generated servers follow MCP best practices and standards
- **Lowering Barrier to Entry** - No deep MCP protocol knowledge required to create servers
- **Supporting Multiple Languages** - Work with your preferred programming language
- **Enabling Rapid Prototyping** - Quickly test ideas and iterate on functionality

**Common Use Cases:**

- Wrapping existing CLI tools as MCP servers
- Creating API integrations (databases, web services, file systems)
- Building custom tools for specific workflows
- Prototyping new MCP capabilities
- Learning MCP development through generated examples

## 🔮 **What's Next**

### **Immediate Priorities**

1. **Pod Management** ([#6](https://github.com/conorluddy/ContextPods/issues/6), [#7](https://github.com/conorluddy/ContextPods/issues/7)) - Modify and validate existing MCP servers
2. **Extended Testing** - Expand test coverage to remaining checkpoints (1.2, 1.3, 2.0+)
3. **Script Analysis** ([#15](https://github.com/conorluddy/ContextPods/issues/15)) - Auto-wrapping existing scripts as MCP servers

### **Template System Enhancements**

- **More Language Templates**: Rust, Go, Java templates
- **Specialized Templates**: Database connectors, API wrappers, file processors
- **Template Composition**: Combining multiple templates for complex servers
- **Hot Reloading**: Live template development with instant feedback

### **Integration Goals**

- **Natural Language Interface**: "Create a PDF processor" → working MCP server
- **IDE Extensions**: VS Code integration for seamless development
- **Cloud Deployment**: One-click deployment to various platforms

## 🤝 **Contributing**

We're building the future of AI-integrated development!

### **Current Focus Areas**

- **Template Development**: Create new language templates (Rust, Go, Java) and specialized templates
- **Pod Management**: Implement modification and deployment tools for existing MCP servers
- **Script Analysis**: Auto-wrapping existing scripts as MCP servers
- **Cloud Deployment**: One-click deployment to various platforms

### **Getting Started**

1. Check out [open issues](https://github.com/conorluddy/ContextPods/issues)
2. Review [PR #18](https://github.com/conorluddy/ContextPods/pull/18) for the latest template system
3. See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines

## 📄 **License**

MIT License - see [LICENSE](LICENSE) for details.

---

**Context-Pods**: Simplifying MCP server development through template-based generation and natural language interfaces.
