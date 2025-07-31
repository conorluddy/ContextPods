# Security Guide

This guide covers security best practices for Context-Pods, generated MCP servers, and deployment environments. Follow these guidelines to ensure secure operation of your MCP infrastructure.

## Table of Contents

- [Security Overview](#security-overview)
- [Template Security](#template-security)
- [Generated Server Security](#generated-server-security)
- [Meta-MCP Server Security](#meta-mcp-server-security)
- [Environment Security](#environment-security)
- [Network Security](#network-security)
- [Data Protection](#data-protection)
- [Authentication & Authorization](#authentication--authorization)
- [Monitoring & Incident Response](#monitoring--incident-response)
- [Security Checklist](#security-checklist)

## Security Overview

Context-Pods follows defense-in-depth security principles:

1. **Template Validation**: Prevent malicious code injection during generation
2. **Input Sanitization**: Validate all inputs and parameters
3. **Secure Defaults**: Generated servers use secure configurations by default
4. **Environment Isolation**: Separate development, staging, and production environments
5. **Monitoring**: Comprehensive logging and security monitoring
6. **Regular Updates**: Keep dependencies and runtime environments updated

## Template Security

### Template Validation

Context-Pods validates templates before processing to prevent security vulnerabilities:

```typescript
// Template validation in core package
import { validateTemplate } from '@context-pods/core';

const validation = await validateTemplate('./my-template', {
  checkFiles: true, // Validate file paths and permissions
  checkVariables: true, // Validate variable definitions
  checkDependencies: true, // Check for known vulnerable dependencies
  preventCodeInjection: true, // Scan for potential code injection
  allowedFileTypes: ['.ts', '.js', '.json', '.md'], // Restrict file types
});

if (!validation.isValid) {
  throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
}
```

### Variable Sanitization

Template variables are sanitized to prevent injection attacks:

```typescript
// Secure variable processing
export function sanitizeVariable(value: string, type: 'string' | 'path' | 'identifier'): string {
  switch (type) {
    case 'path':
      // Prevent directory traversal
      return path.normalize(value).replace(/\.\./g, '');
    case 'identifier':
      // Allow only safe identifier characters
      return value.replace(/[^a-zA-Z0-9_-]/g, '');
    case 'string':
      // Escape special characters for templates
      return value.replace(/[<>&"']/g, (match) => escapeMap[match]);
    default:
      return value;
  }
}
```

### Safe Template Patterns

Use these patterns in your custom templates:

```handlebars
{{! Safe: Variable with proper escaping }}
<description>{{escapeHtml description}}</description>

{{! Safe: Path validation }}
{{#if (isValidPath outputPath)}}
  <path>{{normalizePath outputPath}}</path>
{{/if}}

{{! Unsafe: Raw variable insertion }}
{{!-- DO NOT USE: {{{rawVariable}}} --}}

{{! Safe: Conditional rendering }}
{{#if authorEmail}}
  <author>{{escapeHtml authorName}} &lt;{{escapeHtml authorEmail}}&gt;</author>
{{/if}}
```

## Generated Server Security

### Input Validation

All generated servers include comprehensive input validation:

```typescript
// Generated tool with validation
import { z } from 'zod';

const ToolInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(1000)
    .regex(/^[a-zA-Z0-9\s.,!?-]+$/),
  limit: z.number().int().min(1).max(100).optional().default(10),
  apiKey: z.string().min(1).max(255).optional(),
});

export async function handleTool(args: unknown) {
  try {
    // Validate input
    const validatedArgs = ToolInputSchema.parse(args);

    // Process with validated data
    return await processQuery(validatedArgs);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: 'text',
            text: `Invalid input: ${error.errors.map((e) => e.message).join(', ')}`,
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
}
```

### Error Handling

Secure error handling prevents information leakage:

```typescript
// Secure error handling
export class SecureError extends Error {
  constructor(
    message: string,
    public userMessage: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = 'SecureError';
  }
}

export function handleError(error: unknown): MCPResponse {
  if (error instanceof SecureError) {
    // Log full error internally
    logger.error('Tool error', { error: error.message, stack: error.stack });

    // Return safe message to user
    return {
      content: [
        {
          type: 'text',
          text: error.userMessage,
        },
      ],
      isError: true,
    };
  }

  // Log and return generic error for unknown errors
  logger.error('Unexpected error', { error });
  return {
    content: [
      {
        type: 'text',
        text: 'An internal error occurred. Please try again later.',
      },
    ],
    isError: true,
  };
}
```

### Environment Variables

Secure environment variable handling:

```typescript
// config/security.ts
import { z } from 'zod';

const EnvironmentSchema = z.object({
  // Required secure values
  API_KEY: z.string().min(32, 'API key must be at least 32 characters'),
  JWT_SECRET: z.string().min(64, 'JWT secret must be at least 64 characters'),

  // Optional with secure defaults
  SESSION_TIMEOUT: z.number().int().min(300).max(86400).default(3600), // 5min to 24h
  RATE_LIMIT_MAX: z.number().int().min(10).max(1000).default(100),

  // Database
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (url) => !url.includes('password') || url.startsWith('postgresql://'),
      'Database URL must use secure connection',
    ),

  // Security flags
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ENABLE_CORS: z.boolean().default(false),
  CORS_ORIGINS: z.string().optional(),
});

export const config = EnvironmentSchema.parse(process.env);

// Redact sensitive values from logs
export function redactConfig(config: any) {
  const redacted = { ...config };
  const sensitiveKeys = ['API_KEY', 'JWT_SECRET', 'DATABASE_URL'];

  sensitiveKeys.forEach((key) => {
    if (redacted[key]) {
      redacted[key] = '[REDACTED]';
    }
  });

  return redacted;
}
```

### Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
// middleware/rate-limit.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  keyGen: (req) => req.ip || 'unknown',
  points: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  duration: parseInt(process.env.RATE_LIMIT_WINDOW || '60'),
  blockDuration: parseInt(process.env.RATE_LIMIT_BLOCK || '300'),
});

export async function rateLimitMiddleware(req: any, res: any, next: any) {
  try {
    await rateLimiter.consume(req.ip || 'unknown');
    next();
  } catch (rejRes) {
    const remainingSeconds = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: remainingSeconds,
    });
  }
}
```

## Meta-MCP Server Security

### Server Registry Security

Secure the server registry database:

```typescript
// registry/secure-database.ts
import Database from 'better-sqlite3';
import { createHash } from 'crypto';

export class SecureRegistry {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.setupSecurity();
  }

  private setupSecurity() {
    // Enable WAL mode for better concurrent access
    this.db.pragma('journal_mode = WAL');

    // Enable foreign key constraints
    this.db.pragma('foreign_keys = ON');

    // Set secure file permissions
    this.db.pragma('secure_delete = ON');

    // Initialize tables with security constraints
    this.initializeTables();
  }

  private initializeTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL CHECK(length(name) <= 255),
        path TEXT NOT NULL CHECK(path NOT LIKE '%..%'),
        template TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'error')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        checksum TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
      CREATE INDEX IF NOT EXISTS idx_servers_created ON servers(created_at);
    `);
  }

  // Validate and sanitize server data
  public addServer(serverData: any): string {
    const validated = this.validateServerData(serverData);
    const checksum = this.calculateChecksum(validated);

    const stmt = this.db.prepare(`
      INSERT INTO servers (id, name, path, template, status, created_at, updated_at, checksum)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = this.generateSecureId();
    stmt.run(
      id,
      validated.name,
      validated.path,
      validated.template,
      'active',
      Date.now(),
      Date.now(),
      checksum,
    );

    return id;
  }

  private validateServerData(data: any) {
    // Validate server name
    if (!data.name || typeof data.name !== 'string' || data.name.length > 255) {
      throw new Error('Invalid server name');
    }

    // Validate path (prevent directory traversal)
    if (!data.path || data.path.includes('..') || data.path.includes('~')) {
      throw new Error('Invalid server path');
    }

    return {
      name: data.name.trim(),
      path: path.resolve(data.path),
      template: data.template || 'basic',
    };
  }

  private calculateChecksum(data: any): string {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private generateSecureId(): string {
    return createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 16);
  }
}
```

### Tool Security

Secure MCP tool implementations:

```typescript
// tools/secure-create-mcp.ts
import { CreateMCPTool } from './base-tool.js';
import { z } from 'zod';
import path from 'path';

const CreateMCPSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, 'Invalid name format'),
  template: z
    .string()
    .optional()
    .refine((name) => !name || this.isValidTemplate(name), 'Invalid template'),
  outputPath: z
    .string()
    .optional()
    .refine((p) => !p || this.isValidOutputPath(p), 'Invalid output path'),
  variables: z.record(z.any()).optional(),
});

export class SecureCreateMCPTool extends CreateMCPTool {
  async execute(args: unknown) {
    try {
      // Validate input
      const validatedArgs = CreateMCPSchema.parse(args);

      // Additional security checks
      await this.performSecurityChecks(validatedArgs);

      // Execute with validated data
      return await super.execute(validatedArgs);
    } catch (error) {
      return this.handleSecureError(error);
    }
  }

  private async performSecurityChecks(args: any) {
    // Check if output path is within allowed directories
    if (args.outputPath) {
      const resolved = path.resolve(args.outputPath);
      const allowed = path.resolve(process.env.ALLOWED_OUTPUT_DIR || './output');

      if (!resolved.startsWith(allowed)) {
        throw new Error('Output path not allowed');
      }
    }

    // Check template whitelist
    if (args.template && !this.isTemplateWhitelisted(args.template)) {
      throw new Error('Template not allowed');
    }

    // Validate variables for potential injection
    if (args.variables) {
      this.validateVariables(args.variables);
    }
  }

  private isValidTemplate(name: string): boolean {
    const allowedTemplates = ['basic', 'typescript-advanced', 'python-basic', 'rust-basic'];
    return allowedTemplates.includes(name);
  }

  private isValidOutputPath(path: string): boolean {
    // Prevent directory traversal
    const normalized = path.normalize(path);
    return !normalized.includes('..') && !normalized.startsWith('/');
  }

  private validateVariables(variables: Record<string, any>) {
    Object.entries(variables).forEach(([key, value]) => {
      // Validate key
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        throw new Error(`Invalid variable name: ${key}`);
      }

      // Validate value based on type
      if (typeof value === 'string') {
        // Check for potential script tags or other dangerous content
        if (/<script|javascript:|data:/i.test(value)) {
          throw new Error(`Potentially dangerous variable value: ${key}`);
        }
      }
    });
  }
}
```

## Environment Security

### Development Environment

```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug

# Use test/mock credentials in development
API_KEY=dev-test-key-not-for-production
DATABASE_URL=sqlite:./dev.db

# Enable additional debug features
DEBUG_MODE=true
ALLOW_UNSAFE_OPERATIONS=true
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=info

# Use secrets management system
API_KEY=${SECRET_API_KEY}
DATABASE_URL=${SECRET_DATABASE_URL}
JWT_SECRET=${SECRET_JWT_SECRET}

# Security settings
DISABLE_DEBUG_ROUTES=true
ENABLE_RATE_LIMITING=true
SECURE_HEADERS=true
HTTPS_ONLY=true

# Monitoring
SENTRY_DSN=${SECRET_SENTRY_DSN}
```

### Secrets Management

#### Using AWS Secrets Manager

```typescript
// config/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

export async function getSecret(secretName: string): Promise<string> {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    if (response.SecretString) {
      return response.SecretString;
    }

    throw new Error('Secret not found');
  } catch (error) {
    logger.error('Failed to retrieve secret', { secretName, error });
    throw error;
  }
}

// Load secrets at startup
export async function loadSecrets() {
  if (process.env.NODE_ENV === 'production') {
    process.env.API_KEY = await getSecret('mcp-server/api-key');
    process.env.DATABASE_URL = await getSecret('mcp-server/database-url');
    process.env.JWT_SECRET = await getSecret('mcp-server/jwt-secret');
  }
}
```

#### Using Azure Key Vault

```typescript
// config/azure-secrets.ts
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

const credential = new DefaultAzureCredential();
const client = new SecretClient(process.env.AZURE_KEY_VAULT_URL!, credential);

export async function getAzureSecret(secretName: string): Promise<string> {
  try {
    const secret = await client.getSecret(secretName);
    return secret.value!;
  } catch (error) {
    logger.error('Failed to retrieve Azure secret', { secretName, error });
    throw error;
  }
}
```

## Network Security

### HTTPS Configuration

```typescript
// server/https-server.ts
import https from 'https';
import fs from 'fs';

const httpsOptions = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH!),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH!),
  // Use strong ciphers
  ciphers: [
    'ECDHE-RSA-AES256-GCM-SHA512',
    'DHE-RSA-AES256-GCM-SHA512',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'DHE-RSA-AES256-GCM-SHA384',
  ].join(':'),
  honorCipherOrder: true,
  secureProtocol: 'TLSv1_2_method',
};

export function createSecureServer(app: any) {
  return https.createServer(httpsOptions, app);
}
```

### CORS Configuration

```typescript
// middleware/cors.ts
import cors from 'cors';

const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];

    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
};

export const corsMiddleware = cors(corsOptions);
```

### Security Headers

```typescript
// middleware/security-headers.ts
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});
```

## Data Protection

### Data Encryption

```typescript
// utils/encryption.ts
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';

export class DataEncryption {
  private key: Buffer;

  constructor(secretKey: string) {
    this.key = crypto.scryptSync(secretKey, 'salt', 32);
  }

  encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.key);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipher(algorithm, this.key);
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

### Secure Data Storage

```typescript
// models/secure-model.ts
import { DataEncryption } from '../utils/encryption.js';

const encryption = new DataEncryption(process.env.ENCRYPTION_KEY!);

export class SecureServerModel {
  static async create(data: any) {
    // Encrypt sensitive fields
    if (data.apiKey) {
      const encrypted = encryption.encrypt(data.apiKey);
      data.apiKey = JSON.stringify(encrypted);
    }

    // Store in database
    return await this.database.create(data);
  }

  static async findById(id: string) {
    const record = await this.database.findById(id);

    if (record && record.apiKey) {
      // Decrypt sensitive fields
      const encryptedData = JSON.parse(record.apiKey);
      record.apiKey = encryption.decrypt(
        encryptedData.encrypted,
        encryptedData.iv,
        encryptedData.authTag,
      );
    }

    return record;
  }
}
```

## Authentication & Authorization

### JWT Implementation

```typescript
// auth/jwt.ts
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const TokenPayloadSchema = z.object({
  userId: z.string(),
  role: z.enum(['admin', 'user']),
  permissions: z.array(z.string()),
  exp: z.number(),
  iat: z.number(),
});

export class JWTService {
  private secret: string;

  constructor() {
    this.secret = process.env.JWT_SECRET!;
    if (this.secret.length < 64) {
      throw new Error('JWT secret must be at least 64 characters');
    }
  }

  generateToken(payload: { userId: string; role: string; permissions: string[] }): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: '1h',
      algorithm: 'HS256',
    });
  }

  verifyToken(token: string): any {
    try {
      const decoded = jwt.verify(token, this.secret, { algorithm: 'HS256' });
      return TokenPayloadSchema.parse(decoded);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
```

### Role-Based Access Control

```typescript
// middleware/auth.ts
import { JWTService } from '../auth/jwt.js';

const jwtService = new JWTService();

export function requireAuth(requiredPermissions: string[] = []) {
  return async (req: any, res: any, next: any) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const payload = jwtService.verifyToken(token);

      // Check permissions
      if (requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.every((perm) =>
          payload.permissions.includes(perm),
        );

        if (!hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
      }

      req.user = payload;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid authentication' });
    }
  };
}

// Usage
app.post('/api/servers', requireAuth(['server:create']), createServer);
app.delete('/api/servers/:id', requireAuth(['server:delete']), deleteServer);
```

## Monitoring & Incident Response

### Security Logging

```typescript
// logging/security-logger.ts
import winston from 'winston';

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: 'logs/security.log' }),
    new winston.transports.Console({ level: 'warn' }),
  ],
});

export function logSecurityEvent(event: {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
}) {
  securityLogger.info('Security Event', {
    ...event,
    timestamp: new Date().toISOString(),
  });

  // Alert for critical events
  if (event.severity === 'critical') {
    alertSecurityTeam(event);
  }
}

// Usage
logSecurityEvent({
  type: 'authentication_failure',
  severity: 'medium',
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  details: { attemptedUsername: req.body.username },
});
```

### Intrusion Detection

```typescript
// security/intrusion-detection.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';

const failedAttempts = new RateLimiterMemory({
  keyGen: (req) => req.ip,
  points: 5, // 5 attempts
  duration: 900, // 15 minutes
  blockDuration: 1800, // 30 minutes
});

export async function detectSuspiciousActivity(req: any, res: any, next: any) {
  try {
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\.\./, // Directory traversal
      /<script/i, // XSS attempts
      /union.*select/i, // SQL injection
      /javascript:/i, // JavaScript protocol
    ];

    const requestData =
      JSON.stringify(req.body || {}) + (req.query ? JSON.stringify(req.query) : '');

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestData)) {
        await failedAttempts.consume(req.ip);

        logSecurityEvent({
          type: 'suspicious_request',
          severity: 'high',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          details: { pattern: pattern.toString(), data: requestData },
        });

        return res.status(400).json({ error: 'Invalid request' });
      }
    }

    next();
  } catch (rejRes) {
    // IP is blocked
    logSecurityEvent({
      type: 'ip_blocked',
      severity: 'high',
      ip: req.ip,
      details: { reason: 'Too many suspicious requests' },
    });

    res.status(429).json({ error: 'Too many suspicious requests' });
  }
}
```

## Security Checklist

### Development Phase

- [ ] All templates validated before use
- [ ] Input validation implemented for all user inputs
- [ ] Error handling prevents information leakage
- [ ] Secure coding practices followed
- [ ] Dependencies regularly updated and scanned
- [ ] Security tests included in test suite

### Pre-Production

- [ ] Security review completed
- [ ] Secrets moved to secure storage
- [ ] HTTPS configured with strong ciphers
- [ ] Security headers implemented
- [ ] Rate limiting configured
- [ ] Logging and monitoring set up

### Production

- [ ] Environment variables secured
- [ ] Database encrypted and backed up
- [ ] Network access restricted
- [ ] Regular security updates scheduled
- [ ] Incident response plan documented
- [ ] Security monitoring active

### Ongoing Maintenance

- [ ] Regular security assessments
- [ ] Dependency vulnerability scanning
- [ ] Log review and analysis
- [ ] Security patches applied promptly
- [ ] Team security training updated
- [ ] Documentation kept current

## Security Contacts

For security issues:

- **Security Email**: security@yourorganization.com
- **Bug Bounty**: Link to bug bounty program if available
- **Incident Response**: 24/7 security hotline
- **GitHub Issues**: For non-sensitive security improvements

## Compliance Considerations

### GDPR Compliance

```typescript
// gdpr/data-handler.ts
export class GDPRCompliantDataHandler {
  // Right to be forgotten
  async deleteUserData(userId: string) {
    await this.anonymizeUserRecords(userId);
    await this.deleteUserFiles(userId);
    await this.updateDataProcessingLog(userId, 'deleted');
  }

  // Data portability
  async exportUserData(userId: string) {
    const userData = await this.collectUserData(userId);
    return this.formatForExport(userData);
  }

  // Consent management
  async updateConsent(userId: string, consents: Record<string, boolean>) {
    await this.recordConsentChanges(userId, consents);
    await this.updateDataProcessing(userId, consents);
  }
}
```

### SOC 2 Compliance

- Implement comprehensive logging and monitoring
- Maintain data encryption at rest and in transit
- Regular access reviews and privilege management
- Incident response procedures documented and tested
- Vendor risk management for third-party integrations

## Next Steps

- **Implementation**: Apply security measures during development
- **Testing**: Include security testing in your CI/CD pipeline
- **Monitoring**: Set up continuous security monitoring
- **Training**: Ensure team understands security practices
- **Reviews**: Regular security reviews and penetration testing

For additional security guidance, see our [Deployment Guide](deployment.md) and [Troubleshooting Guide](TROUBLESHOOTING.md).

---

_Security is an ongoing process. Regularly review and update these practices based on evolving threats and best practices._
