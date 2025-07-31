# Templates Guide

Context-Pods provides a rich set of templates to accelerate your MCP server development. Each template is designed for specific use cases and languages, providing you with a solid foundation to build upon.

## Available Templates

### TypeScript Templates

#### 1. `basic` - Simple TypeScript Server

**Best for**: First-time MCP developers, simple tool servers

```bash
npx @context-pods/create generate --template basic --language typescript
```

**Features**:

- Single file server implementation
- Basic tool and resource examples
- Minimal dependencies
- Perfect for learning MCP concepts

**Structure**:

```
├── src/
│   └── index.ts          # Complete server in one file
├── package.json          # Minimal dependencies
└── README.md            # Getting started guide
```

#### 2. `typescript-advanced` - Full-Featured TypeScript Server

**Best for**: Production servers, complex integrations, enterprise use

```bash
npx @context-pods/create generate --template typescript-advanced --language typescript
```

**Features**:

- Modular architecture with separate tool/resource files
- Built-in logging and error handling
- Input validation utilities
- Performance monitoring hooks
- TurboRepo optimization
- Comprehensive testing setup

**Structure**:

```
├── src/
│   ├── index.ts          # Server entry point
│   ├── server.ts         # MCP server implementation
│   ├── tools/            # Tool implementations
│   │   ├── index.ts      # Tool registry
│   │   ├── data-tools.ts # Data manipulation tools
│   │   ├── file-tools.ts # File system tools
│   │   └── utility-tools.ts # General utilities
│   ├── resources/        # Resource providers
│   │   └── index.ts      # Resource registry
│   └── utils/            # Shared utilities
│       ├── helpers.ts    # Common functions
│       ├── logger.ts     # Logging utilities
│       └── validation.ts # Input validation
├── EXAMPLES.md          # Usage examples
└── package.json         # Full dependency set
```

### Python Templates

#### 3. `python-basic` - Python MCP Server

**Best for**: Data science, ML integration, Python-native libraries

```bash
npx @context-pods/create generate --template python-basic --language python
```

**Features**:

- Async/await support with asyncio
- Built-in data science tool examples
- Integration with popular Python libraries
- Virtual environment setup
- pytest testing framework

**Structure**:

```
├── src/
│   ├── __init__.py
│   ├── server.py         # Main server implementation
│   ├── tools.py          # Tool implementations
│   └── resources.py      # Resource providers
├── requirements.txt      # Python dependencies
├── main.py              # Entry point
└── README.md            # Python-specific guide
```

**Key Libraries Included**:

- `requests` - HTTP client
- `pandas` - Data manipulation
- `numpy` - Numerical computing
- `asyncio` - Async support

### Rust Templates

#### 4. `rust-basic` - High-Performance Rust Server

**Best for**: System-level tools, high-performance computing, CLI tool wrappers

```bash
npx @context-pods/create generate --template rust-basic --language rust
```

**Features**:

- Tokio async runtime
- Serde JSON serialization
- Error handling with `anyhow`
- Memory safety and performance
- Built-in CLI integration examples

**Structure**:

```
├── src/
│   ├── main.rs           # Entry point
│   ├── server.rs         # MCP server implementation
│   ├── tools.rs          # Tool implementations
│   └── resources.rs      # Resource providers
├── Cargo.toml           # Rust dependencies
└── README.md            # Rust-specific guide
```

### Shell Templates

#### 5. `shell-wrapper` - Shell Script MCP Server

**Best for**: Wrapping existing CLI tools, system administration, legacy script integration

```bash
npx @context-pods/create generate --template shell-wrapper --language shell
```

**Features**:

- POSIX shell compatibility
- CLI tool integration examples
- Process management utilities
- Error handling and logging
- Environment variable management

**Structure**:

```
├── mcp-server.sh        # Main server script
├── scripts/             # Individual tool scripts
│   ├── hello.sh         # Hello world example
│   ├── file-ops.sh      # File operations
│   └── system-info.sh   # System information
└── README.md            # Shell-specific guide
```

## Template Selection Guide

### Choosing the Right Template

| Use Case        | Recommended Template                    | Reason                          |
| --------------- | --------------------------------------- | ------------------------------- |
| Learning MCP    | `basic`                                 | Simple, minimal setup           |
| Production API  | `typescript-advanced`                   | Full features, enterprise-ready |
| Data Science    | `python-basic`                          | NumPy, Pandas integration       |
| System Tools    | `rust-basic`                            | Performance, memory safety      |
| CLI Integration | `shell-wrapper`                         | Direct script wrapping          |
| Web Services    | `typescript-advanced`                   | HTTP client, validation         |
| File Processing | `rust-basic` or `typescript-advanced`   | Performance or ecosystem        |
| Database Access | `python-basic` or `typescript-advanced` | Library availability            |

### Language Comparison

| Feature            | TypeScript | Python    | Rust      | Shell   |
| ------------------ | ---------- | --------- | --------- | ------- |
| Learning Curve     | Medium     | Easy      | Hard      | Easy    |
| Performance        | Good       | Medium    | Excellent | Medium  |
| Ecosystem          | Excellent  | Excellent | Growing   | Limited |
| Type Safety        | Excellent  | Optional  | Excellent | None    |
| Async Support      | Native     | Native    | Native    | Basic   |
| Package Management | npm        | pip       | cargo     | Manual  |

## Template Customization

### Template Variables

Each template supports customization through variables:

```bash
# Generate with custom variables
npx @context-pods/create generate \
  --template typescript-advanced \
  --variables '{"serverName":"my-api","description":"Custom API server"}'
```

**Common Variables**:

- `serverName` - Name of the MCP server
- `description` - Server description
- `authorName` - Author information
- `authorEmail` - Contact email
- `version` - Initial version number
- `license` - License type (MIT, Apache, etc.)

### Advanced Customization

#### Custom Tool Categories

For `typescript-advanced` template:

```typescript
// Customize tool categories in template variables
{
  "toolCategories": [
    "file-operations",
    "data-processing",
    "api-integration"
  ]
}
```

#### Python Package Selection

For `python-basic` template:

```python
# Customize Python dependencies
{
  "pythonPackages": [
    "requests",
    "pandas",
    "numpy",
    "scikit-learn"
  ]
}
```

#### Rust Feature Flags

For `rust-basic` template:

```toml
# Customize Cargo features
{
  "rustFeatures": [
    "serde_json",
    "tokio",
    "reqwest",
    "clap"
  ]
}
```

## Template Development

### Creating Custom Templates

See [TEMPLATE_DEVELOPMENT.md](TEMPLATE_DEVELOPMENT.md) for detailed instructions on:

- Template structure requirements
- Variable system usage
- File generation patterns
- Validation and testing
- Contributing new templates

### Template Validation

All templates undergo rigorous validation:

```bash
# Validate a template
npx @context-pods/testing validate-template ./my-template

# Test template generation
npx @context-pods/testing test-template ./my-template --all-languages
```

## Migration Between Templates

### Upgrading Templates

When upgrading to newer template versions:

1. **Generate a fresh server** with the new template
2. **Compare the structures** to identify changes
3. **Migrate your custom code** to the new structure
4. **Test thoroughly** with the testing framework

### Converting Between Languages

To convert an existing server to a different language:

1. **Generate a new server** in the target language
2. **Map your tools and resources** to the new structure
3. **Implement equivalent functionality** using language-specific patterns
4. **Validate with testing framework**

## Template Examples

### Basic Usage Examples

Each template includes comprehensive examples:

#### TypeScript Advanced

```typescript
// Example: Weather API integration
export async function getWeather(args: { location: string }) {
  const response = await fetch(`https://api.weather.com/v1/current.json?q=${args.location}`);
  return { temperature: await response.json() };
}
```

#### Python Basic

```python
# Example: Data processing
async def process_data(args: dict) -> dict:
    import pandas as pd
    df = pd.DataFrame(args['data'])
    return {'processed': df.describe().to_dict()}
```

#### Rust Basic

```rust
// Example: File operations
pub async fn read_file(args: serde_json::Value) -> Result<serde_json::Value> {
    let path = args["path"].as_str().unwrap();
    let content = tokio::fs::read_to_string(path).await?;
    Ok(json!({ "content": content }))
}
```

#### Shell Wrapper

```bash
# Example: System information
get_system_info() {
    echo "{
        \"os\": \"$(uname -s)\",
        \"kernel\": \"$(uname -r)\",
        \"memory\": \"$(free -h | grep '^Mem:' | awk '{print $2}')\"
    }"
}
```

## Best Practices

### Template Selection Best Practices

1. **Start Simple**: Begin with `basic` templates for learning
2. **Match Your Stack**: Choose languages you're comfortable with
3. **Consider Performance**: Use Rust for high-performance scenarios
4. **Leverage Ecosystems**: Python for data science, TypeScript for web APIs
5. **Plan for Growth**: Advanced templates support scaling better

### Development Best Practices

1. **Follow Template Structure**: Don't deviate from established patterns
2. **Use Built-in Utilities**: Leverage template-provided logging, validation
3. **Test Early and Often**: Use the testing framework throughout development
4. **Document Your Changes**: Update README files as you customize
5. **Version Control**: Commit template changes incrementally

## Troubleshooting Templates

### Common Issues

#### Template Generation Fails

```bash
# Check template validity
npx @context-pods/testing validate-template ./template-name

# Verify all required files exist
ls -la template-name/
```

#### Missing Dependencies

```bash
# For TypeScript templates
npm install

# For Python templates
pip install -r requirements.txt

# For Rust templates
cargo build
```

#### MCP Compliance Issues

```bash
# Validate generated server
npx @context-pods/testing validate-mcp ./generated-server

# Check specific compliance issues
npx @context-pods/testing validate-mcp ./generated-server --verbose
```

## Next Steps

- **Getting Started**: New to Context-Pods? Start with our [Getting Started Guide](getting-started.md)
- **API Reference**: Dive deeper with the [API Reference](api-reference.md)
- **Testing**: Learn the [Testing Framework](testing.md)
- **Contributing**: Help improve templates with our [CONTRIBUTING.md](../CONTRIBUTING.md) guide

Happy templating! 🎨
