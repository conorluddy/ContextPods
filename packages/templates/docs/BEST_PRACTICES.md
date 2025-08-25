# MCP TypeScript Development Best Practices

This guide provides comprehensive best practices for developing robust, maintainable, and secure MCP servers using the TypeScript Advanced template.

## Table of Contents

- [Architecture and Design](#architecture-and-design)
- [Code Quality and Standards](#code-quality-and-standards)
- [Security Best Practices](#security-best-practices)
- [Performance Optimization](#performance-optimization)
- [Testing Strategies](#testing-strategies)
- [Error Handling](#error-handling)
- [Documentation Standards](#documentation-standards)
- [Deployment and Operations](#deployment-and-operations)

## Architecture and Design

### 1. Modular Design Principles

**✅ DO: Use Feature-Based Organization**
```
src/
├── tools/          # Tool implementations
├── resources/      # Resource management
├── prompts/        # Prompt templates
├── sampling/       # LLM integration
├── completion/     # Auto-completion
├── notifications/  # Progress tracking
└── utils/          # Shared utilities
```

**❌ DON'T: Create monolithic files**
```typescript
// Bad: Everything in one file
export class MegaServer {
  handleTools() { /* 500+ lines */ }
  handleResources() { /* 300+ lines */ }
  handlePrompts() { /* 200+ lines */ }
  // ... massive implementation
}
```

**✅ DO: Separate concerns cleanly**
```typescript
// Good: Focused, single-responsibility modules
export class ToolManager {
  async registerTools(server: Server): Promise<void> {
    // Only tool registration logic
  }
}

export class ResourceManager {
  async registerResources(server: Server): Promise<void> {
    // Only resource registration logic
  }
}
```

### 2. Dependency Management

**✅ DO: Use dependency injection patterns**
```typescript
interface Logger {
  info(message: string, context?: any): void;
  error(message: string, error?: any): void;
}

export class ToolHandler {
  constructor(private logger: Logger) {}
  
  async execute(args: any): Promise<any> {
    this.logger.info('Executing tool', { args });
    // Implementation
  }
}
```

**✅ DO: Keep dependencies minimal and focused**
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.17.4",
    "zod": "^3.22.4"
  }
}
```

### 3. Event-Driven Architecture

**✅ DO: Use EventEmitter for loose coupling**
```typescript
export class ResourceManager extends EventEmitter {
  updateResource(uri: string, content: any): void {
    // Update logic
    this.emit('resourceUpdate', { uri, content });
  }
}

// Consumers listen for events
resourceManager.on('resourceUpdate', (update) => {
  // Handle update
});
```

## Code Quality and Standards

### 1. TypeScript Best Practices

**✅ DO: Use strict TypeScript configuration**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**✅ DO: Define comprehensive interfaces**
```typescript
interface ToolConfiguration {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
  handler: (args: unknown) => Promise<unknown>;
  timeout?: number;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}
```

**✅ DO: Use discriminated unions for complex types**
```typescript
type ManagedResource = 
  | { type: 'static'; uri: string; content: string }
  | { type: 'dynamic'; uri: string; generator: () => Promise<string> }
  | { type: 'subscription'; uri: string; emitter: EventEmitter };
```

### 2. Schema Validation

**✅ DO: Use runtime validation with Zod**
```typescript
import { z } from 'zod';

const ToolInputSchema = z.object({
  action: z.enum(['analyze', 'generate', 'transform']),
  data: z.string().min(1),
  options: z.object({
    format: z.enum(['json', 'text', 'xml']).optional(),
    maxTokens: z.number().positive().optional(),
  }).optional(),
});

type ToolInput = z.infer<typeof ToolInputSchema>;

export async function handleTool(rawInput: unknown): Promise<any> {
  const input = ToolInputSchema.parse(rawInput); // Throws on invalid input
  // Proceed with validated input
}
```

**✅ DO: Validate both input and output schemas**
```typescript
const OutputSchema = z.object({
  result: z.string(),
  metadata: z.object({
    processingTime: z.number(),
    model: z.string(),
  }),
});

export async function processData(input: ToolInput): Promise<z.infer<typeof OutputSchema>> {
  const result = await performProcessing(input);
  
  // Validate output before returning
  return OutputSchema.parse(result);
}
```

### 3. Code Formatting and Linting

**✅ DO: Use consistent formatting with Prettier**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80
}
```

**✅ DO: Enforce code quality with ESLint**
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "max-lines-per-function": ["error", 50],
    "complexity": ["error", 10],
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

## Security Best Practices

### 1. Input Validation and Sanitization

**✅ DO: Validate all inputs at boundaries**
```typescript
export class SecureToolHandler {
  async execute(rawArgs: unknown): Promise<any> {
    // Validate structure
    const args = InputSchema.parse(rawArgs);
    
    // Sanitize strings
    const sanitizedArgs = {
      ...args,
      userInput: this.sanitizeString(args.userInput),
      filePath: this.validateFilePath(args.filePath),
    };
    
    return this.processSecurely(sanitizedArgs);
  }
  
  private sanitizeString(input: string): string {
    // Remove potentially dangerous characters
    return input.replace(/[<>\"'&]/g, '');
  }
  
  private validateFilePath(path: string): string {
    // Ensure path is within allowed boundaries
    const normalized = normalize(path);
    if (!normalized.startsWith(this.allowedBasePath)) {
      throw new Error('Path outside allowed directory');
    }
    return normalized;
  }
}
```

**❌ DON'T: Trust user input**
```typescript
// Bad: Direct execution without validation
async function dangerousHandler(args: any) {
  // Never do this!
  return eval(args.code);
}
```

### 2. Path Security

**✅ DO: Implement path traversal protection**
```typescript
import { resolve, join, normalize } from 'path';

export class SecureFileManager {
  private basePath: string;
  
  constructor(basePath: string) {
    this.basePath = resolve(basePath);
  }
  
  private validatePath(requestedPath: string): string {
    const fullPath = resolve(this.basePath, requestedPath);
    
    // Ensure the resolved path is within the base path
    if (!fullPath.startsWith(this.basePath)) {
      throw new Error('Path traversal attack detected');
    }
    
    return fullPath;
  }
  
  async readFile(path: string): Promise<string> {
    const safePath = this.validatePath(path);
    return readFile(safePath, 'utf-8');
  }
}
```

### 3. Rate Limiting and Throttling

**✅ DO: Implement rate limiting for tools**
```typescript
interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

export class RateLimitedToolHandler {
  private callCounts = new Map<string, { count: number; resetTime: number }>();
  
  constructor(private rateLimit: RateLimitConfig) {}
  
  async execute(clientId: string, args: any): Promise<any> {
    if (!this.checkRateLimit(clientId)) {
      throw new Error('Rate limit exceeded');
    }
    
    return this.processRequest(args);
  }
  
  private checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const record = this.callCounts.get(clientId);
    
    if (!record || now > record.resetTime) {
      this.callCounts.set(clientId, {
        count: 1,
        resetTime: now + this.rateLimit.windowMs,
      });
      return true;
    }
    
    if (record.count >= this.rateLimit.requests) {
      return false;
    }
    
    record.count++;
    return true;
  }
}
```

## Performance Optimization

### 1. Caching Strategies

**✅ DO: Implement intelligent caching**
```typescript
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessCount: number;
}

export class IntelligentCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize = 1000;
  
  set(key: string, value: T, ttlMs: number): void {
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      accessCount: 0,
    });
  }
  
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    entry.accessCount++;
    return entry.value;
  }
  
  private evictLeastRecentlyUsed(): void {
    // Implementation for LRU eviction
  }
}
```

### 2. Async/Await Best Practices

**✅ DO: Use Promise.allSettled for parallel operations**
```typescript
async function processMultipleResources(
  resources: ResourceConfig[]
): Promise<ProcessingResult[]> {
  const results = await Promise.allSettled(
    resources.map(resource => processResource(resource))
  );
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return { success: true, data: result.value };
    } else {
      logger.error(`Resource ${index} failed:`, result.reason);
      return { success: false, error: result.reason };
    }
  });
}
```

**❌ DON'T: Block with sequential operations**
```typescript
// Bad: Sequential processing
async function slowProcessing(items: any[]) {
  const results = [];
  for (const item of items) {
    results.push(await processItem(item)); // Blocks each iteration
  }
  return results;
}
```

### 3. Memory Management

**✅ DO: Clean up resources properly**
```typescript
export class ResourcefulHandler implements Disposable {
  private subscriptions: (() => void)[] = [];
  private timers: NodeJS.Timeout[] = [];
  
  constructor() {
    // Setup with cleanup tracking
    const interval = setInterval(() => this.periodicTask(), 1000);
    this.timers.push(interval);
  }
  
  dispose(): void {
    // Clean up all resources
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.timers.forEach(timer => clearTimeout(timer));
    
    this.subscriptions.length = 0;
    this.timers.length = 0;
  }
}
```

## Testing Strategies

### 1. Comprehensive Test Coverage

**✅ DO: Write tests for all layers**
```typescript
describe('ToolHandler', () => {
  describe('Input Validation', () => {
    it('should reject invalid input schema', async () => {
      const handler = new ToolHandler();
      await expect(handler.execute({ invalid: 'input' }))
        .rejects.toThrow('Invalid input schema');
    });
  });
  
  describe('Business Logic', () => {
    it('should process valid requests correctly', async () => {
      const handler = new ToolHandler();
      const result = await handler.execute(validInput);
      expect(result).toMatchObject(expectedOutput);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle external service failures gracefully', async () => {
      const handler = new ToolHandler();
      mockExternalService.mockRejectedValue(new Error('Service down'));
      
      await expect(handler.execute(validInput))
        .rejects.toThrow('External service unavailable');
    });
  });
});
```

### 2. Integration Testing

**✅ DO: Test MCP protocol compliance**
```typescript
describe('MCP Protocol Integration', () => {
  let server: Server;
  let testClient: TestMCPClient;
  
  beforeEach(async () => {
    server = await createTestServer();
    testClient = new TestMCPClient(server);
  });
  
  it('should handle tool list requests', async () => {
    const response = await testClient.listTools();
    
    expect(response).toMatchObject({
      tools: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          description: expect.any(String),
          inputSchema: expect.any(Object),
        }),
      ]),
    });
  });
  
  it('should execute tools with proper validation', async () => {
    const result = await testClient.callTool('test-tool', validArgs);
    
    expect(result.content).toBeDefined();
    expect(result.isError).toBe(false);
  });
});
```

### 3. Mocking and Test Utilities

**✅ DO: Create reusable test utilities**
```typescript
export class MCPTestHarness {
  private server: Server;
  private mockTransport: MockTransport;
  
  static async create(): Promise<MCPTestHarness> {
    const harness = new MCPTestHarness();
    await harness.initialize();
    return harness;
  }
  
  async callTool(name: string, args: any): Promise<any> {
    return this.mockTransport.sendRequest({
      method: 'tools/call',
      params: { name, arguments: args },
    });
  }
  
  async subscribeToResource(uri: string): Promise<void> {
    await this.mockTransport.sendRequest({
      method: 'resources/subscribe',
      params: { uri },
    });
  }
  
  expectResourceUpdate(uri: string): Promise<any> {
    return new Promise((resolve) => {
      this.mockTransport.on('notification', (notification) => {
        if (notification.method === 'notifications/resources/updated') {
          resolve(notification.params);
        }
      });
    });
  }
}
```

## Error Handling

### 1. Structured Error Handling

**✅ DO: Create custom error types**
```typescript
export class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export class ValidationError extends MCPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class ResourceNotFoundError extends MCPError {
  constructor(uri: string) {
    super(`Resource not found: ${uri}`, 'RESOURCE_NOT_FOUND', { uri });
    this.name = 'ResourceNotFoundError';
  }
}
```

**✅ DO: Implement global error handling**
```typescript
export function setupGlobalErrorHandling(server: Server): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    // Graceful shutdown logic
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
    // Handle gracefully
  });
  
  // MCP-specific error handling
  server.onerror = (error) => {
    logger.error('MCP Server error:', error);
    // Report to monitoring service
  };
}
```

### 2. Graceful Degradation

**✅ DO: Implement circuit breaker pattern**
```typescript
export class CircuitBreaker {
  private failureCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = 0;
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

## Documentation Standards

### 1. JSDoc Documentation

**✅ DO: Write comprehensive JSDoc comments**
```typescript
/**
 * Processes user input and returns structured analysis results.
 * 
 * This function performs comprehensive text analysis including sentiment
 * detection, keyword extraction, and readability scoring. It uses multiple
 * analysis engines and combines results for maximum accuracy.
 * 
 * @param input - The text content to analyze
 * @param options - Configuration options for analysis
 * @param options.includeSentiment - Whether to include sentiment analysis
 * @param options.maxKeywords - Maximum number of keywords to extract
 * @param options.language - Language code for text processing
 * 
 * @returns Promise resolving to comprehensive analysis results
 * 
 * @throws {ValidationError} When input fails schema validation
 * @throws {ProcessingError} When analysis engines fail
 * 
 * @example
 * ```typescript
 * const result = await analyzeText("Great product!", {
 *   includeSentiment: true,
 *   maxKeywords: 10,
 *   language: 'en'
 * });
 * 
 * console.log(result.sentiment); // 'positive'
 * console.log(result.keywords); // ['product', 'great']
 * ```
 * 
 * @since 1.0.0
 * @version 1.2.0
 */
export async function analyzeText(
  input: string,
  options: AnalysisOptions = {}
): Promise<AnalysisResult> {
  // Implementation
}
```

### 2. README and Documentation Structure

**✅ DO: Maintain comprehensive documentation**
```markdown
# Project Documentation Structure

## Core Documentation
- README.md - Overview and quick start
- MIGRATION_GUIDE.md - Version migration instructions
- BEST_PRACTICES.md - Development guidelines
- API.md - Detailed API documentation

## Code Documentation
- Inline JSDoc comments for all public APIs
- Type definitions with descriptions
- Usage examples in documentation
- Integration guides and tutorials

## Architecture Documentation
- docs/ARCHITECTURE.md - System design overview
- docs/FEATURES.md - Feature specifications
- docs/SECURITY.md - Security considerations
- docs/DEPLOYMENT.md - Deployment guidelines
```

## Deployment and Operations

### 1. Production Configuration

**✅ DO: Use environment-based configuration**
```typescript
interface ServerConfig {
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxConcurrentRequests: number;
  enableMetrics: boolean;
  corsOrigins: string[];
}

export function loadConfig(): ServerConfig {
  return {
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '100'),
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
  };
}
```

### 2. Health Checks and Monitoring

**✅ DO: Implement comprehensive health checks**
```typescript
export class HealthChecker {
  private checks = new Map<string, () => Promise<boolean>>();
  
  addCheck(name: string, check: () => Promise<boolean>): void {
    this.checks.set(name, check);
  }
  
  async runHealthCheck(): Promise<HealthStatus> {
    const results = await Promise.allSettled(
      Array.from(this.checks.entries()).map(async ([name, check]) => ({
        name,
        healthy: await check(),
      }))
    );
    
    const healthChecks = results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { name: 'unknown', healthy: false }
    );
    
    return {
      status: healthChecks.every(check => check.healthy) ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: healthChecks,
    };
  }
}
```

### 3. Logging and Observability

**✅ DO: Implement structured logging**
```typescript
export interface LogContext {
  requestId?: string;
  userId?: string;
  toolName?: string;
  resourceUri?: string;
  [key: string]: unknown;
}

export class StructuredLogger {
  constructor(private level: LogLevel) {}
  
  info(message: string, context: LogContext = {}): void {
    this.log('info', message, context);
  }
  
  error(message: string, error?: Error, context: LogContext = {}): void {
    this.log('error', message, { ...context, error: this.serializeError(error) });
  }
  
  private log(level: LogLevel, message: string, context: LogContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };
    
    console.log(JSON.stringify(logEntry));
  }
  
  private serializeError(error?: Error): any {
    if (!error) return undefined;
    
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
}
```

---

## Summary Checklist

Before deploying your MCP server, ensure you've followed these key practices:

- [ ] **Architecture**: Modular design with clear separation of concerns
- [ ] **Code Quality**: TypeScript strict mode, comprehensive linting
- [ ] **Security**: Input validation, path traversal protection, rate limiting
- [ ] **Performance**: Caching, async patterns, resource cleanup
- [ ] **Testing**: Unit, integration, and MCP protocol compliance tests
- [ ] **Error Handling**: Custom errors, circuit breakers, graceful degradation
- [ ] **Documentation**: JSDoc comments, comprehensive README, examples
- [ ] **Operations**: Health checks, structured logging, monitoring

Following these best practices ensures your MCP server is production-ready, maintainable, and provides an excellent developer experience.

---

Made with ❤️ in Dublin