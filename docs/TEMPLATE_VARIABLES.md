# Template Variables Documentation

This document provides comprehensive documentation for all template variables supported by Context-Pods templates, along with usage examples and best practices.

## Table of Contents

- [Overview](#overview)
- [Common Variables](#common-variables)
- [Template-Specific Variables](#template-specific-variables)
- [Variable Types](#variable-types)
- [Validation Rules](#validation-rules)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)

## Overview

Template variables allow you to customize generated MCP servers to match your specific requirements. Variables are substituted during the template generation process using a simple mustache-style syntax: `{{variableName}}`.

## Common Variables

These variables are supported across all templates:

### `serverName` (required)

- **Type**: `string`
- **Description**: The name of your MCP server
- **Validation**: Must match pattern `^[a-z][a-z0-9-]*$` (lowercase letters, numbers, and hyphens)
- **Example**: `"my-mcp-server"`, `"pdf-processor"`, `"slack-integration"`

### `description`

- **Type**: `string`
- **Description**: A brief description of what your MCP server does
- **Default**: `"A Context-Pods MCP server"`
- **Example**: `"MCP server for processing PDF files and extracting text"`

### `author`

- **Type**: `string`
- **Description**: The name of the server author
- **Default**: `"Context-Pods Developer"`
- **Example**: `"John Doe"`

### `license`

- **Type**: `string`
- **Description**: The license for your server
- **Default**: `"MIT"`
- **Options**: `["MIT", "Apache-2.0", "GPL-3.0", "BSD-3-Clause", "ISC", "UNLICENSED"]`
- **Example**: `"MIT"`

### `version`

- **Type**: `string`
- **Description**: The initial version of your server
- **Default**: `"0.1.0"`
- **Validation**: Must follow semantic versioning (e.g., `"1.0.0"`, `"2.1.3"`)
- **Example**: `"1.0.0"`

## Template-Specific Variables

### TypeScript Advanced Template

Additional variables for the `typescript-advanced` template:

#### `includeTools`

- **Type**: `boolean`
- **Description**: Whether to include example MCP tools in the generated server
- **Default**: `true`
- **Example**: `true`

#### `includeResources`

- **Type**: `boolean`
- **Description**: Whether to include example MCP resources
- **Default**: `false`
- **Example**: `true`

#### `includePrompts`

- **Type**: `boolean`
- **Description**: Whether to include example MCP prompts
- **Default**: `false`
- **Example**: `false`

#### `toolCategories`

- **Type**: `array`
- **Description**: Categories of example tools to include
- **Default**: `["file", "data"]`
- **Options**: `["file", "data", "utility", "network", "system"]`
- **Example**: `["file", "network", "system"]`

#### `useStrictMode`

- **Type**: `boolean`
- **Description**: Whether to enable TypeScript strict mode
- **Default**: `true`
- **Example**: `true`

#### `nodeVersion`

- **Type**: `string`
- **Description**: The Node.js version to target
- **Default**: `"20"`
- **Options**: `["18", "20", "21"]`
- **Example**: `"20"`

### Python Template Variables

Additional variables for Python templates:

#### `pythonVersion`

- **Type**: `string`
- **Description**: The Python version to use
- **Default**: `"3.11"`
- **Options**: `["3.9", "3.10", "3.11", "3.12"]`
- **Example**: `"3.11"`

#### `usePoetry`

- **Type**: `boolean`
- **Description**: Whether to use Poetry for dependency management
- **Default**: `false`
- **Example**: `true`

#### `includeAsyncSupport`

- **Type**: `boolean`
- **Description**: Whether to include async/await support
- **Default**: `true`
- **Example**: `true`

### Rust Template Variables

Additional variables for Rust templates:

#### `crateType`

- **Type**: `string`
- **Description**: The type of Rust crate to generate
- **Default**: `"bin"`
- **Options**: `["bin", "lib"]`
- **Example**: `"bin"`

#### `rustEdition`

- **Type**: `string`
- **Description**: The Rust edition to use
- **Default**: `"2021"`
- **Options**: `["2018", "2021"]`
- **Example**: `"2021"`

## Variable Types

Context-Pods supports the following variable types:

### String Variables

- Basic text values
- Can have pattern validation (regex)
- Can have predefined options

```typescript
{
  "serverName": {
    "type": "string",
    "description": "Name of the server",
    "validation": {
      "pattern": "^[a-z][a-z0-9-]*$"
    }
  }
}
```

### Number Variables

- Numeric values
- Can have min/max validation

```typescript
{
  "port": {
    "type": "number",
    "description": "Server port",
    "validation": {
      "min": 1000,
      "max": 9999
    }
  }
}
```

### Boolean Variables

- True/false values
- Used for feature flags

```typescript
{
  "includeTools": {
    "type": "boolean",
    "description": "Include example tools",
    "default": true
  }
}
```

### Array Variables

- Lists of values
- Can have options validation for allowed values

```typescript
{
  "toolCategories": {
    "type": "array",
    "description": "Tool categories to include",
    "default": ["file", "data"],
    "validation": {
      "options": ["file", "data", "utility", "network", "system"]
    }
  }
}
```

## Validation Rules

Context-Pods provides comprehensive validation with helpful error messages:

### Pattern Validation

```
Error: Variable 'serverName' does not match required pattern
  → Pattern: ^[a-z][a-z0-9-]*$
  → Current value: "Test_Server"
  → Use only lowercase letters, numbers, and hyphens (no spaces or special characters)
```

### Options Validation

```
Error: Variable 'license' has invalid value
  → Current value: "GPL"
  → Allowed values: MIT, Apache-2.0, GPL-3.0, BSD-3-Clause, ISC, UNLICENSED
  → Choose one of the allowed values
```

### Array Validation

```
Error: Array 'toolCategories' contains invalid values
  → Invalid values: invalid-tool
  → Allowed values: file, data, utility, network, system
  → Example: ["file", "data"]
```

## Usage Examples

### Example 1: Basic TypeScript Server

```bash
npx @context-pods/cli generate typescript-advanced \
  --name "pdf-processor" \
  --description "MCP server for processing PDF files" \
  --author "John Doe" \
  --includeTools true \
  --toolCategories '["file", "data"]'
```

### Example 2: Python Server with Custom Settings

```bash
npx @context-pods/cli generate python-basic \
  --name "data-analyzer" \
  --description "Python MCP server for data analysis" \
  --pythonVersion "3.11" \
  --usePoetry true \
  --includeAsyncSupport true
```

### Example 3: Using a Configuration File

Create a `config.json` file:

```json
{
  "serverName": "my-awesome-server",
  "description": "An awesome MCP server that does amazing things",
  "author": "Your Name",
  "license": "MIT",
  "version": "1.0.0",
  "includeTools": true,
  "includeResources": true,
  "toolCategories": ["file", "network", "system"],
  "useStrictMode": true,
  "nodeVersion": "20"
}
```

Then generate:

```bash
npx @context-pods/cli generate typescript-advanced --config config.json
```

### Example 4: Programmatic Usage

```typescript
import { DefaultTemplateEngine } from '@context-pods/core';

const engine = new DefaultTemplateEngine();

const context = {
  templatePath: './templates/typescript-advanced',
  outputPath: './generated/my-server',
  variables: {
    serverName: 'my-server',
    description: 'My custom MCP server',
    includeTools: true,
    toolCategories: ['file', 'data'],
  },
  optimization: {
    turboRepo: true,
    hotReload: true,
  },
};

const result = await engine.process(metadata, context);
```

## Best Practices

### 1. Naming Conventions

- Use lowercase and hyphens for `serverName`: `my-mcp-server`
- Use descriptive names that indicate the server's purpose
- Avoid generic names like `server` or `mcp`

### 2. Descriptions

- Write clear, concise descriptions
- Include the main functionality in the description
- Example: "MCP server for integrating with Slack workspaces and managing channels"

### 3. Feature Selection

- Only include features you need (`includeTools`, `includeResources`, etc.)
- Start minimal and add features as needed
- Consider performance implications of including all features

### 4. Version Management

- Start with `0.1.0` for initial development
- Follow semantic versioning principles
- Update version when making releases

### 5. Tool Categories

- Select only the categories relevant to your server
- `file` - File system operations
- `data` - Data processing and transformation
- `utility` - General utility functions
- `network` - Network and API operations
- `system` - System-level operations

### 6. Validation

- Always test with invalid values during development
- Pay attention to validation error messages
- Use the examples provided in error messages

### 7. Environment-Specific Settings

- Use different configurations for development vs. production
- Consider using environment variables for sensitive values
- Document any environment-specific requirements

## Troubleshooting

### Common Issues

1. **Invalid serverName**
   - Ensure it starts with a letter
   - Use only lowercase letters, numbers, and hyphens
   - Example: `my-server-123` ✓, `MyServer` ✗, `123-server` ✗

2. **Array validation failures**
   - Check that all array elements are from the allowed options
   - Use the exact strings from the options list
   - Example: `["file", "data"]` ✓, `["files", "data"]` ✗

3. **Missing required variables**
   - `serverName` is always required
   - Check template documentation for other required variables
   - Use `--help` to see all available options

4. **Template not found**
   - Ensure the template name is correct
   - Use `npx @context-pods/cli templates` to list available templates
   - Check that templates are properly installed

## Contributing

If you need additional variables or have suggestions for improvements:

1. Open an issue on GitHub describing your use case
2. Submit a PR with the proposed changes
3. Update this documentation with new variables

## Related Documentation

- [Template Development Guide](./TEMPLATE_DEVELOPMENT.md)
- [MCP Protocol Guide](./MCP_PROTOCOL.md)
- [Meta-MCP Server Guide](./META_MCP_GUIDE.md)
