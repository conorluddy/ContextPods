# Frequently Asked Questions (FAQ)

Common questions and answers about Context-Pods, MCP server development, and troubleshooting.

## Table of Contents

- [General Questions](#general-questions)
- [Getting Started](#getting-started)
- [Template System](#template-system)
- [Meta-MCP Server](#meta-mcp-server)
- [Testing Framework](#testing-framework)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Performance](#performance)
- [Contributing](#contributing)

## General Questions

### What is Context-Pods?

Context-Pods is a comprehensive development framework for creating, testing, and managing Model Context Protocol (MCP) servers. It provides templates, tools, and utilities to generate production-ready MCP servers in multiple programming languages.

### What is the Model Context Protocol (MCP)?

MCP is a protocol developed by Anthropic that enables AI assistants like Claude to securely connect to external data sources and tools. It provides a standardized way for AI systems to interact with various services and resources.

### How does Context-Pods relate to Claude Desktop?

Context-Pods generates MCP servers that can be configured to work with Claude Desktop. The generated servers expose tools and resources that Claude can use to help users with various tasks.

### What languages does Context-Pods support?

Context-Pods supports:

- **TypeScript** - Full type safety with advanced tooling
- **Python** - Async support with data science libraries
- **Rust** - High-performance servers with memory safety
- **Shell** - Wrapper scripts for existing CLI tools
- **JavaScript** - (Coming soon) Simple, no-build-step servers

### Is Context-Pods free to use?

Yes, Context-Pods is open source and free to use under the MIT license. You can use it for personal, commercial, and enterprise projects.

## Getting Started

### How do I install Context-Pods?

The fastest way is using npx:

```bash
npx @context-pods/create
```

Or install globally:

```bash
npm install -g @context-pods/cli
context-pods generate
```

### What are the system requirements?

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- **Git** for version control
- **Operating System**: macOS, Linux, or Windows with WSL2

For language-specific templates:

- **Python** 3.8+ (for Python templates)
- **Rust** 1.70.0+ (for Rust templates)
- **Shell** POSIX-compatible shell (for shell templates)

### How do I create my first MCP server?

```bash
# Generate interactively
npx @context-pods/create

# Or specify parameters
npx @context-pods/cli generate --name my-server --template typescript-advanced
```

Follow the prompts to customize your server, then:

```bash
cd my-server
npm install
npm run build
npm run dev
```

### How do I integrate with Claude Desktop?

1. Generate your MCP server
2. Build it: `npm run build`
3. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/absolute/path/to/your/server/dist/index.js"]
    }
  }
}
```

4. Restart Claude Desktop

## Template System

### Which template should I choose?

| Use Case               | Recommended Template  |
| ---------------------- | --------------------- |
| Learning MCP           | `basic`               |
| Production API server  | `typescript-advanced` |
| Data science/ML        | `python-basic`        |
| High-performance tools | `rust-basic`          |
| Wrapping CLI tools     | `shell-wrapper`       |

### Can I customize templates?

Yes! You can:

- Modify template variables during generation
- Create custom templates (see [Template Development Guide](TEMPLATE_DEVELOPMENT.md))
- Fork existing templates and modify them

### How do I create a custom template?

See our [Template Development Guide](TEMPLATE_DEVELOPMENT.md) for detailed instructions. Basic steps:

1. Create template directory structure
2. Add `template.json` metadata file
3. Create template files with variables
4. Test with the validation framework

### Can I use my own template repository?

Currently, Context-Pods uses built-in templates. Custom template repositories are planned for future releases.

## Meta-MCP Server

### What is the Meta-MCP Server?

The Meta-MCP Server is a special MCP server that exposes Context-Pods functionality through the MCP protocol itself. It allows you to generate and manage MCP servers directly from Claude Desktop.

### How do I use the Meta-MCP Server?

1. Install Context-Pods
2. Start the Meta-MCP Server: `context-pods server`
3. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "context-pods": {
      "command": "node",
      "args": ["@context-pods/server"]
    }
  }
}
```

4. Use tools like `create-mcp` and `wrap-script` in Claude Desktop

### What tools does the Meta-MCP Server provide?

- **create-mcp**: Generate new MCP servers from templates
- **wrap-script**: Convert existing scripts to MCP servers
- **list-mcps**: List and manage generated servers
- **validate-mcp**: Validate MCP server compliance

### Can I run multiple Meta-MCP Servers?

Yes, but each should use a different registry database and port to avoid conflicts.

## Testing Framework

### How do I test my generated MCP server?

Context-Pods includes a comprehensive testing framework:

```bash
# Validate MCP compliance
npx @context-pods/testing validate-mcp ./my-server

# Test script wrappers
npx @context-pods/testing test-wrapper ./my-script.py --language python

# Run performance benchmarks
npx @context-pods/testing benchmark ./my-server
```

### What does MCP compliance testing check?

- Protocol message format compliance
- Tool and resource schema validation
- Error handling patterns
- Communication flow correctness
- Performance characteristics

### How do I write custom tests for my server?

Generated servers include test templates. Add your tests to the `tests/` directory:

```typescript
// tests/my-tool.test.ts
import { validateMCPServer } from '@context-pods/testing';

describe('My Custom Tool', () => {
  it('should handle valid input', async () => {
    const result = await testTool('my-tool', { input: 'test' });
    expect(result.success).toBe(true);
  });
});
```

### Can I integrate testing with CI/CD?

Yes! The testing framework generates JUnit XML reports:

```bash
npx @context-pods/testing validate-mcp ./ --format junit --output junit.xml
```

Use in GitHub Actions, GitLab CI, or other CI/CD systems.

## Deployment

### How do I deploy my MCP server to production?

See our comprehensive [Deployment Guide](deployment.md). Basic steps:

1. Build for production: `npm run build`
2. Set production environment variables
3. Use a process manager like PM2 or systemd
4. Configure HTTPS and security headers
5. Set up monitoring and logging

### Can I containerize my MCP server?

Yes! Generated servers include Dockerfile examples:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### What about serverless deployment?

Generated servers can be adapted for serverless platforms like AWS Lambda, Vercel, or Netlify Functions. You may need to modify the server entry point for the specific platform.

### How do I handle environment variables securely?

Use secrets management services:

- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault
- Environment variable injection in container orchestration

Never commit secrets to version control.

## Troubleshooting

### My server won't start, what should I check?

1. **Build errors**: Run `npm run build` and fix TypeScript errors
2. **Port conflicts**: Check if port is already in use
3. **Dependencies**: Run `npm install` to ensure all dependencies are installed
4. **Permissions**: Check file permissions and user access
5. **Environment**: Verify required environment variables are set

### Claude Desktop can't find my server

Common issues:

1. **Wrong path**: Ensure absolute path in Claude Desktop config
2. **Build not current**: Run `npm run build` after changes
3. **Permissions**: Check file executable permissions
4. **Server errors**: Check server logs for startup errors

### Tools are not appearing in Claude Desktop

1. **Restart Claude Desktop** after configuration changes
2. **Check server logs** for errors
3. **Validate MCP compliance**: `npx @context-pods/testing validate-mcp ./`
4. **Verify tool registration** in your server code

### Performance is slow

1. **Enable caching** where appropriate
2. **Optimize database queries** if using a database
3. **Use connection pooling** for external APIs
4. **Profile your code** to identify bottlenecks
5. **Consider using Rust templates** for compute-intensive tasks

### Template generation fails

1. **Check template validity**: Templates must pass validation
2. **Verify variables**: Ensure all required variables are provided
3. **File permissions**: Check write permissions in output directory
4. **Disk space**: Ensure sufficient disk space for generation

## Performance

### How can I optimize my MCP server performance?

1. **Choose the right template**: Rust for compute, TypeScript for API integration
2. **Implement caching**: Cache expensive operations and API calls
3. **Use connection pooling**: For database and HTTP connections
4. **Optimize async operations**: Use proper async/await patterns
5. **Monitor resource usage**: Use profiling tools and metrics

### What are the performance characteristics of different templates?

| Template            | Startup Time | Memory Usage | CPU Efficiency | Best For                   |
| ------------------- | ------------ | ------------ | -------------- | -------------------------- |
| basic               | Fast         | Low          | Good           | Simple tools               |
| typescript-advanced | Medium       | Medium       | Good           | APIs, complex logic        |
| python-basic        | Medium       | Medium       | Fair           | Data processing            |
| rust-basic          | Fast         | Low          | Excellent      | High-performance computing |
| shell-wrapper       | Fast         | Very Low     | Good           | CLI tool integration       |

### How do I monitor performance in production?

Generated servers include built-in metrics:

```typescript
// Access metrics endpoint
GET / metrics;

// Custom metrics
const requestDuration = new Histogram({
  name: 'mcp_request_duration_seconds',
  help: 'Duration of MCP requests',
});
```

Use monitoring tools like Prometheus, Grafana, or cloud provider monitoring.

## Contributing

### How can I contribute to Context-Pods?

We welcome contributions! See our [Contributing Guide](../CONTRIBUTING.md) for details:

1. **Bug reports**: Report issues on GitHub
2. **Feature requests**: Propose new features
3. **Code contributions**: Submit pull requests
4. **Documentation**: Improve guides and examples
5. **Templates**: Create and share new templates

### How do I report a bug?

1. Check existing issues on GitHub
2. Provide minimal reproduction case
3. Include system information and versions
4. Add relevant logs and error messages

### Can I create and share templates?

Yes! We encourage community templates. Follow our template development guidelines and submit them for review.

### How do I get help with development?

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and community help
- **Documentation**: Comprehensive guides in the `docs/` directory
- **Examples**: Real-world examples in template directories

## Need More Help?

If you can't find the answer to your question:

1. **Check our documentation**: Comprehensive guides in the `docs/` folder
2. **Search GitHub Issues**: Previous questions and solutions
3. **Create a new issue**: Detailed issue templates for bugs and features
4. **Join discussions**: Community help and feature discussions

## Common Error Messages

### "Template validation failed"

**Cause**: Template doesn't meet validation requirements
**Solution**: Check template structure and metadata

### "MCP compliance check failed"

**Cause**: Generated server doesn't follow MCP protocol
**Solution**: Use `npx @context-pods/testing validate-mcp` for details

### "Port already in use"

**Cause**: Another process is using the same port
**Solution**: Change port in configuration or stop conflicting process

### "Module not found"

**Cause**: Missing dependencies or incorrect import paths
**Solution**: Run `npm install` and check import statements

### "Permission denied"

**Cause**: File permission issues
**Solution**: Check file permissions and user access rights

---

_This FAQ covers the most common questions. For additional help, see our comprehensive documentation or open an issue on GitHub._
