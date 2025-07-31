# Deployment Guide

This guide covers production deployment strategies for Context-Pods generated MCP servers and the Meta-MCP Server itself. Follow these practices to deploy reliable, scalable MCP servers.

## Table of Contents

- [Deployment Overview](#deployment-overview)
- [Generated MCP Server Deployment](#generated-mcp-server-deployment)
- [Meta-MCP Server Deployment](#meta-mcp-server-deployment)
- [Container Deployment](#container-deployment)
- [Cloud Platform Deployment](#cloud-platform-deployment)
- [Monitoring and Logging](#monitoring-and-logging)
- [Security Best Practices](#security-best-practices)
- [Performance Optimization](#performance-optimization)
- [Backup and Recovery](#backup-and-recovery)

## Deployment Overview

Context-Pods supports multiple deployment scenarios:

1. **Individual MCP Servers**: Deploy generated servers independently
2. **Meta-MCP Server**: Central server managing multiple MCP instances
3. **Container Deployment**: Docker-based deployments for consistency
4. **Cloud Platforms**: Serverless and managed service deployments
5. **Hybrid Deployments**: Combination of local and cloud resources

## Generated MCP Server Deployment

### Basic Node.js Deployment

For TypeScript/JavaScript generated servers:

```bash
# Production build
npm run build

# Install production dependencies only
npm ci --production

# Start the server
NODE_ENV=production node dist/index.js
```

### Environment Configuration

Create production environment files:

```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=info
MCP_PORT=3000
DATABASE_URL=your_production_database_url
API_KEY=your_production_api_key

# Security settings
CORS_ORIGINS=https://yourdomain.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000
```

### Process Management with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'mcp-server',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    time: true
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

### SystemD Service (Linux)

```bash
# Create service file
sudo tee /etc/systemd/system/mcp-server.service > /dev/null << 'EOF'
[Unit]
Description=MCP Server
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/opt/mcp-server
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=LOG_LEVEL=info

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable mcp-server
sudo systemctl start mcp-server
sudo systemctl status mcp-server
```

## Meta-MCP Server Deployment

### Standalone Deployment

```bash
# Clone and build
git clone https://github.com/yourorg/context-pods
cd context-pods
npm ci
npm run build

# Start Meta-MCP Server
npm run server:start

# Or with environment variables
NODE_ENV=production \
REGISTRY_DB_PATH=/data/registry.db \
TEMPLATES_PATH=/data/templates \
npm run server:start
```

### Configuration Management

```yaml
# config/production.yaml
server:
  host: '0.0.0.0'
  port: 3001

registry:
  database:
    path: '/data/registry.db'
    backup: true
    backupInterval: '1h'

templates:
  path: '/data/templates'
  cache: true

logging:
  level: 'info'
  format: 'json'

security:
  rateLimit:
    enabled: true
    max: 100
    window: 60000
```

### High Availability Setup

```bash
# Use nginx for load balancing
cat > /etc/nginx/sites-available/mcp-server << 'EOF'
upstream mcp_backend {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 80;
    server_name your-mcp-server.com;

    location / {
        proxy_pass http://mcp_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/mcp-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Container Deployment

### Docker for Generated Servers

```dockerfile
# Dockerfile for TypeScript servers
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

FROM node:18-alpine AS runtime

RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001

WORKDIR /app

COPY --from=builder --chown=mcp:nodejs /app/dist ./dist
COPY --from=builder --chown=mcp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=mcp:nodejs /app/package.json ./package.json

USER mcp

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Docker for Python Servers

```dockerfile
# Dockerfile for Python servers
FROM python:3.11-slim AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

FROM python:3.11-slim AS runtime

RUN adduser --disabled-password --gecos '' mcp

WORKDIR /app

COPY --from=builder --chown=mcp:mcp /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder --chown=mcp:mcp /usr/local/bin /usr/local/bin
COPY --from=builder --chown=mcp:mcp /app .

USER mcp

EXPOSE 3000

CMD ["python", "main.py"]
```

### Docker Compose for Multi-Service

```yaml
# docker-compose.yml
version: '3.8'

services:
  meta-mcp-server:
    build: .
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
      - REGISTRY_DB_PATH=/data/registry.db
    volumes:
      - ./data:/data
      - ./logs:/app/logs
    restart: unless-stopped
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: contextpods
      POSTGRES_USER: contextpods
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - meta-mcp-server
    restart: unless-stopped

volumes:
  redis_data:
  postgres_data:
```

## Cloud Platform Deployment

### AWS ECS Deployment

```json
{
  "family": "mcp-server",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "mcp-server",
      "image": "your-account.dkr.ecr.region.amazonaws.com/mcp-server:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "LOG_LEVEL", "value": "info" }
      ],
      "secrets": [
        {
          "name": "API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:mcp-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/mcp-server",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Google Cloud Run

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/mcp-server', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/mcp-server']
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'mcp-server'
      - '--image'
      - 'gcr.io/$PROJECT_ID/mcp-server'
      - '--platform'
      - 'managed'
      - '--region'
      - 'us-central1'
      - '--allow-unauthenticated'
```

### Azure Container Instances

```bash
# Deploy to Azure Container Instances
az container create \
  --resource-group myResourceGroup \
  --name mcp-server \
  --image youracr.azurecr.io/mcp-server:latest \
  --cpu 1 \
  --memory 1 \
  --registry-login-server youracr.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables API_KEY=$API_KEY \
  --ports 3000
```

### Kubernetes Deployment

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
        - name: mcp-server
          image: your-registry/mcp-server:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: 'production'
            - name: API_KEY
              valueFrom:
                secretKeyRef:
                  name: mcp-secrets
                  key: api-key
          resources:
            limits:
              memory: '512Mi'
              cpu: '500m'
            requests:
              memory: '256Mi'
              cpu: '200m'
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: mcp-server-service
spec:
  selector:
    app: mcp-server
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

## Monitoring and Logging

### Application Monitoring

```typescript
// Add to generated servers
import { createPrometheusMetrics } from '@prometheus/client';

const register = new PrometheusMetrics.register();

// Custom metrics
const requestDuration = new PrometheusMetrics.Histogram({
  name: 'mcp_request_duration_seconds',
  help: 'Duration of MCP requests in seconds',
  labelNames: ['method', 'status'],
  registers: [register],
});

const activeConnections = new PrometheusMetrics.Gauge({
  name: 'mcp_active_connections',
  help: 'Number of active MCP connections',
  registers: [register],
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Log Configuration

```typescript
// production-logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'mcp-server' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

export default logger;
```

### Health Checks

```typescript
// health-check.ts
import express from 'express';

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime(),
  });
});

router.get('/ready', async (req, res) => {
  try {
    // Check database connectivity
    await checkDatabase();

    // Check external dependencies
    await checkExternalServices();

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
```

## Security Best Practices

### Environment Variables

```bash
# Use a secrets management system
# .env.production (example structure, use proper secrets manager)
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://host:port

# API Keys (use secrets manager in production)
EXTERNAL_API_KEY=your_api_key_here
JWT_SECRET=your_jwt_secret_here

# Security
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# Monitoring
SENTRY_DSN=your_sentry_dsn_here
LOG_LEVEL=info
```

### SSL/TLS Configuration

```nginx
# nginx-ssl.conf
server {
    listen 443 ssl http2;
    server_name your-mcp-server.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Network Security

```bash
# Firewall rules (ufw example)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Or with iptables
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -j DROP
```

## Performance Optimization

### Node.js Optimization

```bash
# Production Node.js flags
NODE_ENV=production \
NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size" \
node dist/index.js
```

### Caching Strategy

```typescript
// redis-cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export class CacheService {
  async get(key: string): Promise<any> {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await redis.del(key);
  }
}
```

### Database Optimization

```typescript
// database-pool.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
```

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# backup-script.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_PATH="/data/registry.db"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup SQLite database
sqlite3 $DB_PATH ".backup $BACKUP_DIR/registry_$DATE.db"

# Compress backup
gzip "$BACKUP_DIR/registry_$DATE.db"

# Upload to cloud storage (example with AWS S3)
aws s3 cp "$BACKUP_DIR/registry_$DATE.db.gz" s3://your-backup-bucket/

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "registry_*.db.gz" -mtime +7 -delete

echo "Backup completed: registry_$DATE.db.gz"
```

### Automated Backup with Cron

```bash
# Add to crontab
# Backup every 6 hours
0 */6 * * * /path/to/backup-script.sh >> /var/log/backup.log 2>&1

# Weekly full backup
0 2 * * 0 /path/to/full-backup-script.sh >> /var/log/backup.log 2>&1
```

### Disaster Recovery Plan

```bash
#!/bin/bash
# restore-script.sh

BACKUP_FILE=$1
DATA_DIR="/data"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

# Stop services
systemctl stop mcp-server

# Restore database
gunzip -c "$BACKUP_FILE" > "$DATA_DIR/registry.db"

# Restore file permissions
chown mcp:mcp "$DATA_DIR/registry.db"
chmod 644 "$DATA_DIR/registry.db"

# Start services
systemctl start mcp-server

echo "Restore completed from $BACKUP_FILE"
```

## Troubleshooting Deployments

### Common Issues

#### Port Binding Issues

```bash
# Check port usage
sudo netstat -tlnp | grep :3000
sudo lsof -i :3000

# Kill process using port
sudo kill -9 $(sudo lsof -t -i:3000)
```

#### Memory Issues

```bash
# Monitor memory usage
free -h
top -p $(pgrep -f "node.*mcp")

# Set memory limits in Docker
docker run --memory="512m" your-image
```

#### File Permissions

```bash
# Fix permissions
sudo chown -R mcp:mcp /opt/mcp-server
sudo chmod -R 755 /opt/mcp-server
sudo chmod 644 /opt/mcp-server/package.json
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=mcp:* NODE_ENV=production node dist/index.js

# Or with environment variable
NODE_ENV=production LOG_LEVEL=debug node dist/index.js
```

## Next Steps

- **Security**: Review our [Security Guide](security.md) for additional hardening
- **Monitoring**: Set up comprehensive monitoring and alerting
- **Testing**: Implement automated deployment testing
- **Documentation**: Keep deployment documentation updated
- **Team Training**: Ensure team members understand deployment procedures

For deployment issues, check our [Troubleshooting Guide](TROUBLESHOOTING.md) or open an issue on [GitHub](https://github.com/conorluddy/ContextPods/issues).

---

_This deployment guide covers common scenarios. Adapt configurations based on your specific requirements and infrastructure._
