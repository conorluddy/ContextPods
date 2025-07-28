# Troubleshooting Guide

This guide helps you resolve common issues when using Context-Pods for MCP server generation.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Template Generation Errors](#template-generation-errors)
- [Build and Compilation Errors](#build-and-compilation-errors)
- [Runtime Errors](#runtime-errors)
- [MCP Protocol Issues](#mcp-protocol-issues)
- [Testing Issues](#testing-issues)
- [Common Error Messages](#common-error-messages)

## Installation Issues

### NPM Install Fails

**Problem**: `npm install` fails with permission errors or missing dependencies.

**Solutions**:

1. Clear npm cache:

   ```bash
   npm cache clean --force
   ```

2. Delete node_modules and reinstall:

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Use correct Node.js version:

   ```bash
   # Check current version
   node --version

   # Use Node.js 20.x or higher
   nvm use 20
   ```

### Workspace Dependencies Not Found

**Problem**: Error about missing `@context-pods/core` or workspace dependencies.

**Solution**: Ensure you're running npm install from the repository root:

```bash
cd /path/to/MCPTemplate
npm install
npm run build
```

## Template Generation Errors

### Template Not Found

**Problem**: `Error: Template 'xyz' not found`

**Solutions**:

1. List available templates:

   ```bash
   npx @context-pods/cli templates
   ```

2. Use exact template name:

   ```bash
   # Correct
   npx @context-pods/cli generate typescript-advanced --name my-server

   # Incorrect
   npx @context-pods/cli generate typescript_advanced --name my-server
   ```

### Variable Validation Errors

**Problem**: Validation errors for template variables.

**Common Issues and Fixes**:

1. **Invalid serverName**:

   ```bash
   # Error: serverName doesn't match pattern
   --name "My_Server"  # ❌ Wrong: uppercase and underscore
   --name "my-server"  # ✅ Correct: lowercase and hyphens
   ```

2. **Invalid array format**:

   ```bash
   # Error: toolCategories is not a valid array
   --toolCategories file,data  # ❌ Wrong: missing quotes and brackets
   --toolCategories '["file", "data"]'  # ✅ Correct: JSON array
   ```

3. **Invalid option values**:
   ```bash
   # Error: license has invalid value
   --license "GPL"  # ❌ Wrong: not in allowed values
   --license "GPL-3.0"  # ✅ Correct: use full license identifier
   ```

### Pre-flight Check Failures

**Problem**: Template generation fails during pre-flight checks.

**Solution**: Check the error message for specific issues:

```
Error during pre-flight checks:
→ Missing required variable: serverName
→ Invalid array values in toolCategories
→ Template directory not found

Fix these issues before proceeding.
```

## Build and Compilation Errors

### TypeScript Compilation Errors

**Problem**: `npm run build` fails with TypeScript errors.

**Solutions**:

1. Check TypeScript version:

   ```bash
   npx tsc --version
   # Should be 5.x or higher
   ```

2. Run type checking directly:

   ```bash
   npm run type-check
   ```

3. Common fixes:
   - Ensure all imports use `.js` extension for ES modules
   - Check that `tsconfig.json` has correct settings
   - Verify all dependencies are installed

### ESLint Errors

**Problem**: Build fails due to ESLint errors.

**Solutions**:

1. Run ESLint with auto-fix:

   ```bash
   npm run lint:fix
   ```

2. Check specific files:

   ```bash
   npx eslint src/index.ts --fix
   ```

3. Common ESLint issues:
   - Remove unused imports
   - Fix 'any' types with proper TypeScript types
   - Add `eslint-disable-next-line` for console statements

### Module Resolution Errors

**Problem**: `Cannot find module` errors.

**Solutions**:

1. For ES modules, ensure imports include `.js`:

   ```typescript
   // Wrong
   import { Tool } from './types';

   // Correct
   import { Tool } from './types.js';
   ```

2. Check `package.json` has `"type": "module"`

3. Verify dependencies are installed:
   ```bash
   npm ls @modelcontextprotocol/sdk
   ```

## Runtime Errors

### Server Won't Start

**Problem**: MCP server fails to start or immediately exits.

**Solutions**:

1. Test with MCP protocol directly:

   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}' | node dist/index.js
   ```

2. Check for port conflicts:

   ```bash
   lsof -i :3000
   ```

3. Enable debug logging:
   ```bash
   DEBUG=* npm start
   ```

### Import Meta URL Errors

**Problem**: `Cannot use import.meta outside a module`

**Solution**: Ensure your `package.json` includes:

```json
{
  "type": "module"
}
```

## MCP Protocol Issues

### Client Connection Failures

**Problem**: Claude Desktop or other clients can't connect.

**Solutions**:

1. Verify server configuration:

   ```json
   {
     "mcpServers": {
       "my-server": {
         "command": "node",
         "args": ["./path/to/dist/index.js"],
         "cwd": "/absolute/path/to/server"
       }
     }
   }
   ```

2. Test server manually:

   ```bash
   cd /path/to/server
   node dist/index.js
   ```

3. Check server logs for errors

### Protocol Version Mismatch

**Problem**: `Unsupported protocol version` error.

**Solution**: Ensure your server uses the correct protocol version:

```typescript
const PROTOCOL_VERSION = '2024-11-05';
```

## Testing Issues

### Test Timeouts

**Problem**: Tests timeout during template generation.

**Solutions**:

1. Increase test timeout:

   ```typescript
   it('should generate template', async () => {
     // test code
   }, 90000); // 90 second timeout
   ```

2. Skip integration tests for faster runs:
   ```bash
   npm test -- --grep "unit"
   ```

### File System Errors in Tests

**Problem**: Tests fail with file system errors.

**Solution**: Ensure proper cleanup in tests:

```typescript
afterEach(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});
```

## Common Error Messages

### "Array contains invalid values"

**Full Error**:

```
Array 'toolCategories' contains invalid values
→ Invalid values: invalid-tool
→ Allowed values: file, data, utility, network, system
→ Example: ["file", "data"]
```

**Fix**: Use only allowed values from the error message.

### "Variable does not match required pattern"

**Full Error**:

```
Variable 'serverName' does not match required pattern
→ Pattern: ^[a-z][a-z0-9-]*$
→ Current value: "Test_Server"
→ Use only lowercase letters, numbers, and hyphens
```

**Fix**: Follow the pattern requirements shown in the error.

### "Missing required variable"

**Full Error**:

```
Missing required variable: serverName
→ This variable is required for template generation
→ Add it to your command: --name "my-server"
```

**Fix**: Add the missing variable to your command.

### "Template processing failed"

**Full Error**:

```
Failed to process template file: src/index.ts
→ Variable 'includeTools' is not defined
→ Check your template variables
```

**Fix**: Ensure all variables used in templates are provided.

## Getting Help

If you're still experiencing issues:

1. Check the [GitHub Issues](https://github.com/conorluddy/ContextPods/issues)
2. Review the [Template Variables Documentation](./TEMPLATE_VARIABLES.md)
3. Look at [Usage Examples](./USAGE_EXAMPLES.md)
4. Submit a new issue with:
   - Full error message
   - Command you ran
   - Context-Pods version
   - Node.js version
   - Operating system

## Debug Mode

Enable verbose logging for troubleshooting:

```bash
# Set log level
LOG_LEVEL=debug npm start

# Enable all debug output
DEBUG=* npm start

# Enable specific debug namespaces
DEBUG=mcp:*,template:* npm start
```

## Pre-commit Hook Issues

If commits are failing due to pre-commit hooks:

1. Run checks manually:

   ```bash
   npm run lint
   npm run type-check
   npm run build
   npm test
   ```

2. Fix issues before committing

3. Emergency bypass (use sparingly):
   ```bash
   git commit --no-verify -m "Emergency fix"
   ```

Remember: Pre-commit hooks ensure code quality. Fix issues rather than bypassing checks.
