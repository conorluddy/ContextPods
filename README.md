# Context-Pods

[![GitHub Stars](https://img.shields.io/github/stars/conorluddy/ContextPods?style=social)](https://github.com/conorluddy/ContextPods)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TurboRepo](https://img.shields.io/badge/built%20with-TurboRepo-blueviolet.svg)](https://turbo.build/)
[![Meta-MCP Server](https://img.shields.io/badge/Meta--MCP-Live-brightgreen.svg)](docs/META_MCP_GUIDE.md)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/conorluddy/ContextPods)
[![codecov](https://codecov.io/gh/conorluddy/ContextPods/graph/badge.svg?token=T7PABCGEO0)](https://codecov.io/gh/conorluddy/ContextPods)

> _Where context creates context_

**Context-Pods** is a revolutionary **self-hosting MCP development suite** that uses the Model Context Protocol itself as the interface for creating, managing, and deploying other MCP servers. The **Meta-MCP Server is now LIVE** - enabling AI systems to create their own tools via natural language! 🚀

## 🧠 **The Core Concept**

Instead of manually coding MCP servers, Context-Pods enables natural language conversations that spawn complete, production-ready MCP servers:

```
Human: "I need an MCP server that can read PDF files and extract text"

Claude: I'll create a PDF processing MCP server for you!
*calls Context-Pods Meta-MCP create-mcp tool*

Result: ✅ Complete TypeScript MCP server with:
- PDF parsing tools (pdf-parse integration)
- Text extraction with error handling
- MCP protocol compliance
- Tests and documentation
- Ready to use immediately
```

**🎉 NEW: Meta-MCP Server is LIVE!** Connect Claude Desktop to Context-Pods and start creating MCP servers with natural language right now!

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

## 🎯 **Key Innovations**

### **1. Self-Bootstrapping System**

- The system creates and manages itself
- New templates emerge from successful patterns
- Continuous improvement through usage analytics

### **2. TurboRepo Integration**

- Blazing-fast builds with intelligent caching
- Efficient dependency management across pods
- Hot reloading for instant development feedback
- Parallel operations across multiple pods

### **3. AI-Powered Development**

- Natural language → working code
- Intelligent error diagnosis and fixing
- Code optimization suggestions
- Security vulnerability scanning

### **4. Production-Ready Output**

Every generated pod includes:

- Comprehensive error handling
- Security best practices
- Performance optimizations
- Complete test suites
- Docker configurations
- Deployment templates

## 🎯 **Current Implementation Status**

🎉 **REVOLUTIONARY MILESTONE ACHIEVED!** The Meta-MCP Server is now fully operational, enabling AI systems to create their own tools via natural language!

### ✅ **Completed Features**

#### **🚀 Meta-MCP Server (LIVE & PRODUCTION READY!)**

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
- **Template Engine Unit Tests** - 5 comprehensive tests for variable substitution functionality
- **GitHub Actions CI/CD** - Automated testing with Node.js 20.x, 22.x, 24.x matrix
- **Pre-commit Hooks** - Automated linting, type checking, building, and testing
- **Vitest Framework** - Fast unit testing with memfs for file system mocking

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

- **Variable Validation**: Zod-based schema validation with custom rules
- **File Processing**: Template substitution with mustache-style variables
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

## 🎉 **Ready to Experience the Future?**

**The Meta-MCP Server is live and ready for you to try right now!**

1. **⚡ 5-Minute Setup**: Clone, build, configure Claude Desktop
2. **🧠 Natural Language Creation**: Just describe what you need
3. **🚀 Instant Results**: Complete MCP servers in seconds
4. **🔧 Production Ready**: All servers work immediately

**[📖 Get Started with the Meta-MCP Server Guide →](docs/META_MCP_GUIDE.md)**

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

## 🎉 **What This Enables**

Context-Pods represents a **paradigm shift** in MCP development:

- **🏭 LLMs become MCP server factories** - describe what's needed, get a working server
- **⚡ Development velocity increases 10x** - from idea to working server in minutes
- **🛡️ Best practices are automatic** - every server follows security and performance standards
- **🧠 The system learns and improves** - templates get better with each use
- **🔗 Complex integrations become simple** - "Connect X to Y" just works

This is a **living, breathing MCP development organism** where context creates context, servers spawn servers, and the boundaries between human intent and AI capability dissolve into pure creative potential.

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

- **Template Development**: Create new language templates and specialized templates
- **Testing**: Add comprehensive tests for the template system
- **Documentation**: Improve examples and usage guides
- **CLI Tools**: Build command-line interface for template generation

### **Getting Started**

1. Check out [open issues](https://github.com/conorluddy/ContextPods/issues)
2. Review [PR #18](https://github.com/conorluddy/ContextPods/pull/18) for the latest template system
3. See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines

## 📄 **License**

MIT License - see [LICENSE](LICENSE) for details.

---

**Context-Pods**: Making the power of MCP accessible to anyone who can describe what they want! 🧬✨
