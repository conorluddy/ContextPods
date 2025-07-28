# Context-Pods Usage Examples

This guide provides practical examples of using Context-Pods to create MCP servers for various real-world scenarios.

## Table of Contents

- [Quick Start Examples](#quick-start-examples)
- [Real-World Scenarios](#real-world-scenarios)
- [Advanced Configurations](#advanced-configurations)
- [Integration Examples](#integration-examples)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)

## Quick Start Examples

### 1. Basic MCP Server

Create a simple MCP server with minimal configuration:

```bash
# Generate a basic TypeScript server
npx @context-pods/cli generate basic --name my-first-server

# Navigate to the generated server
cd generated/my-first-server

# Install dependencies
npm install

# Build and start
npm run build
npm start
```

### 2. TypeScript Server with Tools

Create a feature-rich TypeScript server with example tools:

```bash
npx @context-pods/cli generate typescript-advanced \
  --name file-manager \
  --description "MCP server for file management operations" \
  --includeTools true \
  --toolCategories '["file", "system"]' \
  --output ./servers
```

### 3. Python Data Processing Server

Create a Python-based MCP server for data processing:

```bash
npx @context-pods/cli generate python-basic \
  --name data-processor \
  --description "Python MCP server for data analysis and transformation" \
  --pythonVersion "3.11" \
  --includeAsyncSupport true
```

### 4. Wrapping an Existing Script

Convert an existing script into an MCP server:

```bash
# Wrap a Python script
npx @context-pods/cli wrap ./scripts/analyze_data.py \
  --name data-analyzer \
  --description "Wrapped data analysis script as MCP server"

# Wrap a Node.js script
npx @context-pods/cli wrap ./scripts/file_processor.js \
  --name file-processor \
  --description "File processing utilities as MCP server"
```

## Real-World Scenarios

### Scenario 1: PDF Processing Server

Create an MCP server that can read PDF files and extract text:

```bash
# Generate the server
npx @context-pods/cli generate typescript-advanced \
  --name pdf-processor \
  --description "MCP server for PDF file processing and text extraction" \
  --author "Your Name" \
  --includeTools true \
  --toolCategories '["file", "data"]'

# Navigate to the server
cd generated/pdf-processor

# Add PDF processing dependency
npm install pdf-parse

# Create the PDF processing tool
cat > src/tools/pdf-tools.ts << 'EOF'
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import pdf from 'pdf-parse';
import { promises as fs } from 'fs';

export const extractPdfText: Tool = {
  name: 'extract_pdf_text',
  description: 'Extract text content from a PDF file',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the PDF file'
      }
    },
    required: ['filePath']
  }
};

export async function handleExtractPdfText(params: any) {
  const { filePath } = params;

  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);

    return {
      content: [{
        type: 'text',
        text: data.text
      }],
      metadata: {
        pages: data.numpages,
        info: data.info
      }
    };
  } catch (error) {
    throw new Error(`Failed to extract PDF text: ${error.message}`);
  }
}
EOF

# Build and test
npm run build
npm test
```

### Scenario 2: Database Query Server

Create an MCP server for PostgreSQL database operations:

```bash
# Generate the server
npx @context-pods/cli generate typescript-advanced \
  --name postgres-manager \
  --description "MCP server for PostgreSQL database operations" \
  --includeTools true \
  --includeResources true

cd generated/postgres-manager

# Add PostgreSQL dependency
npm install pg @types/pg

# Create database configuration
cat > src/config/database.ts << 'EOF'
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mydb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
});
EOF

# Create database query tool
cat > src/tools/database-tools.ts << 'EOF'
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { pool } from '../config/database.js';

export const queryDatabase: Tool = {
  name: 'query_database',
  description: 'Execute a SQL query on the PostgreSQL database',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'SQL query to execute'
      },
      params: {
        type: 'array',
        description: 'Query parameters for prepared statements',
        items: { type: 'string' }
      }
    },
    required: ['query']
  }
};

export async function handleQueryDatabase(params: any) {
  const { query, params: queryParams = [] } = params;

  try {
    const result = await pool.query(query, queryParams);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result.rows, null, 2)
      }],
      metadata: {
        rowCount: result.rowCount,
        fields: result.fields.map(f => f.name)
      }
    };
  } catch (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }
}
EOF
```

### Scenario 3: API Integration Server

Create an MCP server that wraps a REST API:

```bash
# Generate the server
npx @context-pods/cli generate typescript-advanced \
  --name weather-api \
  --description "MCP server for weather data from OpenWeatherMap API" \
  --includeTools true \
  --toolCategories '["network", "data"]'

cd generated/weather-api

# Add HTTP client dependency
npm install axios

# Create API client
cat > src/tools/weather-tools.ts << 'EOF'
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

export const getCurrentWeather: Tool = {
  name: 'get_current_weather',
  description: 'Get current weather for a city',
  inputSchema: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City name'
      },
      country: {
        type: 'string',
        description: 'Country code (optional)',
        pattern: '^[A-Z]{2}$'
      }
    },
    required: ['city']
  }
};

export async function handleGetCurrentWeather(params: any) {
  const { city, country } = params;
  const location = country ? `${city},${country}` : city;

  try {
    const response = await axios.get(`${BASE_URL}/weather`, {
      params: {
        q: location,
        appid: API_KEY,
        units: 'metric'
      }
    });

    const data = response.data;

    return {
      content: [{
        type: 'text',
        text: `Weather in ${data.name}: ${data.weather[0].description}
Temperature: ${data.main.temp}°C (feels like ${data.main.feels_like}°C)
Humidity: ${data.main.humidity}%
Wind: ${data.wind.speed} m/s`
      }]
    };
  } catch (error) {
    throw new Error(`Failed to fetch weather data: ${error.message}`);
  }
}
EOF
```

### Scenario 4: File System Operations Server

Create a comprehensive file system operations server:

```bash
# Generate with specific configuration
cat > file-ops-config.json << 'EOF'
{
  "serverName": "file-operations",
  "description": "Comprehensive file system operations MCP server",
  "author": "DevOps Team",
  "includeTools": true,
  "toolCategories": ["file", "system"],
  "includeResources": true,
  "version": "1.0.0"
}
EOF

npx @context-pods/cli generate typescript-advanced --config file-ops-config.json

cd generated/file-operations

# Add additional file operation tools
cat > src/tools/advanced-file-tools.ts << 'EOF'
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export const fileChecksum: Tool = {
  name: 'file_checksum',
  description: 'Calculate checksum of a file',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: { type: 'string', description: 'Path to file' },
      algorithm: {
        type: 'string',
        enum: ['md5', 'sha1', 'sha256', 'sha512'],
        default: 'sha256'
      }
    },
    required: ['filePath']
  }
};

export const findFiles: Tool = {
  name: 'find_files',
  description: 'Find files matching a pattern',
  inputSchema: {
    type: 'object',
    properties: {
      directory: { type: 'string', description: 'Directory to search' },
      pattern: { type: 'string', description: 'Glob pattern' },
      recursive: { type: 'boolean', default: true }
    },
    required: ['directory', 'pattern']
  }
};

export const compareFiles: Tool = {
  name: 'compare_files',
  description: 'Compare two files for differences',
  inputSchema: {
    type: 'object',
    properties: {
      file1: { type: 'string', description: 'Path to first file' },
      file2: { type: 'string', description: 'Path to second file' }
    },
    required: ['file1', 'file2']
  }
};
EOF
```

## Advanced Configurations

### 1. TurboRepo Optimized Setup

Create a server optimized for TurboRepo monorepo development:

```bash
# Create with TurboRepo optimization
npx @context-pods/cli generate typescript-advanced \
  --name turbo-optimized-server \
  --description "TurboRepo optimized MCP server" \
  --optimization.turboRepo true \
  --optimization.hotReload true \
  --optimization.buildCaching true
```

### 2. Multi-Language Project

Create servers in multiple languages for the same project:

```bash
# Create a project directory
mkdir multi-language-project
cd multi-language-project

# TypeScript server for main logic
npx @context-pods/cli generate typescript-advanced \
  --name core-server \
  --description "Core TypeScript MCP server" \
  --output ./servers/typescript

# Python server for data processing
npx @context-pods/cli generate python-basic \
  --name data-processor \
  --description "Python data processing server" \
  --output ./servers/python

# Rust server for performance-critical operations
npx @context-pods/cli generate rust-basic \
  --name performance-server \
  --description "High-performance Rust server" \
  --output ./servers/rust
```

### 3. Environment-Specific Configurations

Create different configurations for development and production:

```bash
# Development configuration
cat > dev-config.json << 'EOF'
{
  "serverName": "dev-server",
  "description": "Development MCP server",
  "includeTools": true,
  "includeResources": true,
  "toolCategories": ["file", "data", "utility", "network", "system"],
  "nodeVersion": "20",
  "optimization": {
    "hotReload": true,
    "buildCaching": false
  }
}
EOF

# Production configuration
cat > prod-config.json << 'EOF'
{
  "serverName": "prod-server",
  "description": "Production MCP server",
  "includeTools": true,
  "toolCategories": ["file", "data"],
  "useStrictMode": true,
  "optimization": {
    "hotReload": false,
    "buildCaching": true
  }
}
EOF

# Generate servers
npx @context-pods/cli generate typescript-advanced --config dev-config.json --output ./dev
npx @context-pods/cli generate typescript-advanced --config prod-config.json --output ./prod
```

## Integration Examples

### 1. Claude Desktop Integration

Configure your generated server for Claude Desktop:

```bash
# After generating your server
cd generated/my-server
npm run build

# Add to Claude Desktop config (~/Library/Application Support/Claude/claude_desktop_config.json)
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["./generated/my-server/dist/index.js"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

### 2. VS Code Integration

Set up your server with Continue or Cody:

```bash
# For Continue
cat > .continue/config.json << 'EOF'
{
  "models": [...],
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["./generated/my-server/dist/index.js"]
    }
  }
}
EOF
```

### 3. CI/CD Integration

Automate server generation in your CI/CD pipeline:

```yaml
# GitHub Actions example
name: Generate MCP Servers
on: [push]

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Context-Pods
        run: npm install -g @context-pods/cli

      - name: Generate Servers
        run: |
          npx @context-pods/cli generate typescript-advanced \
            --name ci-generated-server \
            --config ./mcp-config.json

      - name: Build and Test
        run: |
          cd generated/ci-generated-server
          npm install
          npm run build
          npm test
```

## Troubleshooting Common Issues

### Issue 1: Template Not Found

```bash
# List available templates
npx @context-pods/cli templates

# Use exact template name
npx @context-pods/cli generate typescript-advanced --name my-server
```

### Issue 2: Variable Validation Errors

```bash
# Check variable requirements
npx @context-pods/cli generate typescript-advanced --help

# Fix common validation issues:
# - serverName must start with lowercase letter
# - Use hyphens instead of underscores
# - Wrap array values in quotes
npx @context-pods/cli generate typescript-advanced \
  --name "my-server" \  # ✓ Correct
  --name "My_Server" \  # ✗ Wrong
  --toolCategories '["file", "data"]'  # ✓ Correct format for arrays
```

### Issue 3: Build Failures

```bash
# Ensure all dependencies are installed
cd generated/my-server
npm install

# Check for TypeScript errors
npm run type-check

# Run linting
npm run lint

# Clean and rebuild
npm run clean
npm run build
```

### Issue 4: Server Won't Start

```bash
# Check if port is already in use
lsof -i :3000

# Run with debug logging
DEBUG=* npm start

# Test MCP protocol directly
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}' | node dist/index.js
```

## Next Steps

1. Explore the [Template Variables Documentation](./TEMPLATE_VARIABLES.md)
2. Learn about [Template Development](./TEMPLATE_DEVELOPMENT.md)
3. Understand the [MCP Protocol](./MCP_PROTOCOL.md)
4. Connect to the [Meta-MCP Server](./META_MCP_GUIDE.md)

## Contributing

Have a great usage example? Submit a PR to add it to this guide!
