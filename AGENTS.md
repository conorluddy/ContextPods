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
    -For each design decision, ask
      - Simplicity Test: Can this be simpler without losing functionality?
      - Consistency Test: Does this follow existing patterns?
      - Integration Test: Does this work with all of the existing architecture?
- Employ a sub-agent and ask it for feedback on your plan
- Implement the changes in a clean manner, following clean-code principles
- Commit to the current branch after you complete any of your TODO items
  - Run linting and formatting prior to any commits.
- Use DocBlock comments on all blocks of code
- Update older comments if their subject matter has had any changes
- Ensure code passes linting and type checking
- *IMPORTANT* If build is failing, even if it seems unrelated to the task, it's important to fix it before we commit anything.
- Look for any compilation warnings at build time and fix/clean them up
- Create a descriptive commit message
- Push and create a PR
- Address any PR comments 
- Update issue $ARGUMENTS with the label: in code review

Remember to use the GitHub CLI (`gh`) for all GitHub-related tasks.

