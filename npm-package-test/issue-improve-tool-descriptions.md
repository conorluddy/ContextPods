# Improve MCP Tool Descriptions with Detailed Usage Documentation

## Summary

The current MCP tool descriptions in the Context-Pods server are too brief and don't provide enough information about expected formats, validation patterns, or parameter constraints. This leads to validation errors and failed tool calls when LLMs try to use them.

## Current Issues

### 1. Validation Patterns Not Documented
When tools have validation patterns (like regex), these aren't communicated in the tool description.

**Example from our testing:**
```
❌ Error in create-mcp: Template variable validation failed:
• serverName: Variable 'serverName' does not match required pattern
  → Pattern: ^[a-z0-9-]+$
  → Current value: "system_datetime_reader"
```

The LLM had no way to know that underscores weren't allowed because the tool description doesn't mention the pattern.

### 2. Current Tool Descriptions Are Too Brief

**Current create-mcp tool:**
```typescript
{
  name: 'create-mcp',
  description: 'Generate new MCP server from template with intelligent template selection',
  // ... parameters
}
```

## Recommended Improvements

### 1. Enhanced Tool Descriptions with Examples

```typescript
{
  name: 'create-mcp',
  description: `Generate a new MCP server from a template.

This tool creates a fully-functional MCP server with the specified configuration.
The server name must use only lowercase letters, numbers, and hyphens (no underscores or spaces).

Examples:
- Valid names: "weather-api", "data-processor", "my-tool-123"
- Invalid names: "my_server", "MyServer", "server name"

The tool will automatically select the best template based on your language preference,
or you can specify a template directly.`,
  // ... parameters
}
```

### 2. Enhanced Parameter Descriptions

```typescript
parameters: {
  name: {
    type: 'string',
    description: `Name for the MCP server (required).
    
Format: lowercase letters, numbers, and hyphens only
Pattern: ^[a-z0-9-]+$
Examples: "weather-api", "data-processor", "my-tool-123"
    
This will be used as:
- The package name in package.json
- The server identifier in MCP configuration
- The directory name for the generated server`,
    pattern: '^[a-z0-9-]+$'
  },
  template: {
    type: 'string',
    description: `Template to use (optional).
    
Available templates:
- "basic" - Simple TypeScript MCP server with minimal dependencies
- "typescript-advanced" - Full-featured TypeScript server with utilities
- "python-basic" - Basic Python MCP server
    
If not specified, the tool will select based on the language parameter.
Use "list-mcps --format=json" to see all available templates.`,
    enum: ['basic', 'typescript-advanced', 'python-basic']
  },
  outputPath: {
    type: 'string',
    description: `Output directory for the generated server (optional).
    
Examples:
- Absolute path: "/home/user/projects/my-mcp"
- Relative path: "./generated/my-mcp"
    
If not specified, defaults to the current directory.
The directory will be created if it doesn't exist.`
  }
}
```

### 3. Add Format Documentation to wrap-script

```typescript
{
  name: 'wrap-script',
  description: `Convert an existing script into an MCP server.

This tool analyzes your script and wraps it with MCP protocol handlers,
making it accessible as an MCP server without modifying the original logic.

Supported languages: Python (.py), JavaScript (.js), TypeScript (.ts), Shell (.sh)

The generated server will:
- Expose script functions as MCP tools
- Handle script execution and output
- Provide proper error handling
- Support script arguments as tool parameters`,
  
  parameters: {
    scriptPath: {
      type: 'string',
      description: `Path to the script file to wrap (required).
      
Supported file extensions:
- .py (Python scripts)
- .js (JavaScript/Node.js scripts)
- .ts (TypeScript scripts)
- .sh (Shell scripts)
      
The script must exist and be readable.
Example: "/path/to/my-script.py"`
    },
    name: {
      type: 'string',
      description: `Name for the generated MCP server (required).
      
Format: lowercase letters, numbers, and underscores only
Pattern: ^[a-z0-9_]+$
Examples: "my_script_wrapper", "data_processor", "tool123"
      
Note: Different from create-mcp, underscores ARE allowed here.`
    }
  }
}
```

### 4. Add Validation Examples to list-mcps

```typescript
{
  name: 'list-mcps',
  description: `List all managed MCP servers with detailed information.

This tool shows all MCP servers created or managed by Context-Pods,
including their status, template, language, and creation date.

Output formats:
- "table" (default) - Human-readable table format
- "json" - Full details in JSON format
- "summary" - Brief summary with counts

Filter examples:
- By status: --status=ready (ready, error, building, created)
- By language: --language=typescript
- By template: --template=basic
- Search: --search="weather" (searches names and descriptions)`,
  
  parameters: {
    format: {
      type: 'string',
      enum: ['table', 'json', 'summary'],
      description: `Output format for the server list.
      
- "table": ASCII table with key information (default)
  Best for: Quick overview, human reading
  
- "json": Complete server details in JSON
  Best for: Automation, detailed analysis
  Example: list-mcps --format=json | jq '.servers[] | select(.status=="error")'
  
- "summary": Statistics and counts only
  Best for: Dashboard views, quick status checks`
    }
  }
}
```

### 5. Add Clear Error Messages in Tool Execution

```typescript
// In tool execution
if (!name.match(/^[a-z0-9-]+$/)) {
  throw new Error(`Invalid server name: "${name}"

Server names must contain only lowercase letters, numbers, and hyphens.
  
✓ Valid examples:
  - weather-api
  - my-tool-123
  - data-processor
  
✗ Invalid examples:
  - my_server (underscores not allowed)
  - MyServer (uppercase not allowed)
  - my server (spaces not allowed)
  
Please provide a name matching the pattern: ^[a-z0-9-]+$`);
}
```

## Implementation Recommendations

1. **Add a `examples` field to tool schemas** that can be displayed in help
2. **Include validation patterns in descriptions** when they exist
3. **Provide both valid and invalid examples** for constrained inputs
4. **Explain the purpose and impact** of each parameter
5. **Document any side effects** (e.g., "creates directories", "modifies registry")
6. **Add related commands** to help users discover functionality

## Benefits

1. **Reduced validation errors** - LLMs will format inputs correctly on first attempt
2. **Better discoverability** - Users and LLMs can understand full capabilities
3. **Improved UX** - Clear expectations and helpful error messages
4. **Self-documenting** - Tools become their own documentation

## Priority

**HIGH** - This directly impacts usability for both human users and LLM agents. Current brief descriptions lead to frequent validation errors and failed operations.