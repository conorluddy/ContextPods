# Agent Guidelines for Context-Pods MCP Farm

## Agent Rules

_Important!_ _NEVER EVER_ BYPASS PRECOMMIT HOOK CHECKS
_Important!_ ESLINT _MUST_ ALWAYS BE PASSING - Run it after every file change

## Build/Test Commands

- `npm run build` - Build all packages (uses Turbo)
- `npm run test` - Run all tests (uses Vitest) - **ALL TESTS MUST PASS**
- `npm run lint` - Lint all packages - **MUST PASS WITH ZERO ERRORS**
- `npm run type-check` - TypeScript type checking
- `npm run format` - Format code with Prettier
- For single package: `cd packages/core && npm run test` (or build/lint)

## Testing Framework Commands

- `npm run test --workspace=@context-pods/testing` - Run testing framework tests
- Use `@context-pods/testing` package for MCP server validation
- Generate test reports with HTML and JUnit XML formats
- All MCP servers must pass protocol compliance tests

## Code Style

- **TypeScript**: Strict mode enabled, explicit return types required
- **Imports**: Use type imports (`import type { ... }`) for types only
- **Formatting**: Prettier with single quotes, 100 char width, 2 spaces
- **Naming**: camelCase for variables/functions, PascalCase for types/interfaces
- **Files**: Use `.js` extensions in imports (ESM), JSDoc comments for public APIs
- **Error Handling**: Custom error classes, no `any` types, unused vars prefixed with `_`
- **Exports**: Barrel exports in index.ts, explicit function return types
- **Console**: Only `console.warn` and `console.error` allowed

## Template Generation Guidelines

- **Array Validation**: Check each array element against allowed options, not the whole array
- **Error Messages**: Multi-line format with arrows (→) pointing to specific issues
- **Pre-flight Validation**: Always validate template integrity before processing
- **Standalone Templates**: No workspace dependencies - templates must be self-contained
- **ES Modules**: Use `import.meta.url` for file paths, always include `.js` extensions
- **Testing**: Template generation requires comprehensive unit and integration tests

## Architecture

- Monorepo with workspaces in `packages/`
- ESM modules with Node16 resolution
- Zod for runtime validation, strict TypeScript config
- **Testing Framework**: `@context-pods/testing` package provides comprehensive MCP server validation
  - MCP Protocol Compliance Testing with Zod schemas
  - Script Wrapper Testing for multi-language support (TypeScript, Python, Rust, Shell)
  - Test Harness for MCP server communication via stdio transport
  - Report Generation for HTML and JUnit XML formats

## CLI and Development Tools

- Use GH (Github CLI) to CRUD Github Issues
- We NEVER push to main. Always work in a git-flow type of way, with branches and PRs. Main represents production, and pushing to it will send out a new release.

## GitHub Issue Workflow

When working on GitHub issues, follow these steps:

- Use `gh issue view` to get the issue details based on the assigned issue number.
- Update the issue with the 'work-in-progress' label
- Think hard about the problem described in the issue
- Check out a new feature branch for this work
- Ensure you're working on a feature branch that has the latest commits from main branch
- Search the codebase for relevant files
- Look at recent PRs and commits to main branch for additional context
- Check any local diff to see was any work already done for this
- Think hard about how best to implement the changes described in the issue
  -For each design decision, ask - Simplicity Test: Can this be simpler without losing functionality? - Consistency Test: Does this follow existing patterns? - Integration Test: Does this work with all of the existing architecture?
- Employ a sub-agent and ask it for feedback on your plan
- Implement the changes in a clean manner, following clean-code principles
- Commit to the current branch after you complete any of your TODO items
  - Run linting and formatting prior to any commits.
- Use DocBlock comments on all blocks of code
- Update older comments if their subject matter has had any changes
- Ensure code passes linting and type checking
- _IMPORTANT_ If build is failing, even if it seems unrelated to the task, it's important to fix it before we commit anything.
- Look for any compilation warnings at build time and fix/clean them up
- Create a descriptive commit message
- Push and create a PR
- Address any PR comments
- Update issue $ARGUMENTS with the label: in code review

Remember to use the GitHub CLI (`gh`) for all GitHub-related tasks.
