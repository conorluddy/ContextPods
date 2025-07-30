# Fix Critical Issues: Template Path Resolution, NPM Distribution, Security, and Tool Documentation

## Summary

The Context-Pods toolkit has several critical architectural and security issues that prevent it from working correctly when installed via npm or used as an MCP server. This comprehensive issue documents all problems found during testing, security vulnerabilities discovered through code analysis, and provides detailed recommendations with test coverage requirements.

## Issues Overview

1. **NPM Package Distribution Problems**
2. **Template Path Resolution Architecture Flaws**
3. **Security Vulnerabilities**
4. **Missing Template Files**
5. **Insufficient Tool Documentation**
6. **Lack of Test Coverage**

---

## Issue 1: NPM Package Distribution Problems

### Problem
The current package configuration prevents proper npm distribution:
- Both `@context-pods/cli` and `@context-pods/server` use `file:../core` references
- Templates are not included in the npm package files
- No consideration for global vs local npm installations

### Affected Files
- `/packages/cli/package.json:41` - `"@context-pods/core": "file:../core"`
- `/packages/server/package.json:22` - `"@context-pods/core": "file:../core"`
- Missing "templates" in "files" array for both packages

### Solution
```json
// package.json updates
{
  "dependencies": {
    "@context-pods/core": "^0.0.1"
  },
  "files": [
    "dist",
    "bin",
    "templates",
    "README.md"
  ]
}
```

### Required Tests
```typescript
describe('NPM Package Distribution', () => {
  it('should include all required template files in package', async () => {
    const packageFiles = await getPackageFiles('@context-pods/cli');
    expect(packageFiles).toContain('templates/basic/template.json');
    expect(packageFiles).toContain('templates/typescript-advanced/template.json');
    expect(packageFiles).toContain('templates/python-basic/template.json');
  });

  it('should work when installed globally via npm', async () => {
    // Simulate global installation
    process.env.NODE_PATH = '/usr/local/lib/node_modules';
    const cli = require.resolve('@context-pods/cli');
    expect(cli).toBeTruthy();
  });

  it('should work when installed locally in node_modules', async () => {
    // Simulate local installation
    const localPath = path.join(process.cwd(), 'node_modules/@context-pods/cli');
    expect(fs.existsSync(localPath)).toBeTruthy();
  });
});
```

---

## Issue 2: Template Path Resolution Architecture Flaws

### Problem
The current `getTemplatesPathRobust()` function in `/packages/server/src/config/index.ts` uses 5 different fallback strategies that:
- Don't work in npm-installed contexts
- Assume templates are always relative to source
- Have no clear precedence order
- Mix concerns (file I/O with business logic)

### Current Flawed Implementation
```typescript
// Five different strategies that fail in production:
// Strategy 1: Try to find project root intelligently
// Strategy 2: Use corrected relative path for built files
// Strategy 3: Try original path in case build structure changes
// Strategy 4: Try from source directory perspective
// Strategy 5: Return most likely correct path (hardcoded)
```

### Recommended Architecture: Template Registry Pattern
```typescript
interface TemplateSource {
  name: string;
  priority: number;
  isAvailable(): Promise<boolean>;
  load(templateName: string): Promise<Template>;
}

class TemplateRegistry {
  private sources: TemplateSource[] = [];
  
  constructor(private config: TemplateConfig) {
    this.registerDefaultSources();
  }
  
  private registerDefaultSources() {
    // Priority order matters
    this.addSource(new EnvironmentVariableSource(1));
    this.addSource(new BundledTemplateSource(2)); 
    this.addSource(new UserDirectorySource(3));
    this.addSource(new GitHubTemplateSource(4));
  }
  
  async getTemplate(name: string): Promise<Template> {
    for (const source of this.sources.sort((a, b) => a.priority - b.priority)) {
      if (await source.isAvailable()) {
        try {
          return await source.load(name);
        } catch (e) {
          // Log and continue to next source
        }
      }
    }
    throw new TemplateNotFoundError(name, this.sources);
  }
}
```

### Required Tests
```typescript
describe('Template Path Resolution', () => {
  describe('Environment Variable Source', () => {
    it('should prioritize CONTEXT_PODS_TEMPLATES_PATH', async () => {
      process.env.CONTEXT_PODS_TEMPLATES_PATH = '/custom/templates';
      const registry = new TemplateRegistry();
      const template = await registry.getTemplate('basic');
      expect(template.sourcePath).toBe('/custom/templates/basic');
    });
  });

  describe('Bundled Templates', () => {
    it('should find templates bundled with npm package', async () => {
      // Mock npm package structure
      mockFs({
        '/usr/local/lib/node_modules/@context-pods/cli/templates/basic': {
          'template.json': JSON.stringify({ name: 'basic' })
        }
      });
      const registry = new TemplateRegistry();
      const template = await registry.getTemplate('basic');
      expect(template).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should provide helpful error when no templates found', async () => {
      const registry = new TemplateRegistry();
      await expect(registry.getTemplate('nonexistent'))
        .rejects.toThrow(/Template 'nonexistent' not found. Searched in:/);
    });
  });
});
```

---

## Issue 3: Security Vulnerabilities

### Problem A: Path Traversal Vulnerability
No validation of output paths allows writing files anywhere on the system.

```typescript
// Current vulnerable code
const outputPath = options.output || './generated';
// No validation - allows ../../../etc/passwd
```

### Problem B: Template Injection Vulnerability
Template processing uses unsafe string replacement without escaping.

```typescript
// Current vulnerable code in processTemplateContent()
content = content.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value));
// Allows injection if value contains }}{{malicious}}{{
```

### Security Solutions

#### Input Validation Layer
```typescript
import { z } from 'zod';
import path from 'path';

const securitySchema = z.object({
  name: z.string()
    .regex(/^[a-z0-9-]+$/)
    .max(50)
    .refine(name => !name.startsWith('.'), 'Name cannot start with dot'),
    
  outputPath: z.string().transform((p, ctx) => {
    const resolved = path.resolve(process.cwd(), p);
    const cwd = process.cwd();
    
    // Prevent path traversal
    if (!resolved.startsWith(cwd)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Output path must be within current directory'
      });
      return z.NEVER;
    }
    
    // Prevent writing to sensitive directories
    const forbidden = ['/etc', '/usr', '/bin', '/sbin', '/var'];
    if (forbidden.some(dir => resolved.startsWith(dir))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot write to system directories'
      });
      return z.NEVER;
    }
    
    return resolved;
  }),
  
  variables: z.record(z.string(), z.any()).transform(vars => {
    // Sanitize all variable values
    return Object.fromEntries(
      Object.entries(vars).map(([k, v]) => [k, escapeTemplateValue(v)])
    );
  })
});

function escapeTemplateValue(value: any): string {
  const str = String(value);
  // Escape template delimiters
  return str.replace(/{{/g, '\\{\\{').replace(/}}/g, '\\}\\}');
}
```

#### Secure Template Processor
```typescript
class SecureTemplateProcessor {
  private static readonly MAX_ITERATIONS = 1000;
  private static readonly MAX_OUTPUT_SIZE = 10 * 1024 * 1024; // 10MB
  
  process(template: string, variables: Record<string, any>): string {
    // Validate template size
    if (template.length > SecureTemplateProcessor.MAX_OUTPUT_SIZE) {
      throw new Error('Template too large');
    }
    
    // Use a safe template engine instead of regex replacement
    const ast = this.parseTemplate(template);
    const validated = this.validateAST(ast);
    return this.renderAST(validated, variables);
  }
  
  private parseTemplate(template: string): TemplateAST {
    // Parse template into AST to prevent injection
    // Implementation details...
  }
}
```

### Required Security Tests
```typescript
describe('Security', () => {
  describe('Path Traversal Protection', () => {
    it('should prevent directory traversal attacks', async () => {
      const attacks = [
        '../../../etc/passwd',
        '/etc/passwd',
        '..\\..\\..\\windows\\system32',
        './../../sensitive',
        '~/../../root'
      ];
      
      for (const attack of attacks) {
        await expect(createMCP({ outputPath: attack }))
          .rejects.toThrow(/Output path must be within current directory/);
      }
    });

    it('should prevent writing to system directories', async () => {
      const forbidden = ['/usr/local/bin/malware', '/etc/config'];
      for (const path of forbidden) {
        await expect(createMCP({ outputPath: path }))
          .rejects.toThrow(/Cannot write to system directories/);
      }
    });
  });

  describe('Template Injection Protection', () => {
    it('should escape template variables to prevent injection', async () => {
      const maliciousVars = {
        name: '}} console.log("hacked") {{',
        description: '{{process.exit(1)}}',
        xss: '<script>alert("xss")</script>'
      };
      
      const result = await processTemplate(template, maliciousVars);
      expect(result).not.toContain('console.log');
      expect(result).not.toContain('process.exit');
      expect(result).not.toContain('<script>');
    });
  });

  describe('Resource Limits', () => {
    it('should limit template processing time', async () => {
      const infiniteTemplate = '{{while(true){}}}';
      await expect(processTemplate(infiniteTemplate))
        .rejects.toThrow(/Template processing timeout/);
    });

    it('should limit output file size', async () => {
      const hugeVar = 'x'.repeat(100 * 1024 * 1024); // 100MB
      await expect(processTemplate('{{var}}', { var: hugeVar }))
        .rejects.toThrow(/Output too large/);
    });
  });
});
```

---

## Issue 4: Missing Template Files

### Problem
Template configurations reference files that don't exist, causing runtime failures.

### Missing Files Matrix
| Template | Missing File | Referenced In | Purpose |
|----------|-------------|---------------|---------|
| python-basic | src/__init__.py | template.json:49 | Package marker |
| python-basic | src/server.py | template.json:54 | Main server |
| python-basic | src/tools.py | template.json:58 | Tool definitions |
| python-basic | src/resources.py | template.json:62 | Resource handlers |
| python-basic | README.md | template.json:66 | Documentation |
| typescript-advanced | README.md | template.json:102 | Documentation |
| typescript-advanced | .env.example | template.json:106 | Config example |
| typescript-advanced | src/utils/logger.ts | imports | Logging utility |

### Solution: Template Validation System
```typescript
class TemplateValidator {
  async validate(templatePath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const manifest = await this.loadManifest(templatePath);
    
    // Validate all referenced files exist
    for (const file of manifest.files) {
      const filePath = path.join(templatePath, file.path);
      if (!await fs.pathExists(filePath)) {
        errors.push({
          type: 'MISSING_FILE',
          file: file.path,
          message: `Template file missing: ${file.path}`
        });
      }
    }
    
    // Validate imports in TypeScript files
    if (manifest.language === 'typescript') {
      await this.validateTypeScriptImports(templatePath, errors);
    }
    
    return { valid: errors.length === 0, errors };
  }
}
```

### Required Template Tests
```typescript
describe('Template Integrity', () => {
  const templates = ['basic', 'typescript-advanced', 'python-basic'];
  
  templates.forEach(templateName => {
    describe(`${templateName} template`, () => {
      it('should have all files referenced in template.json', async () => {
        const validator = new TemplateValidator();
        const result = await validator.validate(`templates/${templateName}`);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should generate a working project', async () => {
        const output = await generateProject(templateName, {
          name: 'test-project',
          description: 'Test'
        });
        
        // Verify generated project structure
        expect(await fs.pathExists(output.path)).toBe(true);
        
        // Verify it builds successfully
        if (templateName.includes('typescript')) {
          const { exitCode } = await execa('npm', ['run', 'build'], {
            cwd: output.path
          });
          expect(exitCode).toBe(0);
        }
      });
    });
  });
});
```

---

## Issue 5: Insufficient Tool Documentation

### Problem
Current tool descriptions lack critical information for LLM usage:
- No validation patterns in descriptions
- No examples of valid/invalid inputs
- No error message patterns
- No information about side effects

### Enhanced Tool Schema
```typescript
interface EnhancedToolSchema {
  name: string;
  description: string;
  examples: {
    valid: Example[];
    invalid: Example[];
  };
  parameters: {
    [key: string]: {
      type: string;
      description: string;
      pattern?: string;
      patternDescription?: string;
      examples?: string[];
      sideEffects?: string[];
    };
  };
  errors: {
    [errorCode: string]: {
      message: string;
      solution: string;
    };
  };
}
```

### Implementation Example
```typescript
const createMcpTool: EnhancedToolSchema = {
  name: 'create-mcp',
  description: `Generate a new MCP server from a template.

This tool creates a fully-functional MCP server with the specified configuration.
The server will be generated in the specified output directory with all necessary
files and dependencies configured.

Side effects:
- Creates new directory at output path
- Generates package.json with dependencies
- Creates source files based on template
- Adds entry to MCP registry`,
  
  examples: {
    valid: [
      {
        params: { name: 'weather-api', language: 'typescript' },
        description: 'Basic TypeScript MCP server'
      },
      {
        params: { name: 'data-processor', template: 'python-basic' },
        description: 'Python server with specific template'
      }
    ],
    invalid: [
      {
        params: { name: 'my_server' },
        error: 'Underscores not allowed in name'
      },
      {
        params: { name: 'MyServer' },
        error: 'Uppercase letters not allowed'
      }
    ]
  },
  
  parameters: {
    name: {
      type: 'string',
      description: `Name for the MCP server (required).
      
This will be used as:
- Package name in package.json
- Server identifier in MCP config
- Directory name for generated server
- Default command name when installed`,
      pattern: '^[a-z0-9-]+$',
      patternDescription: 'Only lowercase letters, numbers, and hyphens (no underscores, spaces, or uppercase)',
      examples: ['weather-api', 'data-processor', 'my-tool-123'],
      sideEffects: ['Creates directory with this name', 'Registers name in MCP registry']
    }
  },
  
  errors: {
    INVALID_NAME: {
      message: 'Server name does not match required pattern',
      solution: 'Use only lowercase letters, numbers, and hyphens. Examples: weather-api, my-tool-123'
    },
    DUPLICATE_NAME: {
      message: 'Server name already exists in registry',
      solution: 'Choose a different name or delete the existing server first'
    }
  }
};
```

### Required Documentation Tests
```typescript
describe('Tool Documentation', () => {
  it('should have complete documentation for all tools', async () => {
    const tools = await getAllTools();
    
    tools.forEach(tool => {
      // Verify description includes examples
      expect(tool.description).toMatch(/Examples?:/);
      
      // Verify parameters have patterns documented
      Object.entries(tool.parameters).forEach(([name, param]) => {
        if (param.pattern) {
          expect(param.patternDescription).toBeTruthy();
          expect(param.examples).toBeArray();
          expect(param.examples.length).toBeGreaterThan(0);
        }
      });
      
      // Verify error documentation
      expect(tool.errors).toBeDefined();
      Object.values(tool.errors).forEach(error => {
        expect(error.message).toBeTruthy();
        expect(error.solution).toBeTruthy();
      });
    });
  });

  it('should generate helpful error messages from documentation', async () => {
    const tool = getToolSchema('create-mcp');
    const error = tool.errors.INVALID_NAME;
    
    const message = formatError('INVALID_NAME', { name: 'my_server' });
    expect(message).toContain(error.message);
    expect(message).toContain(error.solution);
    expect(message).toContain('Examples:');
  });
});
```

---

## Issue 6: Comprehensive Test Coverage Requirements

### Test Coverage Matrix

| Component | Current Coverage | Required Coverage | Priority |
|-----------|-----------------|-------------------|----------|
| Path Resolution | 0% | 90% | Critical |
| NPM Distribution | 0% | 85% | Critical |
| Security Validation | 0% | 95% | Critical |
| Template Processing | 45% | 85% | High |
| Tool Documentation | 0% | 80% | High |
| Error Handling | 30% | 90% | High |

### Integration Test Suite
```typescript
describe('End-to-End Integration', () => {
  it('should work from npm global install to project creation', async () => {
    // 1. Simulate npm install -g @context-pods/cli
    await simulateGlobalInstall();
    
    // 2. Run CLI command
    const result = await execa('context-pods', [
      'create-mcp',
      '--name', 'test-integration',
      '--template', 'basic'
    ]);
    
    expect(result.exitCode).toBe(0);
    
    // 3. Verify generated project
    const projectPath = path.join(process.cwd(), 'test-integration');
    expect(await fs.pathExists(projectPath)).toBe(true);
    
    // 4. Build and run the generated project
    const buildResult = await execa('npm', ['run', 'build'], {
      cwd: projectPath
    });
    expect(buildResult.exitCode).toBe(0);
    
    // 5. Verify MCP server starts
    const server = spawn('npm', ['start'], { cwd: projectPath });
    await waitForServerReady(server);
    
    // 6. Test MCP protocol
    const response = await sendMCPRequest(server, {
      method: 'list_tools'
    });
    expect(response.tools).toBeArray();
  });
});
```

---

## Implementation Plan (Revised)

### Phase 1: Security & Critical Fixes (Week 1)
1. **Implement security validation layer** - Prevent path traversal and injection
2. **Fix npm dependencies** - Replace file: references
3. **Add security test suite** - Comprehensive security testing

### Phase 2: Architecture Refactoring (Week 2)
1. **Implement Template Registry pattern** - Modular template sources
2. **Refactor path resolution** - Clear, testable architecture
3. **Add bundling mechanism** - Include templates in npm packages

### Phase 3: Template Completion (Week 3)
1. **Create missing template files** - Complete all templates
2. **Implement template validator** - Automated validation
3. **Add template tests** - Ensure all templates work

### Phase 4: Documentation & Testing (Week 4)
1. **Enhance tool documentation** - Full examples and patterns
2. **Implement comprehensive test suite** - 90%+ coverage
3. **Add integration tests** - End-to-end validation

### Phase 5: Release Preparation (Week 5)
1. **Performance testing** - Ensure scalability
2. **Security audit** - External review
3. **Documentation review** - User guides and API docs

---

## Success Criteria (Enhanced)

- ✓ **Security**: No path traversal or injection vulnerabilities
- ✓ **NPM Distribution**: Works from `npm install -g @context-pods/cli`
- ✓ **Path Resolution**: Templates found in all contexts (global, local, MCP)
- ✓ **Template Integrity**: All templates generate working projects
- ✓ **LLM Usability**: Zero validation errors with proper documentation
- ✓ **Test Coverage**: >85% coverage with security tests
- ✓ **Performance**: <2s template generation time
- ✓ **Error Messages**: Actionable solutions for all errors

## Risk Mitigation

1. **Breaking Changes**: Version bump to 1.0.0 with migration guide
2. **Performance Impact**: Benchmark before/after changes
3. **Compatibility**: Test with Node 16, 18, 20
4. **Security**: External security audit before release

## Monitoring & Metrics

Post-release monitoring:
- Error rates by template type
- Path resolution failure rates
- Time to successful project generation
- User feedback on error messages

---

**🔴 CRITICAL** - These architectural and security issues must be addressed before any production use. The current implementation has fundamental flaws that require comprehensive refactoring, not just surface-level fixes.