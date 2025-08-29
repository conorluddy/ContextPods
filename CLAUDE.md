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

## Quality Gates - ALL MUST PASS BEFORE COMMIT/PUSH

Before committing or pushing any changes, ALL of the following quality gates must pass:

1. **Build**: `npm run build` - All packages must build successfully
2. **Type Check**: `npm run type-check` - All TypeScript must type check without errors
3. **Lint**: `npm run lint` - All ESLint rules must pass (zero errors, warnings acceptable)
4. **Format**: `npm run format` - All code must be properly formatted
5. **Test**: `npm run test` - All tests must pass (91+ tests across all packages)

**CRITICAL**: If any quality gate fails, you MUST fix the issues before proceeding. The pre-commit hooks enforce these standards and will prevent commits that don't meet quality requirements.

## Template Generation Best Practices

- **Array Validation** - Always validate array elements individually, not the entire array
- **Error Messages** - Provide multi-line, actionable error messages with examples
- **Standalone Templates** - Templates must work without workspace dependencies
- **Pre-flight Checks** - Validate template integrity before processing
- **ES Module Compatibility** - Use import.meta.url instead of \_\_dirname
- **File Extensions** - Always include .js extensions in TypeScript imports

- The Schema SSOT for MCP is here: https://github.com/modelcontextprotocol/modelcontextprotocol/tree/main/schema

## GitHub Actions Integration

Claude is integrated into the GitHub environment via Actions workflows that provide automated code assistance and review capabilities:

### Claude Assistant Workflow (`claude.yml`)

The primary Claude assistant workflow triggers on:
- **Issue Comments**: When `@claude` is mentioned in issue comments
- **PR Review Comments**: When `@claude` is mentioned in pull request review comments  
- **PR Reviews**: When `@claude` is mentioned in submitted reviews
- **Issues**: When `@claude` is mentioned in issue titles or descriptions

**Key Features:**
- Automated response to Claude mentions across GitHub events
- Full repository access for code analysis and modifications
- CI result integration for comprehensive development assistance
- Configurable prompts and model selection via workflow parameters

### Automated Code Review Workflow (`claude-code-review.yml`)

The automated code review workflow provides:
- **Automatic PR Reviews**: Triggers on pull request creation and updates
- **Comprehensive Analysis**: Reviews code quality, best practices, security, and test coverage
- **Repository Convention Awareness**: Uses CLAUDE.md guidelines for consistent feedback
- **Selective Triggering**: Can be configured for specific authors or file paths

**Review Areas:**
- Code quality and best practices adherence
- Potential bugs and security vulnerabilities  
- Performance considerations and optimizations
- Test coverage and completeness
- Alignment with repository standards (following CLAUDE.md guidelines)

### Integration Benefits

- **Development Workflow Enhancement**: Seamless integration with GitHub's native PR and issue workflows
- **Consistent Code Quality**: Automated enforcement of project standards and best practices
- **Knowledge Retention**: Claude maintains context about repository conventions and development patterns
- **CI/CD Integration**: Access to workflow results and build status for informed assistance
