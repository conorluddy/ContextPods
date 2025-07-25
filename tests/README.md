# Context-Pods Test Infrastructure

This directory contains the comprehensive testing infrastructure for Context-Pods, implementing **Checkpoint 0** of the checkpoint-based testing strategy defined in [Issue #23](https://github.com/conorluddy/ContextPods/issues/23).

## 🎯 Checkpoint-Based Testing Strategy

Context-Pods follows an incremental testing approach with 11 checkpoints designed to achieve 85%+ test coverage through 49 carefully planned tests.

### Checkpoint Status:

- ✅ **Checkpoint 0**: Test Infrastructure Foundation (COMPLETED)
- 🚀 **Next**: Checkpoint 1.1 - Template Engine Core Tests

## 📁 Directory Structure

```
tests/
├── README.md                    # This documentation
├── setup.ts                     # Global test setup and environment
├── fixtures/                    # Shared test data and templates
│   └── templates/               # Template fixtures for testing
│       ├── basic-ts/            # TypeScript MCP server template
│       └── basic-python/        # Python MCP server template
└── utils/                       # Test utilities and helpers
    ├── mocks.ts                 # Mock implementations
    ├── builders.ts              # Test data builders
    └── helpers.ts               # Test helper functions
```

## 🛠️ Test Utilities

### Mocks (`utils/mocks.ts`)

- **`createMockFileSystem()`** - memfs-based filesystem mocking
- **`createMockMCPClient()`** - MCP protocol client mocking
- **`createMockMCPServer()`** - MCP protocol server mocking
- **`createMockDatabase()`** - SQLite database mocking
- **`createMockLogger()`** - Logger interface mocking

### Builders (`utils/builders.ts`)

- **`templateBuilder`** - Template metadata builders
- **`metadataBuilder`** - Generic metadata builders
- **`variableBuilder`** - Template variable builders
- **`serverConfigBuilder`** - Server configuration builders

### Helpers (`utils/helpers.ts`)

- **`createTempDir()`** - Temporary directory creation
- **`startTestServer()`** - Test MCP server management
- **`waitFor()`** - Async condition waiting
- **`createMockTemplate()`** - Template fixture creation
- **`captureConsole()`** - Console output capture
- **`withTimeout()`** - Timeout wrapper for async operations

## 🧪 Test Fixtures

### TypeScript Template (`fixtures/templates/basic-ts/`)

Complete MCP server template with:

- `metadata.json` - Template configuration
- `package.json.mustache` - Package definition with variables
- `src/index.ts.mustache` - Working MCP server implementation

### Python Template (`fixtures/templates/basic-python/`)

Complete MCP server template with:

- `metadata.json` - Template configuration
- `main.py.mustache` - Working MCP server implementation
- `requirements.txt.mustache` - Python dependencies

## ⚙️ Configuration

### Root Configuration (`/vitest.config.ts`)

- **Coverage**: v8 provider with text, JSON, HTML, LCOV reports
- **Environment**: Node.js testing environment
- **Aliases**: Package path aliases for imports
- **Setup**: Global test setup file
- **Thresholds**: Coverage thresholds (starts at 0%, increases per checkpoint)

### Package-Specific Configurations

Each package has its own `vitest.config.ts` that extends the root configuration:

- `packages/core/vitest.config.ts`
- `packages/server/vitest.config.ts`
- `packages/cli/vitest.config.ts`

## 🚀 Usage

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific package
cd packages/core && npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

### Using Test Utilities

```typescript
import { templateBuilder, createMockFileSystem } from '../utils/builders.js';
import { createMockFileSystem } from '../utils/mocks.js';

describe('Template Processing', () => {
  it('should process template variables', () => {
    // Create test data
    const template = templateBuilder.basic({
      name: 'test-server',
      variables: [
        /* ... */
      ],
    });

    // Mock filesystem
    const { fs, reset } = createMockFileSystem();

    // Test implementation
    // ...

    // Cleanup
    reset();
  });
});
```

## 🎯 Next Steps

With Checkpoint 0 complete, the infrastructure is ready for:

1. **Checkpoint 1.1**: Template Engine Core Tests (5 tests)
   - Variable substitution testing
   - Nested object handling
   - Missing variable handling
   - Content preservation validation
   - Array iteration support

2. **Checkpoint 1.2**: Template Engine File Operations (5 tests)
   - Output directory creation
   - File structure preservation
   - Mustache file processing
   - Permission preservation
   - Error handling

3. **Checkpoint 3.1**: E2E Basic Validation (3 tests)
   - TypeScript server generation
   - Python server generation
   - MCP protocol validation

## 📊 Coverage Goals

- **Current**: 0% (infrastructure only)
- **Target**: 85%+ across 11 checkpoints
- **Strategy**: Incremental coverage growth with each checkpoint
- **Validation**: E2E tests ensure generated servers actually work

## 🔗 Related Documentation

- [Issue #23: Checkpoint-Based Testing Implementation](https://github.com/conorluddy/ContextPods/issues/23)
- [Project README](../README.md)
- [Architecture Documentation](../docs/ARCHITECTURE.md)

---

**Status**: ✅ Checkpoint 0 Complete - Ready for Template Engine Testing

The test infrastructure provides a comprehensive foundation for systematic testing of the Context-Pods MCP development toolkit. All utilities, mocks, and fixtures are production-ready and designed to support the full 11-checkpoint testing journey.
