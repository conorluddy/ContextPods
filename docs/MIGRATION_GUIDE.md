# Migration Guide

This guide helps you migrate existing MCP servers and templates to use Context-Pods, or upgrade from older versions.

## Table of Contents

- [Migrating from Manual MCP Development](#migrating-from-manual-mcp-development)
- [Converting Existing Scripts to MCP Servers](#converting-existing-scripts-to-mcp-servers)
- [Upgrading Templates](#upgrading-templates)
- [Workspace Dependency Migration](#workspace-dependency-migration)
- [ES Module Migration](#es-module-migration)
- [Testing Framework Migration](#testing-framework-migration)

## Migrating from Manual MCP Development

If you've been manually creating MCP servers, Context-Pods can streamline your workflow.

### Before: Manual Setup

```typescript
// Manually creating each file
// package.json
{
  "name": "my-mcp-server",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}

// index.ts - writing boilerplate
import { Server } from '@modelcontextprotocol/sdk';
// ... lots of manual setup
```

### After: Context-Pods Generation

```bash
# One command generates everything
npx @context-pods/cli generate typescript-advanced \
  --name my-mcp-server \
  --includeTools true \
  --toolCategories '["file", "data"]'

# Complete server with:
# ✓ All boilerplate code
# ✓ Proper error handling
# ✓ TypeScript configuration
# ✓ Testing setup
# ✓ Build scripts
```

### Migration Steps

1. **Analyze your existing server**:

   ```bash
   # List your current tools and resources
   grep -r "name:" src/ | grep -E "(Tool|Resource)"
   ```

2. **Generate new server structure**:

   ```bash
   npx @context-pods/cli generate typescript-advanced \
     --name migrated-server \
     --includeTools true \
     --includeResources true
   ```

3. **Copy your custom logic**:
   - Move tool implementations to `src/tools/`
   - Move resource implementations to `src/resources/`
   - Update imports to use `.js` extensions

4. **Update dependencies**:
   ```bash
   # Compare and merge package.json dependencies
   npm install
   ```

## Converting Existing Scripts to MCP Servers

Transform standalone scripts into MCP servers using the wrap functionality.

### Python Script Example

**Before**: Standalone script

```python
# analyze_data.py
import pandas as pd
import sys

def analyze_csv(file_path):
    df = pd.read_csv(file_path)
    return {
        'rows': len(df),
        'columns': len(df.columns),
        'summary': df.describe().to_dict()
    }

if __name__ == '__main__':
    result = analyze_csv(sys.argv[1])
    print(json.dumps(result))
```

**After**: Wrapped as MCP server

```bash
npx @context-pods/cli wrap ./analyze_data.py \
  --name data-analyzer \
  --description "CSV data analysis MCP server"
```

### Node.js Script Example

**Before**: CLI tool

```javascript
// file-processor.js
const fs = require('fs');
const path = require('path');

function processFiles(directory, pattern) {
  // File processing logic
}

// CLI argument handling
const [, , dir, pattern] = process.argv;
processFiles(dir, pattern);
```

**After**: MCP server with tools

```bash
npx @context-pods/cli wrap ./file-processor.js \
  --name file-processor \
  --description "File processing utilities"
```

### Benefits of Wrapping

1. **Automatic MCP protocol handling**
2. **Standardized error responses**
3. **Built-in parameter validation**
4. **Ready for AI integration**

## Upgrading Templates

If you have custom templates from earlier versions, here's how to upgrade them.

### Template Structure Changes

**Old Structure** (pre-workspace):

```
my-template/
├── template.json
├── package.json
└── src/
    └── index.ts
```

**New Structure** (with enhancements):

```
my-template/
├── template.json      # Enhanced metadata
├── package.json      # Standalone dependencies
├── tsconfig.json     # Self-contained config
├── src/
│   ├── index.ts
│   └── utils/       # New utility structure
│       ├── logger.ts
│       ├── validation.ts
│       └── helpers.ts
└── EXAMPLES.md      # Template-specific examples
```

### Updating template.json

**Old Format**:

```json
{
  "name": "my-template",
  "description": "Basic template",
  "language": "typescript",
  "variables": {
    "serverName": {
      "description": "Server name",
      "required": true
    }
  }
}
```

**New Format**:

```json
{
  "name": "my-template",
  "description": "Enhanced template with validation",
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
    "toolCategories": {
      "description": "Categories of tools to include",
      "type": "array",
      "default": ["file", "data"],
      "validation": {
        "options": ["file", "data", "utility", "network", "system"]
      }
    }
  },
  "files": [
    {
      "path": "src/index.ts",
      "template": true
    },
    {
      "path": "src/utils/logger.ts",
      "template": false
    }
  ],
  "optimization": {
    "turboRepo": true,
    "hotReload": true
  }
}
```

### Key Changes to Make

1. **Add type information** to all variables
2. **Add validation rules** for better error messages
3. **Include optimization flags** for TurboRepo support
4. **List all files** explicitly with template flags
5. **Add minCliVersion** for compatibility

## Workspace Dependency Migration

Moving from workspace dependencies to standalone packages.

### Before: Workspace Dependencies

```json
{
  "dependencies": {
    "@context-pods/core": "workspace:*"
  }
}
```

### After: Standalone Implementation

1. **Create local utilities**:

   ```typescript
   // src/utils/logger.ts
   export enum LogLevel {
     DEBUG = 'debug',
     INFO = 'info',
     WARN = 'warn',
     ERROR = 'error',
   }

   export class Logger {
     constructor(private name: string) {}

     info(message: string, meta?: any) {
       console.log(`[${this.name}] ${message}`, meta);
     }
     // ... other methods
   }
   ```

2. **Update imports**:

   ```typescript
   // Before
   import { Logger } from '@context-pods/core';

   // After
   import { Logger } from './utils/logger.js';
   ```

## ES Module Migration

Converting from CommonJS to ES modules.

### Package.json Changes

```json
{
  "type": "module",
  "engines": {
    "node": ">=16.0.0"
  }
}
```

### Import Changes

**Before (CommonJS)**:

```typescript
const path = require('path');
const { fileURLToPath } = require('url');

// __dirname equivalent
const __dirname = path.dirname(__filename);
```

**After (ES Modules)**:

```typescript
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### Import Extensions

**Before**:

```typescript
import { myFunction } from './utils';
import { Tool } from './types';
```

**After**:

```typescript
import { myFunction } from './utils.js';
import { Tool } from './types.js';
```

## Testing Framework Migration

Adopting the Context-Pods testing framework.

### Before: Manual Testing

```typescript
// Basic manual tests
describe('My MCP Server', () => {
  it('should handle requests', () => {
    // Manual protocol testing
  });
});
```

### After: Context-Pods Testing Framework

```typescript
import {
  MCPComplianceTestSuite,
  ScriptWrapperTester,
  ReportGenerator,
} from '@context-pods/testing';

// Comprehensive protocol compliance testing
const suite = new MCPComplianceTestSuite('./dist', true);
const results = await suite.runFullSuite();

// Generate HTML report
const report = ReportGenerator.generateHTML(results);
```

### Migration Benefits

1. **Automated compliance testing** against MCP standards
2. **Multi-language script testing** support
3. **Professional test reports** for documentation
4. **CI/CD integration** with JUnit XML output

## Best Practices for Migration

### 1. Incremental Migration

- Start with one server/template
- Test thoroughly before migrating others
- Keep backups of original code

### 2. Validation First

- Run Context-Pods validation on existing servers:
  ```bash
  npx @context-pods/cli validate-mcp ./my-server
  ```

### 3. Use Migration Tools

- Leverage the wrap command for scripts
- Use template generation for new structure
- Copy custom logic last

### 4. Test Coverage

- Write tests for custom logic before migration
- Use Context-Pods testing framework after
- Compare outputs to ensure compatibility

### 5. Documentation

- Document any custom modifications
- Update README with Context-Pods commands
- Add EXAMPLES.md for your templates

## Common Migration Issues

### Issue: Circular Dependencies

**Solution**: Replace workspace dependencies with local implementations.

### Issue: Build Errors

**Solution**: Update tsconfig.json to match Context-Pods standards:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16"
  }
}
```

### Issue: Runtime Errors

**Solution**: Ensure all imports use `.js` extensions and package.json has `"type": "module"`.

## Getting Help

- Review [Troubleshooting Guide](./TROUBLESHOOTING.md)
- Check [Template Variables](./TEMPLATE_VARIABLES.md)
- Submit issues on [GitHub](https://github.com/conorluddy/ContextPods/issues)
