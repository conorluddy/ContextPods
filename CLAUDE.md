# Agent Guidelines for Context-Pods MCP Farm

_IMPORTANT!_ - See AGENTS.md

## Development Best Practices

- **NEVER EVER BYPASS PRECOMMIT HOOK CHECKS** - All commits must pass linting, type checking, building, and testing
- **ESLINT MUST ALWAYS BE PASSING** - Fix all ESLint errors before committing
- **ALL TESTS MUST PASS** - The testing framework ensures code quality and MCP compliance
- **USE THE TESTING FRAMEWORK** - Validate MCP servers and script wrappers with `@context-pods/testing`

## Testing Framework Usage

The project includes a comprehensive testing framework at `packages/testing/` for validating MCP servers and script wrappers.

### Key Components

- **MCP Protocol Compliance Testing** - Validates servers against MCP standards using Zod schemas
- **Script Wrapper Testing** - Tests wrapped scripts in multiple languages (TypeScript, Python, Rust, Shell)
- **Test Harness** - Communication testing for MCP servers via stdio transport
- **Report Generation** - HTML and JUnit XML reports for CI/CD integration

### Common Commands

```bash
# Run all tests including the testing framework
npm test

# Run tests for a specific package
npm run test --workspace=@context-pods/testing

# Test MCP server compliance
npx @context-pods/testing validate-mcp ./path/to/server

# Test script wrapper functionality
npx @context-pods/testing test-wrapper ./path/to/script.py --language python

# Generate test reports
npx @context-pods/testing generate-report ./test-results.json --format html
```

### When Working on Testing

- Always add tests when creating new functionality
- Use the testing framework to validate any MCP servers you create
- Ensure all test types pass: unit tests, integration tests, MCP compliance tests
- Generate reports for documentation and CI/CD integration

## Code Quality Standards

- **TypeScript Strict Mode** - All TypeScript must compile without errors
- **ESLint Compliance** - Zero ESLint errors or warnings allowed
- **Test Coverage** - New code should include comprehensive tests
- **MCP Compliance** - All MCP servers must pass protocol validation tests
