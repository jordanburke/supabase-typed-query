---
name: supabase-typed-query
description: Help developers use supabase-typed-query for type-safe Supabase queries. Use this skill when building queries with the Query API, working with Entity/PartitionedEntity patterns, handling TaskOutcome errors, or implementing soft deletes and multi-tenancy.
---

# supabase-typed-query User Guide

## Overview

supabase-typed-query is a type-safe query builder and entity pattern library for Supabase. It provides:

- Fully typed queries leveraging your database schema
- Two complementary APIs: Query API (functional, chainable) and Entity API (CRUD patterns)
- Built on functype for robust error handling with `TaskOutcome`
- Support for soft deletes, multi-tenancy, and complex queries with OR conditions

## When to Use This Skill

Trigger this skill when users:

- Build queries using `query()` function
- Work with `Entity()` or `PartitionedEntity()` patterns
- Handle `TaskOutcome` or use `OrThrow` methods
- Implement soft deletes or multi-tenancy
- Look up comparison operators or API methods
- Debug query issues

## Quick Start

### Installation

```bash
npm install supabase-typed-query
# or
pnpm add supabase-typed-query
```

### Generate Database Types

```bash
npx supabase gen types typescript --project-id your-project-id > database.types.ts
```

### Core Imports

```typescript
import { query, Entity, PartitionedEntity } from "supabase-typed-query"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

const client = createClient<Database>(url, key)
```

## Query API

The Query API provides chainable, functional queries with OR support.

### Basic Query

```typescript
import { query } from "supabase-typed-query"

// Simple query with type-safe conditions
const user = await query<"users", Database>(client, "users", { id: "123" }).oneOrThrow()

// Query with comparison operators
const recentPosts = await query<"posts", Database>(client, "posts", {
  created_at: { gte: new Date("2024-01-01") },
}).manyOrThrow()
```

### OR Chaining

```typescript
// Multiple OR conditions
const results = await query<"users", Database>(client, "users", { role: "admin" })
  .or({ role: "moderator" })
  .or({ role: "editor", active: true })
  .manyOrThrow()
// SQL: WHERE role = 'admin' OR role = 'moderator' OR (role = 'editor' AND active = true)
```

### Functional Operations

```typescript
// Map: transform each result
const titles = await query<"posts", Database>(client, "posts", { status: "published" })
  .map((post) => post.title)
  .manyOrThrow()

// Filter: client-side filtering after fetch
const activeUsers = await query<"users", Database>(client, "users", {})
  .filter((user) => user.active === true && user.age > 18)
  .manyOrThrow()

// Chain map + filter
const adultNames = await query<"users", Database>(client, "users", {})
  .filter((user) => user.age >= 18)
  .map((user) => user.name)
  .manyOrThrow()
```

### Execution Methods

| Method            | Returns                  | Description                  |
| ----------------- | ------------------------ | ---------------------------- |
| `.one()`          | `TaskOutcome<Option<T>>` | Expects 0-1 results          |
| `.many()`         | `TaskOutcome<List<T>>`   | Expects 0+ results           |
| `.first()`        | `TaskOutcome<Option<T>>` | Gets first if multiple       |
| `.oneOrThrow()`   | `Promise<T>`             | Throws if not found or error |
| `.manyOrThrow()`  | `Promise<List<T>>`       | Throws on error              |
| `.firstOrThrow()` | `Promise<T>`             | Throws if not found or error |

### Comparison Operators

```typescript
type ComparisonOperators<V> = {
  gte?: V // Greater than or equal
  gt?: V // Greater than
  lte?: V // Less than or equal
  lt?: V // Less than
  neq?: V // Not equal
  like?: string // LIKE pattern
  ilike?: string // Case-insensitive LIKE
  in?: V[] // IN array
  is?: null | boolean // IS NULL/TRUE/FALSE
}

// Examples
const results = await query<"posts", Database>(client, "posts", {
  view_count: { gte: 100, lte: 1000 },
  title: { ilike: "%guide%" },
  tags: { in: ["typescript", "supabase"] },
  published_at: { is: null }, // Find unpublished
}).manyOrThrow()
```

## Entity API

The Entity API provides consistent CRUD patterns.

### Standard Entity

```typescript
import { Entity } from "supabase-typed-query"

const PostEntity = Entity<"posts", Database>(client, "posts", { softDelete: true })

// Get single item
const post = await PostEntity.getItem({ id: "123" }).oneOrThrow()

// Get multiple items
const posts = await PostEntity.getItems({
  where: { status: "published" },
  order: ["created_at", { ascending: false }],
}).manyOrThrow()

// Add items
const created = await PostEntity.addItems({
  items: [{ title: "New Post", status: "draft" }],
}).executeOrThrow()

// Update single item
const updated = await PostEntity.updateItem({
  where: { id: "123" },
  data: { status: "published" },
}).executeOrThrow()

// Update multiple items
const bulkUpdated = await PostEntity.updateItems({
  where: { status: "draft" },
  data: { status: "archived" },
}).executeOrThrow()

// Upsert items
const upserted = await PostEntity.upsertItems({
  items: [{ id: "123", title: "Updated Title" }],
  identity: "id",
}).executeOrThrow()
```

### PartitionedEntity (Multi-Tenancy)

```typescript
import { PartitionedEntity } from "supabase-typed-query"

const TenantPostEntity = PartitionedEntity<"posts", string, Database>(client, "posts", {
  partitionField: "tenant_id",
  softDelete: true,
})

// All queries automatically include partition filter
const tenantPosts = await TenantPostEntity.getItems(tenantId, {
  where: { status: "published" },
}).manyOrThrow()
// SQL: WHERE tenant_id = 'tenantId' AND status = 'published' AND deleted IS NULL
```

## Error Handling

### TaskOutcome Pattern (Explicit)

```typescript
import { Ok, Err } from "functype"

const result = await query<"users", Database>(client, "users", { id: userId }).one()

if (result.isOk()) {
  const maybeUser = result.getOrThrow() // Option<User>
  if (maybeUser.isSome()) {
    const user = maybeUser.getOrThrow()
    console.log(user)
  }
} else {
  console.error("Query failed:", result.error)
}
```

### OrThrow Methods (Simple)

```typescript
try {
  const user = await query<"users", Database>(client, "users", { id: userId }).oneOrThrow()
  console.log("User:", user)
} catch (error) {
  if (error instanceof SupabaseError) {
    console.log(error.code) // PostgreSQL error code
    console.log(error.details) // Additional details
    console.log(error.hint) // Hint for fixing
  }
}
```

## Soft Delete

### Configuration

```typescript
// Entity with soft deletes (filters by default)
const UserEntity = Entity<"users", Database>(client, "users", { softDelete: true })
// Queries automatically: WHERE deleted IS NULL

// Entity without soft deletes
const AllUsersEntity = Entity<"users", Database>(client, "users", { softDelete: false })
```

### Per-Query Override

```typescript
// Override for specific queries
const allUsers = await UserEntity.getItems().includeDeleted().many()
const deletedOnly = await UserEntity.getItems().onlyDeleted().many()
const activeOnly = await UserEntity.getItems().excludeDeleted().many()

// Works with query() too
const all = await query<"users", Database>(client, "users", {}).includeDeleted().many()
```

## Common Patterns

### Safe Data Fetching

```typescript
import { Option } from "functype"

async function getUserEmail(userId: string): Promise<Option<string>> {
  const result = await query<"users", Database>(client, "users", { id: userId }).one()
  return result.map((maybeUser) => maybeUser.flatMap((user) => Option(user.email))).orElse(Option.none())
}
```

### Batch Operations

```typescript
// Add multiple items
const posts = await PostEntity.addItems({
  items: [
    { title: "Post 1", status: "draft" },
    { title: "Post 2", status: "draft" },
  ],
}).executeOrThrow()

// Update all matching items
const archived = await PostEntity.updateItems({
  where: { status: "draft" },
  data: { status: "archived" },
}).executeOrThrow()
```

### Complex Queries

```typescript
// Combining operators
const results = await query<"posts", Database>(client, "posts", {
  created_at: { gte: startDate, lte: endDate },
  status: { in: ["published", "featured"] },
  view_count: { gt: 100 },
})
  .or({ is_pinned: true })
  .limit(20)
  .manyOrThrow()
```

## Debugging Tips

### Common Issues

**"Type 'X' is not assignable to type 'Y'"**

- Ensure you're passing the Database type as a generic: `query<"users", Database>(...)`
- Check that your database types are up-to-date with `npx supabase gen types`

**"Property 'X' does not exist"**

- Verify table name matches your database schema
- Regenerate types if you've added new columns

**Empty results when expecting data**

- Check soft delete configuration: `{ softDelete: true }` filters out deleted records
- Use `.includeDeleted()` to see all records

**OrThrow throwing unexpectedly**

- Use explicit `TaskOutcome` methods (`.one()`, `.many()`) for debugging
- Check `result.isOk()` and inspect `result.error` for details

## Resources

### references/

- `quick-reference.md` - API cheat sheet
- `common-patterns.md` - Usage patterns and recipes

### External Links

- **GitHub**: https://github.com/jordanburke/supabase-typed-query
- **NPM**: https://www.npmjs.com/package/supabase-typed-query
- **functype**: https://github.com/jordanburke/functype
