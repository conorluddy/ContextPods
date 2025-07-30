# Fix Critical Issues: Template Path Resolution, NPM Distribution, Security, and Tool Documentation

## Executive Summary

The Context-Pods toolkit has critical architectural, security, and distribution issues preventing production use. This comprehensive issue documents all problems discovered through testing and code analysis, provides detailed technical solutions with full test coverage requirements, and outlines a phased implementation plan with clear success metrics.

## Critical Issues Overview

1. **NPM Package Distribution Failures** - Packages cannot be installed/used via npm
2. **Template Path Resolution Architecture Flaws** - 5 failing fallback strategies  
3. **Security Vulnerabilities** - Path traversal and template injection risks
4. **Missing Template Files** - Runtime failures from nonexistent files
5. **Insufficient Tool Documentation** - LLMs cannot use tools without errors
6. **Zero Test Coverage** - No tests for critical path resolution logic
7. **Performance Issues** - No benchmarks or optimization
8. **No Migration Strategy** - Breaking changes without upgrade path

---

## Issue 1: NPM Package Distribution Failures

### Problem Analysis
The current package configuration makes npm distribution impossible:
- `file:../core` references break in npm context
- Templates excluded from npm package files
- No differentiation between global vs local installations
- Binary file handling not configured

### Root Cause
```json
// Current broken configuration
{
  "dependencies": {
    "@context-pods/core": "file:../core" // Fails in npm
  },
  "files": ["dist", "bin"] // Missing templates
}
```

### Solution: Complete NPM Distribution Strategy

#### Package Configuration
```json
{
  "name": "@context-pods/cli",
  "version": "1.0.0",
  "dependencies": {
    "@context-pods/core": "^1.0.0"
  },
  "files": [
    "dist",
    "bin", 
    "templates",
    "README.md",
    "LICENSE"
  ],
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

#### Build-time Template Bundling
```typescript
// build/bundle-templates.ts
import { glob } from 'glob';
import { copySync } from 'fs-extra';
import { createHash } from 'crypto';

export async function bundleTemplates() {
  const templates = await glob('templates/**/*', {
    nodir: true,
    dot: true
  });
  
  const manifest = {
    version: '1.0.0',
    templates: {} as Record<string, TemplateManifest>
  };
  
  for (const file of templates) {
    // Copy to dist
    copySync(file, `dist/${file}`);
    
    // Generate integrity hash
    const content = await fs.readFile(file);
    const hash = createHash('sha256').update(content).digest('hex');
    
    // Add to manifest
    manifest.templates[file] = {
      path: file,
      hash,
      size: content.length
    };
  }
  
  // Write manifest for verification
  await fs.writeJson('dist/templates/manifest.json', manifest);
}
```

### Required Tests
```typescript
describe('NPM Package Distribution', () => {
  describe('Package Structure', () => {
    it('should include all required files in npm package', async () => {
      const files = await getPackageFiles('@context-pods/cli');
      const required = [
        'dist/cli.js',
        'bin/context-pods',
        'templates/basic/template.json',
        'templates/typescript-advanced/template.json',
        'templates/python-basic/template.json',
        'templates/manifest.json'
      ];
      
      required.forEach(file => {
        expect(files).toContain(file);
      });
    });

    it('should maintain file permissions in package', async () => {
      const binFile = 'node_modules/@context-pods/cli/bin/context-pods';
      const stats = await fs.stat(binFile);
      expect(stats.mode & 0o111).toBeTruthy(); // Executable
    });
  });

  describe('Installation Scenarios', () => {
    it('should work with global npm installation', async () => {
      await execa('npm', ['install', '-g', '@context-pods/cli']);
      const result = await execa('context-pods', ['--version']);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should work with local npm installation', async () => {
      await execa('npm', ['install', '@context-pods/cli']);
      const result = await execa('npx', ['context-pods', '--version']);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should work with yarn installation', async () => {
      await execa('yarn', ['add', '@context-pods/cli']);
      const result = await execa('yarn', ['context-pods', '--version']);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });
});
```

---

## Issue 2: Template Path Resolution Architecture Flaws

### Problem Analysis
Current implementation uses 5 cascading strategies that all fail:
1. Project root search - fails in npm context
2. Relative path ../../../../../templates - hardcoded depth
3. Original path fallback - legacy code
4. Source directory perspective - assumes development
5. Return "most likely" path - returns invalid path

### Solution: Template Registry Architecture

#### Core Registry Pattern
```typescript
// src/registry/TemplateRegistry.ts
export interface TemplateSource {
  name: string;
  priority: number;
  isAvailable(): Promise<boolean>;
  load(templateName: string): Promise<Template>;
  list(): Promise<TemplateMetadata[]>;
}

export class TemplateRegistry {
  private sources = new Map<string, TemplateSource>();
  private cache = new LRUCache<string, Template>({ max: 100 });
  
  constructor(private config: RegistryConfig) {
    this.registerDefaultSources();
  }
  
  private registerDefaultSources() {
    // Priority order matters - first match wins
    this.register(new EnvironmentVariableSource(1));
    this.register(new BundledTemplateSource(2));
    this.register(new UserDirectorySource(3));
    this.register(new GitHubTemplateSource(4));
    this.register(new RegistryTemplateSource(5));
  }
  
  async getTemplate(name: string, version?: string): Promise<Template> {
    const cacheKey = `${name}@${version || 'latest'}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    // Try each source in priority order
    const sources = Array.from(this.sources.values())
      .sort((a, b) => a.priority - b.priority);
    
    for (const source of sources) {
      if (await source.isAvailable()) {
        try {
          const template = await source.load(name);
          this.cache.set(cacheKey, template);
          return template;
        } catch (error) {
          // Log and continue to next source
          logger.debug(`Source ${source.name} failed: ${error.message}`);
        }
      }
    }
    
    // No source could provide template
    throw new TemplateNotFoundError(name, sources);
  }
}
```

#### Template Source Implementations
```typescript
// Bundled templates (highest priority for npm packages)
export class BundledTemplateSource implements TemplateSource {
  name = 'bundled';
  priority = 2;
  
  private bundlePath: string;
  
  constructor() {
    // Resolve bundled templates relative to package
    this.bundlePath = path.join(
      path.dirname(require.resolve('@context-pods/cli/package.json')),
      'templates'
    );
  }
  
  async isAvailable(): Promise<boolean> {
    return fs.pathExists(this.bundlePath);
  }
  
  async load(name: string): Promise<Template> {
    const templatePath = path.join(this.bundlePath, name);
    if (!await fs.pathExists(templatePath)) {
      throw new Error(`Template ${name} not found in bundled templates`);
    }
    
    // Verify integrity
    const manifest = await fs.readJson(
      path.join(this.bundlePath, 'manifest.json')
    );
    await this.verifyIntegrity(templatePath, manifest);
    
    return new Template(templatePath);
  }
}

// User directory templates (~/.context-pods/templates)
export class UserDirectorySource implements TemplateSource {
  name = 'user-directory';
  priority = 3;
  
  private userPath: string;
  
  constructor() {
    this.userPath = path.join(os.homedir(), '.context-pods', 'templates');
  }
  
  async isAvailable(): Promise<boolean> {
    return fs.pathExists(this.userPath);
  }
  
  async load(name: string): Promise<Template> {
    const templatePath = path.join(this.userPath, name);
    return new Template(templatePath);
  }
}
```

### Path Resolution Tests
```typescript
describe('Template Path Resolution', () => {
  let registry: TemplateRegistry;
  
  beforeEach(() => {
    registry = new TemplateRegistry({ cache: false });
  });
  
  describe('Priority Resolution', () => {
    it('should prioritize environment variable over all sources', async () => {
      process.env.CONTEXT_PODS_TEMPLATES_PATH = '/custom/templates';
      mockFs({
        '/custom/templates/basic/template.json': '{"name":"basic"}',
        '/bundled/templates/basic/template.json': '{"name":"bundled"}'
      });
      
      const template = await registry.getTemplate('basic');
      expect(template.path).toBe('/custom/templates/basic');
    });
    
    it('should fall back through sources in priority order', async () => {
      // Mock bundled templates not available
      mockFs({
        [path.join(os.homedir(), '.context-pods/templates/basic')]: {
          'template.json': '{"name":"user"}'
        }
      });
      
      const template = await registry.getTemplate('basic');
      expect(template.source).toBe('user-directory');
    });
  });
  
  describe('Error Handling', () => {
    it('should provide helpful error when template not found', async () => {
      await expect(registry.getTemplate('nonexistent'))
        .rejects.toThrow(TemplateNotFoundError);
        
      try {
        await registry.getTemplate('nonexistent');
      } catch (error) {
        expect(error.message).toContain('Template "nonexistent" not found');
        expect(error.message).toContain('Searched in:');
        expect(error.message).toContain('1. Environment variable');
        expect(error.message).toContain('2. Bundled templates');
        expect(error.message).toContain('3. User directory');
      }
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle corrupted template gracefully', async () => {
      mockFs({
        '/templates/corrupted/template.json': 'invalid json {'
      });
      
      await expect(registry.getTemplate('corrupted'))
        .rejects.toThrow(/Failed to parse template/);
    });
    
    it('should handle missing permissions', async () => {
      mockFs({
        '/templates/restricted': mockFs.directory({
          mode: 0o000,
          items: { 'template.json': '{}' }
        })
      });
      
      await expect(registry.getTemplate('restricted'))
        .rejects.toThrow(/Permission denied/);
    });
  });
});
```

---

## Issue 3: Security Vulnerabilities

### Critical Security Issues

#### A. Path Traversal Vulnerability
```typescript
// Current vulnerable code
const outputPath = options.output || './generated';
fs.mkdirSync(outputPath, { recursive: true }); // Allows ../../../../etc
```

#### B. Template Injection Vulnerability  
```typescript
// Current vulnerable code
content.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value);
// If value = "}} malicious() {{" - code execution possible
```

#### C. Command Injection in Script Wrapping
```typescript
// Current vulnerable code
await execa(interpreter, [scriptPath]); // No validation
```

### Security Solution: Defense in Depth

#### Input Validation Layer
```typescript
import { z } from 'zod';
import path from 'path';

export const SecuritySchema = {
  serverName: z.string()
    .min(1).max(50)
    .regex(/^[a-z0-9-]+$/)
    .refine(name => !name.startsWith('.'), 'Name cannot start with dot')
    .refine(name => !name.startsWith('-'), 'Name cannot start with hyphen')
    .refine(name => !RESERVED_NAMES.includes(name), 'Reserved name'),
    
  outputPath: z.string().transform((input, ctx) => {
    // Normalize and resolve path
    const normalized = path.normalize(input);
    const resolved = path.resolve(process.cwd(), normalized);
    
    // Security checks
    const checks = [
      {
        test: () => resolved.startsWith(process.cwd()),
        error: 'Output path must be within current directory'
      },
      {
        test: () => !resolved.includes('..'),
        error: 'Path traversal detected'
      },
      {
        test: () => !FORBIDDEN_PATHS.some(p => resolved.startsWith(p)),
        error: 'Cannot write to system directories'
      },
      {
        test: () => resolved.length < 260, // Windows MAX_PATH
        error: 'Path too long'
      }
    ];
    
    for (const check of checks) {
      if (!check.test()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: check.error
        });
        return z.NEVER;
      }
    }
    
    return resolved;
  }),
  
  templateVariables: z.record(
    z.string().max(50),
    z.any().transform(val => sanitizeValue(val))
  ).refine(
    vars => Object.keys(vars).length < 100,
    'Too many variables'
  )
};

function sanitizeValue(value: any): string {
  const str = String(value).slice(0, 1000); // Limit length
  
  // Escape template syntax
  return str
    .replace(/{{/g, '\\{\\{')
    .replace(/}}/g, '\\}\\}')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
```

#### Secure Template Engine
```typescript
export class SecureTemplateEngine {
  private readonly sandbox: VM;
  
  constructor() {
    // Create sandboxed environment
    this.sandbox = new VM({
      timeout: 5000, // 5 second timeout
      sandbox: {
        // Limited, safe API
        console: { log: () => {} },
        Buffer: undefined,
        process: undefined,
        require: undefined,
        __dirname: undefined,
        __filename: undefined
      }
    });
  }
  
  async processTemplate(
    template: string, 
    variables: Record<string, any>
  ): Promise<string> {
    // Parse template to AST
    const ast = await this.parseTemplate(template);
    
    // Validate AST for safety
    this.validateAST(ast);
    
    // Process with resource limits
    const limiter = new ResourceLimiter({
      maxMemory: 50 * 1024 * 1024, // 50MB
      maxCPU: 1000, // 1 second CPU time
      maxOutput: 10 * 1024 * 1024 // 10MB output
    });
    
    return limiter.run(() => this.renderAST(ast, variables));
  }
  
  private validateAST(ast: TemplateAST) {
    // Check for dangerous patterns
    const forbidden = [
      /eval\s*\(/,
      /Function\s*\(/,
      /require\s*\(/,
      /import\s+/,
      /process\./,
      /child_process/
    ];
    
    const code = ast.toString();
    for (const pattern of forbidden) {
      if (pattern.test(code)) {
        throw new SecurityError(`Forbidden pattern detected: ${pattern}`);
      }
    }
  }
}
```

#### File System Security
```typescript
export class SecureFileSystem {
  constructor(
    private allowedRoot: string,
    private quotas: FileSystemQuotas
  ) {}
  
  async writeFile(relativePath: string, content: Buffer | string) {
    // Validate path
    const safePath = this.validatePath(relativePath);
    
    // Check quotas
    await this.checkQuotas(safePath, content);
    
    // Write with restricted permissions
    await fs.writeFile(safePath, content, {
      mode: 0o644, // rw-r--r--
      flag: 'wx' // Fail if exists
    });
    
    // Verify write
    await this.verifyWrite(safePath, content);
  }
  
  private validatePath(input: string): string {
    // Remove null bytes
    const cleaned = input.replace(/\0/g, '');
    
    // Normalize
    const normalized = path.normalize(cleaned);
    
    // Resolve
    const resolved = path.resolve(this.allowedRoot, normalized);
    
    // Verify within allowed root
    if (!resolved.startsWith(this.allowedRoot)) {
      throw new SecurityError('Path traversal attempt detected');
    }
    
    // Check against blocklist
    if (this.isBlocklisted(resolved)) {
      throw new SecurityError('Forbidden file path');
    }
    
    return resolved;
  }
}
```

### Security Test Suite
```typescript
describe('Security', () => {
  describe('Path Traversal Protection', () => {
    const attacks = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      'foo/../../bar',
      './././../../../etc',
      '%2e%2e%2f%2e%2e%2f',
      'foo\0/../../etc/passwd',
      '.../.../.../',
      'C:\\Windows\\System32',
      '/etc/passwd',
      '\\\\server\\share\\file'
    ];
    
    it.each(attacks)('should block path traversal: %s', async (attack) => {
      await expect(createMCP({ outputPath: attack }))
        .rejects.toThrow(/path traversal|forbidden|outside/i);
    });
  });
  
  describe('Template Injection Protection', () => {
    const injections = [
      { name: '{{', expected: 'Name cannot contain template syntax' },
      { name: '}} evil() {{', expected: 'Template injection detected' },
      { script: '"; rm -rf /', expected: 'Command injection detected' },
      { html: '<script>alert(1)</script>', expected: 'XSS detected' }
    ];
    
    it.each(injections)('should block injection: %s', async (injection) => {
      await expect(processTemplate({ variables: injection }))
        .rejects.toThrow(injection.expected);
    });
  });
  
  describe('Resource Limits', () => {
    it('should enforce memory limits', async () => {
      const hugeVar = 'x'.repeat(100 * 1024 * 1024); // 100MB
      await expect(processTemplate({ name: hugeVar }))
        .rejects.toThrow(/Memory limit exceeded/);
    });
    
    it('should enforce time limits', async () => {
      const infinite = 'while(true){}';
      await expect(processTemplate(infinite))
        .rejects.toThrow(/Timeout/);
    });
    
    it('should enforce output limits', async () => {
      const bomb = '{{name.repeat(1000000)}}';
      await expect(processTemplate(bomb, { name: 'x' }))
        .rejects.toThrow(/Output too large/);
    });
  });
  
  describe('Privilege Escalation', () => {
    it('should prevent SUID bit setting', async () => {
      await expect(writeFile('script.sh', '#!/bin/bash', { mode: 0o4755 }))
        .rejects.toThrow(/Cannot set SUID/);
    });
    
    it('should prevent symlink attacks', async () => {
      await fs.symlink('/etc/passwd', 'link');
      await expect(writeFile('link', 'malicious'))
        .rejects.toThrow(/Cannot write to symlink/);
    });
  });
});
```

---

## Issue 4: Missing Template Files

### Comprehensive Missing Files Analysis

| Template | File | Status | Purpose | Impact |
|----------|------|--------|---------|--------|
| python-basic | src/__init__.py | Missing | Package marker | Import errors |
| python-basic | src/server.py | Missing | Main server | Cannot start |
| python-basic | src/tools.py | Missing | Tool definitions | No functionality |
| python-basic | src/resources.py | Missing | Resources | No resources |
| python-basic | README.md | Missing | Documentation | Poor UX |
| typescript-advanced | README.md | Missing | Documentation | Poor UX |
| typescript-advanced | .env.example | Missing | Config example | Setup confusion |
| typescript-advanced | src/utils/logger.ts | Missing* | Logging | Build errors |

*Referenced in imports but not in template.json

### Solution: Template Validation System

#### Pre-flight Validation
```typescript
export class TemplateValidator {
  private rules: ValidationRule[] = [
    new FileExistenceRule(),
    new ImportValidationRule(),
    new SchemaValidationRule(),
    new DependencyValidationRule(),
    new SecurityValidationRule()
  ];
  
  async validate(templatePath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Load template manifest
    const manifest = await this.loadManifest(templatePath);
    
    // Run all validation rules
    for (const rule of this.rules) {
      const result = await rule.validate(templatePath, manifest);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      manifest
    };
  }
}

// Validation rules
class FileExistenceRule implements ValidationRule {
  async validate(
    templatePath: string, 
    manifest: TemplateManifest
  ): Promise<RuleResult> {
    const errors: ValidationError[] = [];
    
    for (const file of manifest.files) {
      const filePath = path.join(templatePath, file.path);
      
      if (!await fs.pathExists(filePath)) {
        errors.push({
          code: 'MISSING_FILE',
          severity: 'error',
          file: file.path,
          message: `Template file does not exist: ${file.path}`,
          suggestion: `Create the file or remove it from template.json`
        });
      }
    }
    
    return { errors, warnings: [] };
  }
}

class ImportValidationRule implements ValidationRule {
  async validate(
    templatePath: string,
    manifest: TemplateManifest
  ): Promise<RuleResult> {
    const errors: ValidationError[] = [];
    
    // Only check TypeScript/JavaScript files
    const codeFiles = manifest.files.filter(f => 
      /\.(ts|js|mjs|jsx|tsx)$/.test(f.path)
    );
    
    for (const file of codeFiles) {
      const content = await fs.readFile(
        path.join(templatePath, file.path), 
        'utf-8'
      );
      
      // Extract imports
      const imports = this.extractImports(content);
      
      for (const imp of imports) {
        if (imp.type === 'relative') {
          const importPath = path.resolve(
            path.dirname(file.path),
            imp.path
          );
          
          // Check if imported file exists
          const exists = await this.resolveImport(templatePath, importPath);
          
          if (!exists) {
            errors.push({
              code: 'MISSING_IMPORT',
              severity: 'error',
              file: file.path,
              message: `Import not found: ${imp.path}`,
              line: imp.line,
              suggestion: `Create ${importPath} or update the import`
            });
          }
        }
      }
    }
    
    return { errors, warnings: [] };
  }
}
```

#### Template Creation Helper
```typescript
export class TemplateCreator {
  async createMissingFiles(
    templatePath: string,
    validation: ValidationResult
  ): Promise<void> {
    const missingFiles = validation.errors
      .filter(e => e.code === 'MISSING_FILE')
      .map(e => e.file);
    
    for (const file of missingFiles) {
      const filePath = path.join(templatePath, file);
      const content = this.generateDefaultContent(file);
      
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content);
      
      console.log(`Created missing file: ${file}`);
    }
  }
  
  private generateDefaultContent(filename: string): string {
    const ext = path.extname(filename);
    const name = path.basename(filename, ext);
    
    const templates = {
      '.py': `"""${name} module"""\n\n`,
      '.ts': `// ${name}\n\nexport {};\n`,
      '.js': `// ${name}\n\nmodule.exports = {};\n`,
      '.md': `# ${name}\n\n<!-- TODO: Add documentation -->\n`,
      '.json': '{\n  \n}\n'
    };
    
    return templates[ext] || '';
  }
}
```

### Template Integrity Tests
```typescript
describe('Template Integrity', () => {
  const validator = new TemplateValidator();
  const templates = ['basic', 'typescript-advanced', 'python-basic'];
  
  describe.each(templates)('%s template', (templateName) => {
    let templatePath: string;
    
    beforeAll(() => {
      templatePath = path.join(__dirname, '../../templates', templateName);
    });
    
    it('should pass all validation rules', async () => {
      const result = await validator.validate(templatePath);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      // Log warnings for information
      if (result.warnings.length > 0) {
        console.warn(`Template ${templateName} warnings:`, result.warnings);
      }
    });
    
    it('should have all files in template.json', async () => {
      const manifest = await fs.readJson(
        path.join(templatePath, 'template.json')
      );
      
      for (const file of manifest.files) {
        const exists = await fs.pathExists(
          path.join(templatePath, file.path)
        );
        expect(exists).toBe(true);
      }
    });
    
    it('should generate a buildable project', async () => {
      const output = await generateProject(templateName, {
        name: 'test-integrity',
        description: 'Integrity test'
      });
      
      // Language-specific build tests
      switch (manifest.language) {
        case 'typescript':
          const { exitCode } = await execa('npm', ['run', 'build'], {
            cwd: output.path
          });
          expect(exitCode).toBe(0);
          break;
          
        case 'python':
          const { exitCode: pyCode } = await execa('python', ['-m', 'py_compile', 'main.py'], {
            cwd: output.path
          });
          expect(pyCode).toBe(0);
          break;
      }
    });
    
    it('should start as MCP server', async () => {
      const server = await startMCPServer(output.path);
      
      // Test MCP protocol
      const response = await server.request({
        method: 'list_tools'
      });
      
      expect(response).toHaveProperty('tools');
      expect(Array.isArray(response.tools)).toBe(true);
      
      await server.stop();
    });
  });
});
```

---

## Issue 5: Insufficient Tool Documentation

### Current State
LLMs cannot use tools effectively due to:
- No validation patterns in descriptions
- No examples of valid/invalid inputs  
- Missing error documentation
- No information about side effects

### Solution: Enhanced Tool Documentation System

#### Tool Documentation Schema
```typescript
export interface EnhancedToolDefinition {
  // Basic info
  name: string;
  category: 'generation' | 'management' | 'utility';
  
  // Rich description
  description: {
    summary: string;
    details: string;
    sideEffects: string[];
    prerequisites: string[];
  };
  
  // Examples
  examples: {
    basic: Example[];
    advanced: Example[];
    errors: ErrorExample[];
  };
  
  // Parameters with full documentation
  parameters: Record<string, ParameterDefinition>;
  
  // Error catalog
  errors: Record<string, ErrorDefinition>;
  
  // Related functionality
  related: {
    tools: string[];
    resources: string[];
    documentation: string[];
  };
}

interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  
  // Validation
  validation?: {
    pattern?: string;
    patternExplanation?: string;
    min?: number;
    max?: number;
    enum?: any[];
    custom?: (value: any) => boolean;
  };
  
  // Examples
  examples: {
    valid: any[];
    invalid: { value: any; reason: string }[];
  };
  
  // Behavior
  default?: any;
  affects: string[];
  sideEffects?: string[];
}
```

#### Implementation Example: create-mcp Tool
```typescript
export const createMcpToolDefinition: EnhancedToolDefinition = {
  name: 'create-mcp',
  category: 'generation',
  
  description: {
    summary: 'Generate a new MCP server from a template',
    details: `Creates a fully-functional MCP server with the specified configuration.
    
The tool will:
1. Validate all inputs according to MCP naming conventions
2. Select the appropriate template based on language/requirements
3. Generate all necessary files with proper structure
4. Configure dependencies and build scripts
5. Register the server in the Context-Pods registry
6. Optionally generate .mcp.json configuration

The generated server is immediately ready for development with hot-reload
support (for supported templates) and can be built for production use.`,
    
    sideEffects: [
      'Creates new directory at specified output path',
      'Writes multiple files to disk',
      'Adds entry to Context-Pods registry database',
      'May download template dependencies'
    ],
    
    prerequisites: [
      'Write access to output directory',
      'Node.js installed (for TypeScript templates)',
      'Python installed (for Python templates)',
      'Git installed (for version control)'
    ]
  },
  
  examples: {
    basic: [
      {
        description: 'Create a basic TypeScript MCP server',
        input: {
          name: 'weather-api',
          language: 'typescript',
          description: 'MCP server for weather data'
        },
        output: {
          success: true,
          path: './weather-api',
          message: 'Server created successfully'
        }
      }
    ],
    
    advanced: [
      {
        description: 'Create server with custom output and MCP config',
        input: {
          name: 'data-processor',
          template: 'typescript-advanced',
          outputPath: '/projects/mcp-servers',
          description: 'Advanced data processing server',
          variables: {
            includeLogging: true,
            includeValidation: true,
            toolCategories: ['data', 'file', 'network']
          },
          generateMcpConfig: true,
          configPath: '~/.mcp.json'
        }
      }
    ],
    
    errors: [
      {
        description: 'Invalid name format',
        input: { name: 'my_server' },
        error: 'INVALID_NAME',
        message: 'Name contains invalid characters'
      }
    ]
  },
  
  parameters: {
    name: {
      type: 'string',
      description: `Unique identifier for the MCP server.
      
This name will be used as:
- Package name in package.json (npm compatibility required)
- Server identifier in MCP protocol
- Directory name for the generated project
- Command name when server is installed globally
- Registry identifier in Context-Pods

The name must be unique across your Context-Pods installation.`,
      
      required: true,
      
      validation: {
        pattern: '^[a-z0-9-]+$',
        patternExplanation: 'Only lowercase letters (a-z), numbers (0-9), and hyphens (-) are allowed. No spaces, underscores, or uppercase letters.',
        min: 1,
        max: 50,
        custom: (name) => !RESERVED_NAMES.includes(name)
      },
      
      examples: {
        valid: [
          'weather-api',
          'data-processor',
          'my-tool-123',
          'github-integration',
          'ai-assistant'
        ],
        invalid: [
          { value: 'my_server', reason: 'Underscores not allowed' },
          { value: 'MyServer', reason: 'Uppercase letters not allowed' },
          { value: 'my server', reason: 'Spaces not allowed' },
          { value: 'node', reason: 'Reserved name' },
          { value: '.hidden', reason: 'Cannot start with dot' }
        ]
      },
      
      affects: ['package.json name', 'directory name', 'registry entry'],
      sideEffects: ['Creates directory with this name']
    },
    
    template: {
      type: 'string',
      description: `Template to use for server generation.
      
Available templates:
- basic: Minimal TypeScript server with essential MCP features
- typescript-advanced: Full-featured TypeScript with utilities and examples  
- python-basic: Simple Python server for scripts and automation

If not specified, the tool will select based on the 'language' parameter.
Use 'list-mcps --format=json' to see all available templates with details.`,
      
      required: false,
      
      validation: {
        enum: ['basic', 'typescript-advanced', 'python-basic']
      },
      
      examples: {
        valid: ['basic', 'typescript-advanced', 'python-basic'],
        invalid: [
          { value: 'custom', reason: 'Template does not exist' },
          { value: 'typescript', reason: 'Use typescript-advanced or basic' }
        ]
      },
      
      affects: ['project structure', 'available features', 'dependencies']
    }
  },
  
  errors: {
    INVALID_NAME: {
      code: 'INVALID_NAME',
      message: 'Server name does not match required pattern',
      solution: `Server names must:
- Use only lowercase letters, numbers, and hyphens
- Be 1-50 characters long
- Not start with a hyphen or dot
- Not be a reserved name

Valid examples: weather-api, data-processor, my-tool-123`
    },
    
    DUPLICATE_NAME: {
      code: 'DUPLICATE_NAME', 
      message: 'A server with this name already exists',
      solution: `Choose a different name or:
1. Delete the existing server: context-pods delete {{name}}
2. Use --force flag to overwrite (destructive)
3. List existing servers: context-pods list`
    },
    
    TEMPLATE_NOT_FOUND: {
      code: 'TEMPLATE_NOT_FOUND',
      message: 'Specified template does not exist',
      solution: `Available templates:
{{availableTemplates}}

To see all templates: context-pods templates`
    }
  },
  
  related: {
    tools: ['list-mcps', 'validate-mcp', 'wrap-script'],
    resources: ['context-pods://templates/', 'context-pods://mcps/'],
    documentation: ['/docs/creating-servers', '/docs/templates']
  }
};
```

#### Documentation Generation & Validation
```typescript
export class DocumentationGenerator {
  generateMarkdown(tool: EnhancedToolDefinition): string {
    return `# ${tool.name}

${tool.description.summary}

## Details

${tool.description.details}

## Parameters

${this.generateParameterDocs(tool.parameters)}

## Examples

### Basic Usage
${this.generateExamples(tool.examples.basic)}

### Advanced Usage  
${this.generateExamples(tool.examples.advanced)}

## Error Handling
${this.generateErrorDocs(tool.errors)}

## Side Effects
${tool.description.sideEffects.map(s => `- ${s}`).join('\n')}

## Related
- Tools: ${tool.related.tools.join(', ')}
- Resources: ${tool.related.resources.join(', ')}
`;
  }
}
```

### Documentation Tests
```typescript
describe('Tool Documentation', () => {
  const tools = loadAllTools();
  
  describe.each(tools)('$name tool', (tool) => {
    it('should have complete documentation', () => {
      // Basic fields
      expect(tool.description.summary).toBeTruthy();
      expect(tool.description.details).toBeTruthy();
      expect(tool.description.sideEffects).toBeInstanceOf(Array);
      
      // Examples
      expect(tool.examples.basic.length).toBeGreaterThan(0);
      expect(tool.examples.errors.length).toBeGreaterThan(0);
    });
    
    it('should document all parameter validations', () => {
      Object.entries(tool.parameters).forEach(([name, param]) => {
        if (param.validation?.pattern) {
          expect(param.validation.patternExplanation).toBeTruthy();
          expect(param.examples.valid.length).toBeGreaterThan(2);
          expect(param.examples.invalid.length).toBeGreaterThan(1);
        }
      });
    });
    
    it('should have actionable error messages', () => {
      Object.values(tool.errors).forEach(error => {
        expect(error.message).toBeTruthy();
        expect(error.solution).toBeTruthy();
        expect(error.solution).toContain('example');
      });
    });
    
    it('should generate valid examples', async () => {
      for (const example of tool.examples.basic) {
        const result = await validateToolInput(tool.name, example.input);
        expect(result.valid).toBe(true);
      }
    });
  });
});
```

---

## Issue 6: Performance Requirements & Benchmarks

### Performance Standards

```yaml
performance_requirements:
  template_operations:
    list_templates:
      p50: 10ms
      p95: 50ms
      p99: 100ms
    
    generate_small: # <10 files
      p50: 200ms
      p95: 500ms
      p99: 1s
      
    generate_large: # 100+ files  
      p50: 2s
      p95: 5s
      p99: 10s
  
  registry_operations:
    create_server:
      p50: 20ms
      p95: 50ms
      p99: 100ms
      
    search_simple:
      p50: 5ms
      p95: 20ms
      p99: 50ms
      
    search_complex: # with filters
      p50: 20ms
      p95: 100ms
      p99: 200ms
  
  resource_limits:
    memory:
      idle: 50MB
      active: 200MB
      peak: 500MB
      
    disk:
      template_cache: 100MB
      registry_db: 50MB
      temp_files: 200MB
```

### Performance Test Suite
```typescript
describe('Performance', () => {
  describe('Template Generation', () => {
    it('should meet performance targets for small templates', async () => {
      const times: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await generateTemplate('basic', {
          name: `perf-test-${i}`,
          outputPath: `/tmp/perf-${i}`
        });
        times.push(performance.now() - start);
      }
      
      const p95 = percentile(times, 95);
      expect(p95).toBeLessThan(500); // 500ms target
    });
  });
  
  describe('Memory Usage', () => {
    it('should not leak memory during repeated operations', async () => {
      const baseline = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 100; i++) {
        await generateTemplate('basic', {
          name: `mem-test-${i}`
        });
      }
      
      global.gc(); // Force garbage collection
      const final = process.memoryUsage().heapUsed;
      
      expect(final - baseline).toBeLessThan(10 * 1024 * 1024); // 10MB
    });
  });
});
```

---

## Issue 7: Migration Strategy

### Breaking Changes Management

```typescript
export interface MigrationPlan {
  fromVersion: string;
  toVersion: string;
  breaking: boolean;
  
  phases: MigrationPhase[];
  rollback: RollbackStrategy;
  
  validation: {
    pre: ValidationCheck[];
    post: ValidationCheck[];
  };
}

export class MigrationManager {
  async planMigration(
    currentVersion: string,
    targetVersion: string
  ): Promise<MigrationPlan> {
    const plan: MigrationPlan = {
      fromVersion: currentVersion,
      toVersion: targetVersion,
      breaking: this.hasBreakingChanges(currentVersion, targetVersion),
      phases: [],
      rollback: this.createRollbackStrategy(),
      validation: {
        pre: this.getPreChecks(),
        post: this.getPostChecks()
      }
    };
    
    // Add migration phases
    if (semver.major(targetVersion) > semver.major(currentVersion)) {
      plan.phases.push({
        name: 'Template Format Update',
        description: 'Update template.json to v2 format',
        automatic: true,
        reversible: true,
        script: 'migrations/template-v1-to-v2.js'
      });
      
      plan.phases.push({
        name: 'Registry Migration',
        description: 'Migrate SQLite database schema',
        automatic: true,
        reversible: true,
        requiresBackup: true,
        script: 'migrations/registry-v1-to-v2.js'
      });
    }
    
    return plan;
  }
  
  async executeMigration(plan: MigrationPlan): Promise<MigrationResult> {
    // Create backup
    const backup = await this.createBackup();
    
    try {
      // Run pre-validation
      await this.runValidation(plan.validation.pre);
      
      // Execute phases
      for (const phase of plan.phases) {
        await this.executePhase(phase);
      }
      
      // Run post-validation
      await this.runValidation(plan.validation.post);
      
      return { success: true, backup };
      
    } catch (error) {
      // Rollback on failure
      await this.rollback(backup);
      throw error;
    }
  }
}
```

### Migration CLI
```bash
# Check if migration needed
context-pods migrate check

# Show migration plan
context-pods migrate plan --target 2.0.0

# Execute migration with backup
context-pods migrate execute --backup ./backup-v1

# Rollback if needed
context-pods migrate rollback --from ./backup-v1
```

---

## Issue 8: CI/CD Pipeline Requirements

### Complete CI/CD Configuration

```yaml
name: Context-Pods CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  static-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: ESLint
        run: npm run lint -- --max-warnings 0
        
      - name: TypeScript
        run: npm run type-check -- --strict
        
      - name: Security Scan
        run: |
          npm audit --audit-level=moderate
          npx snyk test
          
      - name: License Check
        run: npx license-checker --failOn GPL

  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [16, 18, 20]
    
    runs-on: ${{ matrix.os }}
    steps:
      - name: Unit Tests
        run: npm test -- --coverage
        
      - name: Coverage Check
        run: npx nyc check-coverage --lines 80
        
      - name: Integration Tests
        run: npm run test:integration
        
      - name: E2E Tests
        run: npm run test:e2e

  performance:
    runs-on: ubuntu-latest
    steps:
      - name: Benchmark
        run: npm run benchmark
        
      - name: Memory Profile
        run: npm run profile:memory
        
      - name: Compare Results
        uses: benchmark-action/github-action-benchmark@v1
        with:
          fail-on-alert: true

  security:
    runs-on: ubuntu-latest
    steps:
      - name: SAST Scan
        uses: github/super-linter@v4
        
      - name: Container Scan
        run: trivy image context-pods:latest
        
      - name: Secrets Scan
        run: trufflehog filesystem ./

  release:
    needs: [static-analysis, test, performance, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - name: Semantic Release
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx semantic-release
```

---

## Implementation Timeline

### Week 1: Security & Critical Fixes
- [ ] Implement input validation layer
- [ ] Fix path traversal vulnerabilities  
- [ ] Add security test suite
- [ ] Fix npm package dependencies

### Week 2: Architecture Refactoring
- [ ] Implement Template Registry pattern
- [ ] Refactor path resolution logic
- [ ] Add template bundling to build
- [ ] Create registry source implementations

### Week 3: Template Completion
- [ ] Create all missing template files
- [ ] Implement template validator
- [ ] Add template integrity tests
- [ ] Fix import references

### Week 4: Documentation & Testing
- [ ] Implement enhanced tool documentation
- [ ] Create comprehensive test suite
- [ ] Add performance benchmarks
- [ ] Write migration guides

### Week 5: Release Preparation
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation review
- [ ] Beta testing

### Week 6: Release
- [ ] Final testing
- [ ] Version 1.0.0 release
- [ ] Monitor metrics
- [ ] Address feedback

---

## Success Metrics

### Technical Metrics
- ✅ Zero security vulnerabilities (SAST/DAST clean)
- ✅ 85%+ test coverage with mutation testing
- ✅ All performance targets met (p95 latencies)
- ✅ NPM installation works globally and locally
- ✅ Templates found in all execution contexts
- ✅ Zero validation errors for LLM usage

### User Experience Metrics  
- ✅ <30s from install to first server
- ✅ <5% error rate in production
- ✅ Clear error messages with solutions
- ✅ Comprehensive documentation
- ✅ Smooth migration from v0.x

### Operational Metrics
- ✅ <5min mean time to recovery
- ✅ >99.9% registry availability
- ✅ <1% rollback rate for releases
- ✅ Automated security scanning
- ✅ Performance regression detection

---

## Monitoring & Observability

### Metrics to Track
```typescript
interface ContextPodsMetrics {
  operations: {
    template_generation: Counter & Histogram;
    registry_operations: Counter & Histogram;
    validation_failures: Counter;
    security_blocks: Counter;
  };
  
  performance: {
    latency: Histogram;
    memory_usage: Gauge;
    disk_usage: Gauge;
    cache_hit_rate: Gauge;
  };
  
  errors: {
    by_type: Counter;
    by_component: Counter;
    recovery_time: Histogram;
  };
}
```

### Alerts
```yaml
alerts:
  - name: HighErrorRate
    expr: rate(errors_total[5m]) > 0.05
    severity: warning
    
  - name: PerformanceDegradation  
    expr: histogram_quantile(0.95, latency_seconds) > 1
    severity: warning
    
  - name: SecurityViolation
    expr: increase(security_blocks_total[1m]) > 0
    severity: critical
```

---

## Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking changes | High | High | Semantic versioning, migration tools |
| Performance regression | Medium | Medium | Automated benchmarks, monitoring |
| Security vulnerability | Low | Critical | Security scanning, sandboxing |
| Template corruption | Low | High | Integrity checks, backups |
| Registry data loss | Low | High | Automated backups, replication |

---

**🔴 CRITICAL PRIORITY**

This comprehensive issue requires immediate attention as the current implementation has fundamental security vulnerabilities and architectural flaws that prevent any production use. The phased implementation plan provides a clear path to resolution while maintaining backward compatibility where possible.

---

## Post-Implementation: README Update Requirements

### README.md Must Be Updated to Include:

#### 1. NPM Installation Section
```markdown
## Installation

### Via NPM (Recommended)
\`\`\`bash
# Global installation
npm install -g @context-pods/cli

# Local project installation
npm install --save-dev @context-pods/cli

# Verify installation
context-pods --version
\`\`\`

### Via Yarn
\`\`\`bash
yarn global add @context-pods/cli
\`\`\`

### Via pnpm
\`\`\`bash
pnpm add -g @context-pods/cli
\`\`\`
```

#### 2. Quick Start Guide for NPM Users
```markdown
## Quick Start

### Creating Your First MCP Server
\`\`\`bash
# Install globally
npm install -g @context-pods/cli

# Create a new MCP server
context-pods create-mcp --name my-first-server --template basic

# Navigate to the generated server
cd my-first-server

# Install dependencies
npm install

# Start development
npm run dev
\`\`\`
```

#### 3. Template Path Configuration
```markdown
## Configuration

### Template Paths
Context-Pods looks for templates in the following order:
1. Environment variable: `CONTEXT_PODS_TEMPLATES_PATH`
2. Bundled templates (included with npm package)
3. User directory: `~/.context-pods/templates`
4. Auto-download from GitHub (if enabled)

### Custom Template Location
\`\`\`bash
# Set custom template path
export CONTEXT_PODS_TEMPLATES_PATH=/my/custom/templates

# Or use config file
context-pods config set templatesPath /my/custom/templates
\`\`\`
```

#### 4. MCP Server Usage
```markdown
## Using as MCP Server

### Installation
\`\`\`bash
npm install -g @context-pods/server
\`\`\`

### Configuration
Add to your MCP settings:
\`\`\`json
{
  "mcpServers": {
    "context-pods": {
      "command": "context-pods-server",
      "args": [],
      "env": {
        "CONTEXT_PODS_TEMPLATES_PATH": "/optional/custom/path"
      }
    }
  }
}
\`\`\`
```

#### 5. Troubleshooting NPM Issues
```markdown
## Troubleshooting

### Common NPM Installation Issues

#### Templates Not Found
If you see "Template not found" errors after npm installation:
1. Check if templates are bundled: `ls $(npm root -g)/@context-pods/cli/templates`
2. Set explicit template path: `export CONTEXT_PODS_TEMPLATES_PATH=...`
3. Download templates: `context-pods templates download`

#### Permission Errors (Global Install)
\`\`\`bash
# Option 1: Use npx instead
npx @context-pods/cli create-mcp --name my-server

# Option 2: Fix npm permissions
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
\`\`\`

#### Version Conflicts
\`\`\`bash
# Check installed version
npm list -g @context-pods/cli

# Update to latest
npm update -g @context-pods/cli

# Force reinstall
npm uninstall -g @context-pods/cli && npm install -g @context-pods/cli@latest
\`\`\`
```

#### 6. Migration Guide
```markdown
## Migrating from Development Install

If you previously used Context-Pods from source:

### Before (Development)
\`\`\`bash
git clone https://github.com/context-pods/context-pods
cd context-pods
npm install
npm run build
./packages/cli/bin/context-pods
\`\`\`

### After (NPM)
\`\`\`bash
npm install -g @context-pods/cli
context-pods
\`\`\`

### Migrating Existing Projects
\`\`\`bash
# Check for migration needs
context-pods migrate check

# Run migration if needed
context-pods migrate execute
\`\`\`
```

#### 7. Package Documentation Links
```markdown
## NPM Packages

### Published Packages
- [@context-pods/cli](https://www.npmjs.com/package/@context-pods/cli) - CLI tool
- [@context-pods/server](https://www.npmjs.com/package/@context-pods/server) - MCP server
- [@context-pods/core](https://www.npmjs.com/package/@context-pods/core) - Core library
- [@context-pods/testing](https://www.npmjs.com/package/@context-pods/testing) - Testing utilities

### Version Compatibility
| Package | Node.js | TypeScript | MCP SDK |
|---------|---------|------------|---------|
| 1.0.x   | >=16.0  | >=5.0      | >=1.0   |
| 2.0.x   | >=18.0  | >=5.2      | >=1.5   |
```

### README Update Checklist
- [ ] Add NPM badges (version, downloads, license)
- [ ] Update installation instructions to prioritize NPM
- [ ] Add npx usage examples
- [ ] Include troubleshooting section for common NPM issues
- [ ] Add migration guide from source install
- [ ] Update all code examples to use installed package
- [ ] Add package size and dependency information
- [ ] Include security scanning badges
- [ ] Add performance benchmarks for NPM vs source
- [ ] Document environment variable configuration
- [ ] Add FAQ section for NPM-specific questions
- [ ] Include uninstall instructions
- [ ] Add changelog link for NPM releases