# Test Coverage Doubling Plan for Context-Pods

## 📊 Current State
- **Total Test Files**: 19
- **Target**: 45-50 test files (2.5x increase)
- **Current Coverage**: ~45% of source files have tests

### Package Breakdown
| Package | Current Test Files | Source Files | Coverage Status |
|---------|-------------------|--------------|-----------------|
| `@context-pods/core` | 9 | 8 | ✅ Good |
| `@context-pods/server` | 6 | 12 | ⚠️ Moderate |
| `@context-pods/cli` | 2 | 14 | ❌ Minimal |
| `@context-pods/templates` | 1 | 1 | ⚠️ Minimal |
| `@context-pods/testing` | 1 | 6+ | ❌ Minimal |
| `@context-pods/create` | 0 | 1 | ❌ None |

## 🎯 Implementation Strategy: Multi-PR Approach

### Phase 1A: Foundation Tests (PR #1) - IMMEDIATE
**Priority**: 🔴 CRITICAL
**Target**: 5-6 new test files

1. **Base Tool Testing** (`packages/server/tests/unit/tools/base-tool.test.ts`)
   - Foundation class for all server tools
   - Error boundary testing
   - Abstract method validation
   - Tool registration and lifecycle

2. **MCP Protocol Compliance** (`packages/server/tests/unit/protocol/mcp-compliance.test.ts`)
   - Validate server responses against MCP schema
   - Test protocol version negotiation
   - Message format validation
   - Error response compliance

3. **Fix Existing Test Gaps**
   - Enhance `cli-commands.test.ts` to test actual functionality
   - Add missing error scenarios to existing tests

### Phase 1B: CLI Commands Real Testing (PR #2) - Week 1
**Priority**: 🔴 HIGH
**Target**: 8-10 new test files

1. **List Command** (`packages/cli/tests/unit/commands/list.test.ts`)
   - Empty registry handling
   - Different output formats (table, JSON, summary)
   - Registry connection failures
   - Filtering and sorting

2. **Build Command** (`packages/cli/tests/unit/commands/build.test.ts`)
   - Turbo integration
   - Build target options
   - Clean builds
   - Error handling for compilation failures

3. **Server Commands** (`packages/cli/tests/unit/commands/server.test.ts`)
   - Start/stop/status operations
   - Port conflict handling
   - Process management
   - Development mode with hot reload

4. **Wrap Command** (`packages/cli/tests/unit/commands/wrap.test.ts`)
   - Script validation
   - Language detection
   - Template selection
   - Output path handling

5. **Init Command** (`packages/cli/tests/unit/commands/init.test.ts`)
   - Project initialization
   - Configuration setup
   - Directory validation

6. **Dev Command** (`packages/cli/tests/unit/commands/dev.test.ts`)
   - Watch mode setup
   - Hot reload functionality
   - Port configuration

7. **Templates Command** (`packages/cli/tests/unit/commands/templates.test.ts`)
   - Template listing
   - Template info display
   - Template path resolution

8. **Test Command** (`packages/cli/tests/unit/commands/test.test.ts`)
   - Test runner integration
   - Coverage reporting
   - Test filtering

### Phase 2: Server Tools Comprehensive Testing (PR #3) - Week 1-2
**Priority**: 🔴 HIGH
**Target**: 8-10 new test files

1. **Create MCP Tool** (`packages/server/tests/unit/tools/create-mcp.test.ts`)
   - Server name validation
   - Template selection logic
   - Variable substitution
   - Output directory handling

2. **Validate MCP Tool** (`packages/server/tests/unit/tools/validate-mcp.test.ts`)
   - Schema validation
   - Registry validation
   - Build validation
   - Error reporting

3. **List MCPs Tool** (`packages/server/tests/unit/tools/list-mcps.test.ts`)
   - Filtering options
   - Output formats
   - Status checking
   - Registry queries

4. **Wrap Script Tool** (`packages/server/tests/unit/tools/wrap-script.test.ts`)
   - Script language detection
   - Wrapper template selection
   - Permission handling
   - Path resolution

5. **Integration Tests** (`packages/server/tests/integration/tools-workflow.test.ts`)
   - End-to-end tool workflows
   - Tool interaction testing
   - Registry updates

### Phase 3: Utilities & Infrastructure (PR #4) - Week 2
**Priority**: 🟡 MEDIUM
**Target**: 6-8 new test files

1. **Output Formatter** (`packages/cli/tests/unit/utils/output-formatter.test.ts`)
   - Spinner management
   - Table formatting
   - JSON output
   - Color handling

2. **Cache Manager** (`packages/cli/tests/unit/utils/cache-manager.test.ts`)
   - Cache initialization
   - Cache invalidation
   - TTL handling
   - Storage limits

3. **Turbo Integration** (`packages/cli/tests/unit/utils/turbo-integration.test.ts`)
   - Task execution
   - Cache configuration
   - Pipeline setup
   - Error handling

4. **Configuration Management** (`packages/cli/tests/unit/config/index.test.ts`)
   - Config loading
   - Environment variables
   - Default values
   - Validation

### Phase 4: Create & Testing Packages (PR #5) - Week 2-3
**Priority**: 🟡 MEDIUM
**Target**: 8-10 new test files

1. **NPX Runner** (`packages/create/tests/unit/create-context-pods.test.ts`)
   - Package installation
   - Argument forwarding
   - Error handling
   - Cleanup

2. **Testing Framework Modules**
   - Protocol validation (`packages/testing/tests/unit/protocol/index.test.ts`)
   - Wrapper utilities (`packages/testing/tests/unit/wrappers/index.test.ts`)
   - Language support (`packages/testing/tests/unit/languages/index.test.ts`)
   - Performance testing (`packages/testing/tests/unit/performance/index.test.ts`)
   - Test generation (`packages/testing/tests/unit/generation/index.test.ts`)

## 📋 Testing Best Practices

### Test Structure
```typescript
describe('Component/Function Name', () => {
  // Setup and teardown
  beforeEach(() => {
    // Reset mocks, setup test environment
  });

  describe('Happy Path', () => {
    it('should handle normal operation correctly', () => {
      // Test expected behavior
    });
  });

  describe('Error Handling', () => {
    it('should handle specific error gracefully', () => {
      // Test error scenarios
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary conditions', () => {
      // Test edge cases
    });
  });
});
```

### Testing Strategy
1. **Unit Tests**: Mock external dependencies, test pure logic
2. **Integration Tests**: Test component interactions with real dependencies
3. **E2E Tests**: Test complete workflows from CLI to output

### Mock Strategy
- Use Vitest's built-in mocking capabilities
- Mock file system operations for speed
- Mock network requests
- Mock child processes
- Use real implementations for critical paths in integration tests

## 🎯 Success Metrics

### Quantitative Goals
- **Test Files**: 19 → 45-50 files (2.5x increase)
- **Code Coverage**: Target 80%+ for critical paths
- **Command Coverage**: 100% of user-facing commands tested
- **Tool Coverage**: 100% of MCP tools tested

### Qualitative Goals
- All error paths have tests
- Mock external dependencies properly
- Fast test execution (< 30s for full suite)
- Clear test descriptions
- Examples serve as documentation

## 🚀 Getting Started

1. **Check out feature branch**: `feat/double-test-coverage`
2. **Run existing tests**: `npm test`
3. **Check current coverage**: `npm run test:coverage`
4. **Start with Phase 1A** (Foundation tests)
5. **Commit frequently** with descriptive messages
6. **Create PR** when phase is complete

## 📈 Progress Tracking

- [ ] Phase 1A: Foundation Tests (0/3 files)
- [ ] Phase 1B: CLI Commands (0/8 files)
- [ ] Phase 2: Server Tools (0/8 files)
- [ ] Phase 3: Utilities (0/6 files)
- [ ] Phase 4: Create & Testing (0/8 files)

## 🔧 Commands Reference

```bash
# Run all tests
npm test

# Run tests for specific package
npm run test --workspace=@context-pods/cli

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Run type checking
npm run typecheck
```

## 📝 Notes

- Each PR should include tests that pass linting and type checking
- Update this document as progress is made
- Consider adding integration tests for critical user journeys
- Ensure tests are maintainable and well-documented