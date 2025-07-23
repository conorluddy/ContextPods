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
