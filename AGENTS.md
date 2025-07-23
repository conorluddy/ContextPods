# Agent Guidelines for Context-Pods MCP Farm

## Build/Test Commands

- `npm run build` - Build all packages (uses Turbo)
- `npm run test` - Run all tests (uses Vitest)
- `npm run lint` - Lint all packages
- `npm run type-check` - TypeScript type checking
- `npm run format` - Format code with Prettier
- For single package: `cd packages/core && npm run test` (or build/lint)

## Code Style

- **TypeScript**: Strict mode enabled, explicit return types required
- **Imports**: Use type imports (`import type { ... }`) for types only
- **Formatting**: Prettier with single quotes, 100 char width, 2 spaces
- **Naming**: camelCase for variables/functions, PascalCase for types/interfaces
- **Files**: Use `.js` extensions in imports (ESM), JSDoc comments for public APIs
- **Error Handling**: Custom error classes, no `any` types, unused vars prefixed with `_`
- **Exports**: Barrel exports in index.ts, explicit function return types
- **Console**: Only `console.warn` and `console.error` allowed

## Architecture

- Monorepo with workspaces in `packages/`
- ESM modules with Node16 resolution
- Zod for runtime validation, strict TypeScript config

## CLI and Development Tools

- Use GH (Github CLI) to CRUD Github Issues
- We NEVER push to main. Always work in a git-flow type of way, with branches and PRs. Main represents production, and pushing to it will send out a new release.

## GitHub Issue Workflow

When working on GitHub issues:

1. Use `gh issue view` to get issue details
2. Update issue with 'work-in-progress' label
3. Create feature branch from latest main
4. Search codebase and check recent PRs/commits for context
5. Plan implementation with simplicity, consistency, and integration tests
6. Implement with DocBlock comments and clean code principles
7. Run lint/format/type-check before commits
8. Fix any build failures before committing
9. Create descriptive commit messages and push
10. Create PR and update issue with 'in code review' label
