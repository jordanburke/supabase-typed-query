# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# supabase-typed-query Development Guide

## Build & Test Commands

### Pre-Checkin Command

```bash
pnpm validate                # 🚀 Main command: format, lint, typecheck, test, and build
```

### Individual Commands

```bash
# Formatting
pnpm format                  # Format code with Prettier
pnpm format:check            # Check formatting without writing

# Linting
pnpm lint                    # Fix ESLint issues
pnpm lint:check              # Check ESLint issues without fixing

# Type Checking
pnpm typecheck               # Check TypeScript types

# Testing
pnpm test                    # Run tests with Vitest
pnpm test:watch              # Run tests in watch mode
pnpm test:coverage           # Run tests with coverage

# Building
pnpm build                   # Production build with type generation
pnpm build:dev               # Development build
pnpm build:dev:watch         # Development build with watch mode
```

### Running Specific Tests

To run a specific test file:

```bash
pnpm vitest test/query.spec.ts
pnpm vitest test/entity.spec.ts
```

## Architecture

### Core Structure

The library is organized around two main APIs:

1. **Query API** (`src/query/`): Functional, chainable query builder with OR conditions and functional operations
   - `query()` - Main entry point for creating queries
   - Supports OR chaining: `query().or().or()`
   - Functional operations: `.map()`, `.filter()`, `.limit()`, `.offset()`
   - Execution methods: `.one()`, `.many()`, `.first()` with OrThrow variants

2. **Entity API** (`src/entity/`): Traditional CRUD operations with consistent patterns
   - `Entity()` - Factory function for creating entity instances
   - Methods: `getGlobalItems()`, `getItem()`, `addItems()`, `updateItem()`, etc.

### Key Design Patterns

- **Functional Programming**: Built with functype for immutability and error handling
- **Type Safety**: Leverages TypeScript's type system with database schema types
- **Error Handling**: Uses `TaskOutcome<T>` for explicit error handling, avoids throwing
- **Immutability**: All data structures are immutable using functype's `List<T>`
- **Lazy Evaluation**: Queries are built lazily and executed on demand

### Type System

- `Database` - User-provided database schema interface
- `TableNames`, `TableRow<T>`, `TableInsert<T>`, `TableUpdate<T>` - Generated from schema
- Query conditions support comparison operators: `{ field: { gte: value, ilike: pattern, in: array } }`
- Supports IS NULL/NOT NULL with `is` parameter: `{ field: null | true | false }`

### Dependencies

- **Peer Dependencies**: `@supabase/supabase-js ^2.0.0`, `functype >=0.14.0`
- **functype Integration**: Re-exports commonly used types and utilities
- Uses `FPromise<TaskOutcome<T>>` for async operations with error handling

## Code Style Requirements

- **Strict TypeScript**: No `any` types allowed, explicit return types required
- **Functional Programming**: Uses functype patterns (Option, Either, List)
- **ESLint Rules**: Enforces functional programming with `eslint-plugin-functional`
- **Import Organization**: Auto-sorted imports with `simple-import-sort`
- **No Let**: Functional style enforced (except in test files)

## Testing

- **Framework**: Vitest for unit testing
- **Test Structure**: Tests in `/test/` directory with `.spec.ts` extension
- **Coverage**: Available via `pnpm test:coverage`

## Build Configuration

- **Vite**: Library build with dual output (ESM/CJS)
- **TypeScript Declaration**: Generated with `vite-plugin-dts`
- **Path Aliases**: `@/*` maps to `src/*`
- **External Dependencies**: Supabase and functype are externalized

## CI/CD Pipeline

### GitHub Actions Workflows

- **CI** (`.github/workflows/ci.yml`): Runs on push/PR to main/develop
  - Tests on Node.js 18.x, 20.x, 22.x
  - Runs full validation pipeline (`pnpm validate`)
  - Uploads build artifacts
- **Release** (`.github/workflows/release.yml`): Triggered by version tags
  - Publishes to NPM registry (public access)
  - Creates GitHub releases
  - Requires `NPM_TOKEN` secret
- **CodeQL** (`.github/workflows/codeql.yml`): Security analysis
  - Runs on main branch and PRs
  - Weekly scheduled scans

### Release Process

1. Update version in `package.json`
2. Create git tag: `git tag v1.0.0`
3. Push tag: `git push origin v1.0.0`
4. GitHub Action automatically publishes to NPM

### NPM Publishing

- **Registry**: Public NPM registry (not GitHub packages)
- **Access**: Public package, no scoped namespace
- **Versioning**: Semantic versioning (semver)

## Skills Documentation

Claude Code skills are located in `.claude/skills/supabase-typed-query/`.

### Updating Skills on API Changes

**IMPORTANT**: When making changes to the public API, you MUST update the skills documentation:

- `SKILL.md` - Main guide with API examples
- `references/quick-reference.md` - Method signatures and types
- `references/common-patterns.md` - Usage patterns

**API changes that require skill updates:**

- Adding/removing/renaming methods on `Query`, `MappedQuery`, `Entity`, or `PartitionedEntity`
- Changing method signatures or return types
- Adding/removing comparison operators
- Modifying error handling patterns
- Changes to `TaskOutcome` or `OrThrow` behavior
- New configuration options for Entity/PartitionedEntity

**Checklist for API changes:**

1. Update the relevant skill files to reflect the new API
2. Ensure code examples compile and are accurate
3. Update the quick-reference tables if method signatures changed
4. Add new patterns to common-patterns.md if applicable
