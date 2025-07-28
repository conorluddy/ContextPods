# Template Development Guide

This guide explains how to create custom templates for Context-Pods, enabling you to generate MCP servers tailored to your specific needs.

## Table of Contents

- [Template Structure](#template-structure)
- [Creating a Basic Template](#creating-a-basic-template)
- [Template Metadata](#template-metadata)
- [Variable System](#variable-system)
- [File Processing](#file-processing)
- [Advanced Features](#advanced-features)
- [Testing Your Template](#testing-your-template)
- [Best Practices](#best-practices)

## Template Structure

A Context-Pods template consists of:

```
my-template/
├── template.json          # Template metadata and configuration
├── package.json          # Node.js package configuration (if applicable)
├── tsconfig.json         # TypeScript configuration (if applicable)
├── src/                  # Source code templates
│   ├── index.ts         # Main entry point
│   └── tools/           # Tool implementations
├── tests/               # Test templates
├── README.md            # Template documentation
└── EXAMPLES.md          # Usage examples
```

## Creating a Basic Template

### Step 1: Create Template Directory

```bash
mkdir templates/my-custom-template
cd templates/my-custom-template
```

### Step 2: Define Template Metadata

Create `template.json`:

```json
{
  "name": "my-custom-template",
  "description": "Custom MCP server template for specific use case",
  "version": "1.0.0",
  "author": "Your Name",
  "language": "typescript",
  "minCliVersion": "1.0.0",
  "variables": {
    "serverName": {
      "description": "Name of the MCP server",
      "type": "string",
      "required": true,
      "validation": {
        "pattern": "^[a-z][a-z0-9-]*$"
      }
    },
    "description": {
      "description": "Server description",
      "type": "string",
      "default": "A custom MCP server"
    },
    "includeDatabase": {
      "description": "Include database connectivity",
      "type": "boolean",
      "default": false
    }
  },
  "files": [
    {
      "path": "package.json",
      "template": true
    },
    {
      "path": "src/index.ts",
      "template": true
    }
  ],
  "optimization": {
    "turboRepo": true,
    "hotReload": true
  }
}
```

### Step 3: Create Template Files

Create `package.json` (template file):

```json
{
  "name": "{{serverName}}",
  "version": "0.1.0",
  "description": "{{description}}",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"{{#includeDatabase}},
    "pg": "^8.11.0"{{/includeDatabase}}
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0"
  }
}
```

Create `src/index.ts` (template file):

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
{{#includeDatabase}}
import { Pool } from 'pg';
{{/includeDatabase}}

const server = new Server(
  {
    name: '{{serverName}}',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

{{#includeDatabase}}
// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
{{/includeDatabase}}

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'example_tool',
      description: 'An example tool for {{serverName}}',
      inputSchema: {
        type: 'object',
        properties: {
          input: { type: 'string' }
        },
        required: ['input']
      }
    }{{#includeDatabase}},
    {
      name: 'query_database',
      description: 'Execute a database query',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          params: { type: 'array' }
        },
        required: ['query']
      }
    }{{/includeDatabase}}
  ]
}));

// Tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'example_tool':
      return {
        content: [{
          type: 'text',
          text: `Processed: ${args.input}`
        }]
      };
    {{#includeDatabase}}
    case 'query_database':
      try {
        const result = await pool.query(args.query, args.params || []);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result.rows, null, 2)
          }]
        };
      } catch (error) {
        throw new Error(`Database error: ${error.message}`);
      }
    {{/includeDatabase}}
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
const transport = new StdioServerTransport();
void server.connect(transport);

console.error('{{serverName}} MCP server started');
```

## Template Metadata

### Required Fields

- `name`: Unique template identifier
- `description`: Clear description of template purpose
- `language`: Programming language (typescript, python, rust, shell)
- `variables`: Variable definitions for customization

### Optional Fields

- `version`: Template version
- `author`: Template author
- `minCliVersion`: Minimum CLI version required
- `tags`: Array of tags for categorization
- `optimization`: Performance optimization settings
- `buildCommand`: Custom build command
- `startCommand`: Custom start command

### Language-Specific Settings

For TypeScript:

```json
{
  "language": "typescript",
  "nodeVersion": "20",
  "useStrictMode": true,
  "includeTests": true
}
```

For Python:

```json
{
  "language": "python",
  "pythonVersion": "3.11",
  "usePoetry": false,
  "includeAsyncSupport": true
}
```

## Variable System

### Variable Types

1. **String Variables**:

   ```json
   {
     "apiEndpoint": {
       "type": "string",
       "description": "API endpoint URL",
       "default": "https://api.example.com",
       "validation": {
         "pattern": "^https?://"
       }
     }
   }
   ```

2. **Number Variables**:

   ```json
   {
     "port": {
       "type": "number",
       "description": "Server port",
       "default": 3000,
       "validation": {
         "min": 1000,
         "max": 65535
       }
     }
   }
   ```

3. **Boolean Variables**:

   ```json
   {
     "enableLogging": {
       "type": "boolean",
       "description": "Enable debug logging",
       "default": true
     }
   }
   ```

4. **Array Variables**:
   ```json
   {
     "features": {
       "type": "array",
       "description": "Features to include",
       "default": ["basic"],
       "validation": {
         "options": ["basic", "advanced", "experimental"]
       }
     }
   }
   ```

### Variable Substitution Syntax

- Basic: `{{variableName}}`
- Conditionals: `{{#booleanVar}}...{{/booleanVar}}`
- Inverted conditionals: `{{^booleanVar}}...{{/booleanVar}}`
- Arrays: `{{#arrayVar}}{{.}}{{/arrayVar}}`

### Advanced Variable Features

1. **Computed Variables**:

   ```json
   {
     "packageName": {
       "type": "string",
       "computed": true,
       "computeFrom": "serverName",
       "transform": "kebabCase"
     }
   }
   ```

2. **Dependent Variables**:
   ```json
   {
     "databaseUrl": {
       "type": "string",
       "dependsOn": "includeDatabase",
       "required": "conditional"
     }
   }
   ```

## File Processing

### File Definition

```json
{
  "files": [
    {
      "path": "src/index.ts",
      "template": true,
      "condition": "always"
    },
    {
      "path": "src/database.ts",
      "template": true,
      "condition": "includeDatabase"
    },
    {
      "path": "LICENSE",
      "template": false,
      "source": "licenses/MIT.txt"
    }
  ]
}
```

### File Properties

- `path`: Output path in generated project
- `template`: Whether to process as template
- `condition`: Variable name for conditional inclusion
- `source`: Alternative source path
- `permissions`: File permissions (e.g., "755")

### Directory Structure

```json
{
  "directories": [
    {
      "path": "src/tools",
      "condition": "includeTools"
    },
    {
      "path": "tests",
      "condition": "includeTests"
    }
  ]
}
```

## Advanced Features

### Post-Processing Hooks

```json
{
  "hooks": {
    "postGenerate": [
      {
        "command": "npm install",
        "condition": "always"
      },
      {
        "command": "npm run build",
        "condition": "buildAfterGenerate"
      }
    ]
  }
}
```

### Template Inheritance

```json
{
  "extends": "typescript-basic",
  "overrides": {
    "variables": {
      "additionalVar": {
        "type": "string",
        "required": true
      }
    }
  }
}
```

### Custom Validation

```typescript
// validators.ts
export function validateServerName(value: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(value);
}

export function validateArrayOptions(value: string[], options: string[]): boolean {
  return value.every((item) => options.includes(item));
}
```

## Testing Your Template

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { DefaultTemplateEngine } from '@context-pods/core';
import { readFileSync } from 'fs';

describe('My Custom Template', () => {
  it('should generate valid package.json', async () => {
    const engine = new DefaultTemplateEngine();
    const metadata = JSON.parse(readFileSync('./template.json', 'utf8'));

    const result = await engine.process(metadata, {
      templatePath: '.',
      outputPath: './test-output',
      variables: {
        serverName: 'test-server',
        includeDatabase: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.processedFiles).toContain('package.json');
  });
});
```

### Integration Tests

```bash
# Test template generation
npx @context-pods/cli generate ./my-template \
  --name test-server \
  --output ./test-output

# Verify generated files
cd test-output
npm install
npm run build
npm test
```

### Validation Tests

```typescript
describe('Template Validation', () => {
  it('should validate all required variables', () => {
    const metadata = loadTemplateMetadata();
    const requiredVars = Object.entries(metadata.variables)
      .filter(([_, def]) => def.required)
      .map(([name]) => name);

    expect(requiredVars).toContain('serverName');
  });
});
```

## Best Practices

### 1. Clear Variable Names

```json
{
  "variables": {
    "enableDatabaseConnection": {
      // Clear and specific
      "description": "Enable PostgreSQL database connection"
    }
  }
}
```

### 2. Comprehensive Validation

```json
{
  "validation": {
    "pattern": "^[a-z][a-z0-9-]*$",
    "minLength": 3,
    "maxLength": 50,
    "examples": ["my-server", "api-gateway"]
  }
}
```

### 3. Helpful Error Messages

```typescript
if (!isValid) {
  throw new Error(
    `Invalid server name: "${value}"\n` +
      `→ Must start with lowercase letter\n` +
      `→ Can contain lowercase letters, numbers, and hyphens\n` +
      `→ Examples: my-server, api-gateway`,
  );
}
```

### 4. Modular File Structure

```
src/
├── index.ts          # Main entry point
├── tools/           # Tool implementations
│   ├── index.ts
│   └── file-tools.ts
├── resources/       # Resource implementations
├── utils/          # Utility functions
└── types.ts        # Type definitions
```

### 5. Documentation

Always include:

- `README.md` with template overview
- `EXAMPLES.md` with usage examples
- Inline comments in template files
- Variable descriptions in `template.json`

### 6. Version Compatibility

```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "minCliVersion": "1.0.0",
  "maxCliVersion": "2.0.0"
}
```

## Contributing Templates

To contribute your template to Context-Pods:

1. **Follow Standards**: Ensure template follows all guidelines
2. **Add Tests**: Include comprehensive test coverage
3. **Document**: Provide clear documentation and examples
4. **Submit PR**: Create pull request with:
   - Template files
   - Tests
   - Documentation
   - Example usage

## Template Examples

### API Client Template

```json
{
  "name": "api-client-template",
  "variables": {
    "apiName": {
      "type": "string",
      "required": true
    },
    "authType": {
      "type": "string",
      "default": "bearer",
      "validation": {
        "options": ["bearer", "api-key", "oauth2"]
      }
    }
  }
}
```

### Database Connector Template

```json
{
  "name": "database-connector",
  "variables": {
    "databaseType": {
      "type": "string",
      "required": true,
      "validation": {
        "options": ["postgresql", "mysql", "mongodb", "redis"]
      }
    },
    "includeORM": {
      "type": "boolean",
      "default": false
    }
  }
}
```

### Webhook Handler Template

```json
{
  "name": "webhook-handler",
  "variables": {
    "webhookSource": {
      "type": "string",
      "required": true
    },
    "verificationMethod": {
      "type": "string",
      "validation": {
        "options": ["hmac", "signature", "token"]
      }
    }
  }
}
```

## Debugging Templates

### Enable Debug Mode

```bash
DEBUG=template:* npx @context-pods/cli generate my-template
```

### Common Issues

1. **Variable not substituted**: Check variable name spelling
2. **Conditional not working**: Verify boolean variable type
3. **File not generated**: Check file condition
4. **Validation failing**: Test pattern with examples

## Resources

- [Template Variables Documentation](./TEMPLATE_VARIABLES.md)
- [MCP Protocol Guide](./MCP_PROTOCOL.md)
- [Context-Pods Core API](./API_REFERENCE.md)
