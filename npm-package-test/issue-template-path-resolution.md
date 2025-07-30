# Fix Template Path Resolution and NPM Package Distribution Issues

## Summary

The Context-Pods toolkit has several critical issues related to template path resolution, missing template files, and npm package distribution that prevent it from working correctly when installed via npm or used as an MCP server from different directories.

## Issues Identified

### 1. NPM Package Dependencies Use File References
**Problem**: Both `@context-pods/cli` and `@context-pods/server` packages use `file:../core` references in their package.json, which breaks when published to npm.

**Files affected**:
- `/packages/cli/package.json:41` - `"@context-pods/core": "file:../core"`
- `/packages/server/package.json:22` - `"@context-pods/core": "file:../core"`

**Solution**: Change to proper npm package references before publishing.

### 2. Missing Template Files
**Problem**: Template configurations reference files that don't exist in the repository.

**Missing files**:
- Python template:
  - `templates/python-basic/src/__init__.py`
  - `templates/python-basic/src/server.py`
  - `templates/python-basic/src/tools.py`
  - `templates/python-basic/src/resources.py`
  - `templates/python-basic/README.md`
- TypeScript Advanced template:
  - `templates/typescript-advanced/README.md`
  - `templates/typescript-advanced/.env.example`
  - `templates/typescript-advanced/src/utils/logger.ts` (referenced but missing)

### 3. Template Path Resolution Issues
**Problem**: Multiple hardcoded and relative path references that fail in different execution contexts.

**Key issues**:
- `/packages/server/src/config/index.ts` uses complex path resolution with 5 different strategies, indicating fragility
- `/packages/cli/src/cli.ts:286` uses relative paths `['./templates', '../templates']` without proper resolution
- No consistent way to bundle templates with npm packages
- Path resolution fails when running as MCP server from different directories

### 4. Lack of Test Coverage for Path Resolution
**Problem**: No unit tests specifically for path resolution logic.

**Missing tests**:
- No tests for `getTemplatesPath()` function
- No tests for template path resolution in different contexts (npm global, local, MCP server)
- No tests for fallback strategies when templates are missing

### 5. Template Distribution Strategy
**Problem**: Templates are not included in npm package files, and there's no clear distribution strategy.

**Issues**:
- `packages/cli/package.json` and `packages/server/package.json` don't include templates in "files" array
- No mechanism to download/install templates separately
- No default template location for npm-installed packages

## Recommended Fixes

### Phase 1: Immediate Fixes (High Priority)
1. **Create missing template files** or update template.json to remove references
2. **Fix npm dependencies** - replace file: references with proper versioning
3. **Add template path resolution tests**

### Phase 2: Path Resolution Improvements
1. **Implement template bundling strategy**:
   - Option A: Include templates in npm packages
   - Option B: Create separate @context-pods/templates package
   - Option C: Download templates on first use

2. **Improve path resolution**:
   ```typescript
   // Suggested approach
   function getTemplatesPath(): string {
     // 1. Environment variable (highest priority)
     if (process.env.CONTEXT_PODS_TEMPLATES_PATH) {
       return process.env.CONTEXT_PODS_TEMPLATES_PATH;
     }
     
     // 2. Check if templates are bundled with package
     const bundledTemplates = path.join(__dirname, '../templates');
     if (fs.existsSync(bundledTemplates)) {
       return bundledTemplates;
     }
     
     // 3. Check user's home directory
     const userTemplates = path.join(os.homedir(), '.context-pods/templates');
     if (fs.existsSync(userTemplates)) {
       return userTemplates;
     }
     
     // 4. Download templates if not found
     return downloadTemplatesIfNeeded();
   }
   ```

### Phase 3: Testing and Documentation
1. **Add comprehensive tests**:
   - Unit tests for path resolution functions
   - Integration tests for template discovery
   - E2E tests for npm package installation and usage

2. **Update documentation**:
   - Document template path resolution order
   - Add troubleshooting guide for path issues
   - Document how to use custom template locations

## Test Cases to Add

```typescript
describe('Template Path Resolution', () => {
  it('should resolve templates from environment variable', async () => {
    process.env.CONTEXT_PODS_TEMPLATES_PATH = '/custom/templates';
    expect(getTemplatesPath()).toBe('/custom/templates');
  });

  it('should resolve bundled templates in npm package', async () => {
    // Mock npm package structure
  });

  it('should fallback to user home directory', async () => {
    // Test ~/.context-pods/templates
  });

  it('should handle missing templates gracefully', async () => {
    // Test error handling
  });
});
```

## Impact

These issues currently prevent:
- Installing and using the packages from npm
- Using Context-Pods as an MCP server from different directories
- Reliable template discovery and generation

## Priority

**HIGH** - These issues block the primary use cases of the toolkit when distributed via npm.