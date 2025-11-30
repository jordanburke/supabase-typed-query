# supabase-typed-query Skills

This directory contains Claude Code skills for working with the supabase-typed-query library.

## Available Skills

### supabase-typed-query

**Purpose**: Help developers use supabase-typed-query for type-safe Supabase queries

**Use when**:

- Building queries with the Query API (`query()`, OR chaining, functional operations)
- Working with Entity/PartitionedEntity patterns for CRUD operations
- Handling `TaskOutcome` errors or using `OrThrow` methods
- Implementing soft deletes and multi-tenancy
- Looking up API methods or comparison operators
- Debugging query issues

**Installation**:

```bash
# Copy directly to Claude's skills directory
cp -r .claude/skills/supabase-typed-query ~/.claude/skills/
```

## Skill Contents

```
supabase-typed-query/
├── SKILL.md                        # Main skill guide
└── references/
    ├── quick-reference.md          # API cheat sheet
    └── common-patterns.md          # Usage patterns and examples
```

**Key features**:

- Query API guide (chainable, functional queries)
- Entity API guide (CRUD operations with soft deletes)
- Type system documentation (comparison operators, database types)
- Error handling patterns (TaskOutcome, OrThrow methods)
- Multi-tenancy with PartitionedEntity
- Debugging tips and common issues

## Usage in Claude Code

Once installed, Claude Code will automatically suggest this skill when:

- Working with Supabase queries
- User asks about supabase-typed-query APIs
- Code contains `query()`, `Entity()`, or `PartitionedEntity()` calls
- Handling `TaskOutcome` or functype patterns in Supabase context

## Resources

- **GitHub**: https://github.com/jordanburke/supabase-typed-query
- **NPM**: https://www.npmjs.com/package/supabase-typed-query
