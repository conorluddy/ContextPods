# Context-Pods Architecture

## Overview

Context-Pods is designed as a monorepo using npm workspaces to manage multiple packages, templates, and examples. The architecture emphasizes simplicity, modularity, and ease of use for generating MCP servers from templates.

## Directory Structure

```
ContextPods/
├── packages/               # Core packages
│   └── core/              # Core utilities and types
│       ├── src/           # Source code
│       │   ├── errors.ts  # Custom error classes
│       │   ├── logger.ts  # Logging utilities
│       │   ├── types.ts   # TypeScript type definitions
│       │   ├── schemas.ts # Zod validation schemas
│       │   └── index.ts   # Main exports
│       ├── tests/         # Unit tests
│       ├── package.json   # Package configuration
│       └── tsconfig.json  # TypeScript configuration
│
├── templates/             # MCP server templates
│   └── basic/            # Basic template example
│       ├── src/          # Template source files
│       ├── template.json # Template metadata and configuration
│       ├── package.json  # Template package.json (with variables)
│       └── README.md     # Template documentation
│
├── examples/             # Example pods and usage demonstrations
│   └── hello-world/     # Example of generated pod
│
├── docs/                # Documentation
│   └── ARCHITECTURE.md  # This file
│
├── package.json         # Root package configuration
├── tsconfig.json        # Root TypeScript configuration
├── .eslintrc.json       # ESLint configuration
├── .prettierrc.json     # Prettier configuration
├── CONTRIBUTING.md      # Contribution guidelines
└── README.md           # Project overview
```

## Core Concepts

### 1. Packages

Packages contain reusable code that can be shared across the project:

- **@context-pods/core**: Core utilities including error handling, logging, type definitions, and schema validation

Future packages might include:
- **@context-pods/cli**: Command-line interface for generating pods
- **@context-pods/generator**: Template processing and code generation engine

### 2. Templates

Templates are the blueprints for generating MCP servers:

- Each template is a directory containing the structure of an MCP server
- Templates use variable substitution (e.g., `{{serverName}}`)
- A `template.json` file defines metadata and available variables
- Templates can include any file type needed for an MCP server

### 3. Examples

Examples demonstrate:
- How templates work
- Generated pod structures
- Best practices for MCP server development

## Build System

### TypeScript Configuration

- **Composite Projects**: Uses TypeScript project references for efficient builds
- **Strict Mode**: Enforces type safety across all packages
- **ES Modules**: Uses modern JavaScript modules (ESM)

### npm Workspaces

Benefits:
- Shared dependencies are hoisted to root
- Easy cross-package development
- Unified build and test commands
- Simplified dependency management

### Scripts

Root-level scripts orchestrate workspace operations:
- `npm run build`: Builds all packages
- `npm run test`: Runs tests across all packages
- `npm run lint`: Lints all TypeScript files
- `npm run format`: Formats code with Prettier

## Development Workflow

1. **Template Creation**: Define new templates in `templates/` directory
2. **Code Generation**: Process templates with variable substitution
3. **Pod Output**: Generated pods can be placed anywhere
4. **Distribution**: Pods can be injected into any repository

## Design Principles

### Simplicity First
- Minimal dependencies
- Clear, understandable code
- Straightforward template system

### Developer Experience
- Clear error messages
- Comprehensive logging
- Well-documented APIs

### Extensibility
- Modular architecture
- Plugin-friendly design
- Template system allows any MCP pattern

### Production Ready
- Generated servers follow MCP best practices
- Proper error handling
- TypeScript for type safety

## Future Enhancements

As the project grows, the architecture supports:

1. **Multiple Template Types**: API wrappers, database connectors, utility servers
2. **Template Marketplace**: Share and discover community templates
3. **Advanced Generation**: Conditional logic in templates
4. **Cross-Repository Distribution**: Extract and inject pods between repos
5. **Validation Tools**: MCP Inspector integration

## Dependencies

Key dependencies and their purposes:

- **TypeScript**: Type safety and modern JavaScript features
- **Zod**: Runtime schema validation
- **@modelcontextprotocol/sdk**: MCP server implementation
- **ESLint & Prettier**: Code quality and formatting
- **Vitest**: Fast unit testing framework

## Security Considerations

- Templates are validated before processing
- Generated code follows security best practices
- No execution of arbitrary code during generation
- Clear documentation of any security implications