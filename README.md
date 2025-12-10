# supabase-typed-query

Type-safe query builder and entity pattern for Supabase with TypeScript.

## Features

- 🔒 **Full TypeScript type safety** - Leverage your database types for compile-time safety
- 🔗 **Chainable query API** - Build complex queries with OR conditions and functional operations
- 🎯 **Entity pattern** - Consistent CRUD operations across all tables
- 🚀 **Functional programming** - Built with functype for robust error handling
- ⚡ **Zero runtime overhead** - All type checking happens at compile time
- 🔄 **Composable queries** - Mix and match conditions, filters, and transformations
- 🗑️ **Soft delete support** - Built-in soft delete filtering with per-query overrides
- 🏢 **Multi-tenancy ready** - Automatic partition key filtering for tenant isolation
- 🗄️ **Custom schema support** - Query tables in any PostgreSQL schema, not just public

## Installation

```bash
npm install supabase-typed-query functype
# or
pnpm add supabase-typed-query functype
# or
yarn add supabase-typed-query functype
```

### Compatibility

| Dependency              | Version    | Notes                               |
| ----------------------- | ---------- | ----------------------------------- |
| `@supabase/supabase-js` | `^2.0.0`   | Tested with 2.86.x                  |
| `functype`              | `>=0.20.1` | Required for error handling         |
| TypeScript              | `>=5.0`    | Recommended for best type inference |
| Node.js                 | `>=18`     | Required                            |

## Quick Start

### 1. Set up your database types

First, generate your database types from Supabase:

```bash
npx supabase gen types typescript --project-id your-project-id > database.types.ts
```

### 2. Create a typed client

```typescript
import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

const supabase = createClient<Database>("your-supabase-url", "your-anon-key")
```

### 3. Use the Query Builder

```typescript
import { query } from "supabase-typed-query"

// Simple query
const user = await query(supabase, "users", { id: "123" }).one()

// Query with OR conditions
const posts = await query(supabase, "posts", { status: "published" }).or({ status: "draft", author_id: userId }).many()

// Query with functional operations
const titles = await query(supabase, "posts", { status: "published" })
  .map((post) => post.title)
  .filter((title) => title.length > 10)
  .many()
```

### 4. Use the Entity Pattern

```typescript
import { Entity } from "supabase-typed-query"

// Create an entity for your table with configuration
const PostEntity = Entity(supabase, "posts", {
  softDelete: true, // Automatically exclude soft-deleted items
})

// Get all posts
const posts = await PostEntity.getItems({
  where: { status: "published" },
  order: ["created_at", { ascending: false }],
}).many()

// Get a single post
const post = await PostEntity.getItem({
  id: "post-123",
  where: { status: "published" },
}).one()

// Add posts
const newPosts = await PostEntity.addItems({
  items: [{ title: "New Post", content: "Content here", status: "draft" }],
}).execute()

// Update a post
const updated = await PostEntity.updateItem({
  id: "post-123",
  item: { status: "published" },
}).execute()
```

## Advanced Usage

### Comparison Operators

```typescript
// Greater than / Less than
const recentPosts = await query(supabase, "posts", {
  created_at: { gte: new Date("2024-01-01") },
}).many()

// Pattern matching
const searchResults = await query(supabase, "posts", {
  title: { ilike: "%typescript%" },
}).many()

// IN queries
const selectedPosts = await query(supabase, "posts", {
  id: { in: ["id1", "id2", "id3"] },
}).many()

// IS NULL checks
const drafts = await query(supabase, "posts", {
  published_at: { is: null },
}).many()

// IS NOT NULL checks (using NOT operator)
const publishedPosts = await query(supabase, "posts", {
  not: { is: { published_at: null } },
}).many()

// NOT IN queries
const activePosts = await query(supabase, "posts", {
  not: { in: { status: ["draft", "archived"] } },
}).many()
```

### NOT Operator

The `not` operator follows Supabase conventions for negating conditions:

```typescript
// IS NOT NULL - find posts with external_id set
const linkedPosts = await PostEntity.getItems({
  not: { is: { external_id: null } },
}).many()

// IS NOT TRUE / IS NOT FALSE
const nonFeatured = await PostEntity.getItems({
  not: { is: { featured: true } },
}).many()

// NOT IN - exclude specific statuses
const visiblePosts = await PostEntity.getItems({
  not: { in: { status: ["spam", "trash", "deleted"] } },
}).many()

// Combine NOT with other conditions
const activeLinkedPosts = await PostEntity.getItems({
  where: { status: "published" },
  not: { is: { external_id: null } },
}).many()
```

> **Note**: `neq: null` is deprecated. Use `not: { is: { field: null } }` instead for IS NOT NULL checks.

### Chaining OR Conditions

```typescript
const results = await query(supabase, "users", { role: "admin" })
  .or({ role: "moderator" })
  .or({ role: "editor", active: true })
  .many()
```

### Soft Deletes

Control soft delete behavior at the Entity or Query level:

```typescript
// Entity with soft deletes enabled (excludes deleted by default)
const UserEntity = Entity(supabase, "users", {
  softDelete: true, // Automatically filters out deleted items
})

// Override soft delete behavior per query
const allUsers = await UserEntity.getItems().includeDeleted().many()
const deletedOnly = await UserEntity.getItems().onlyDeleted().many()
const activeOnly = await UserEntity.getItems().excludeDeleted().many() // Redundant - already excluded

// Entity without soft deletes (includes all items)
const AdminEntity = Entity(supabase, "users", {
  softDelete: false, // No automatic filtering
})
```

### Custom Schema Support

Query tables in any PostgreSQL schema (not just the default `public` schema):

```typescript
import { Entity, PartitionedEntity, query } from "supabase-typed-query"

// Entity with custom schema
const InventoryEntity = Entity(supabase, "items", {
  softDelete: false,
  schema: "inventory", // Uses client.schema("inventory").from("items")
})

const items = await InventoryEntity.getItems({ where: { active: true } }).many()

// PartitionedEntity with custom schema
const TenantItemsEntity = PartitionedEntity(supabase, "items", {
  partitionField: "tenant_id",
  softDelete: true,
  schema: "tenant_data",
})

// Query API with custom schema (7th parameter)
const results = await query(
  supabase,
  "items",
  { active: true },
  undefined, // is conditions
  undefined, // wherein conditions
  undefined, // order
  "inventory", // schema
).many()
```

When no schema is specified, queries use the default `public` schema via `client.from()`. When a schema is specified, queries use `client.schema(name).from(table)`.

### Multi-Tenancy with Partition Keys

Use partition keys to automatically scope queries to a tenant or partition:

```typescript
// Create a tenant-scoped entity
const TenantPostEntity = Entity(supabase, "posts", {
  softDelete: true,
  partitionKey: { tenant_id: "tenant-123" }, // All queries automatically include this filter
})

// All queries are automatically scoped to the tenant
const tenantPosts = await TenantPostEntity.getItems({
  where: { status: "published" },
}).many()
// Equivalent to: WHERE tenant_id = 'tenant-123' AND status = 'published' AND deleted IS NULL

// Create a global/admin entity (no partition)
const GlobalPostEntity = Entity(supabase, "posts", {
  softDelete: true,
  // No partitionKey - queries all tenants
})

const allPosts = await GlobalPostEntity.getItems().many()
// Equivalent to: WHERE deleted IS NULL
```

### Error Handling

The library uses functype's `TaskOutcome` for error handling:

```typescript
// Using TaskOutcome (recommended for explicit error handling)
const result = await query(supabase, "users", { id: userId }).one()

if (result.isOk()) {
  const maybeUser = result.getOrThrow()
  if (maybeUser.isSome()) {
    console.log("User found:", maybeUser.getOrThrow())
  }
} else {
  console.error("Query failed:", result.error)
}

// Using OrThrow methods (simpler but throws errors)
try {
  const user = await query(supabase, "users", { id: userId }).oneOrThrow()
  console.log("User:", user)
} catch (error) {
  console.error("Query failed:", error)
}
```

### Type Safety

All operations are fully type-safe based on your database schema:

```typescript
// TypeScript will enforce correct field names and types
const posts = await query(supabase, "posts", {
  // ✅ TypeScript knows these fields exist and their types
  title: "My Post",
  published: true,
  view_count: { gte: 100 },

  // ❌ TypeScript error: property doesn't exist
  nonexistent_field: "value",
}).many()
```

## API Reference

### Query Methods

- `one()` - Execute query expecting exactly one result
- `many()` - Execute query expecting zero or more results
- `first()` - Execute query expecting first result from potentially multiple
- `oneOrThrow()` - Like `one()` but throws if not found
- `manyOrThrow()` - Like `many()` but throws on error
- `firstOrThrow()` - Like `first()` but throws if not found

### Query Composition

- `or(conditions)` - Add OR conditions to the query
- `map(fn)` - Transform results with a mapping function
- `filter(fn)` - Filter results with a predicate
- `limit(n)` - Limit the number of results
- `offset(n)` - Skip the first n results
- `includeDeleted()` - Include soft-deleted items in results
- `excludeDeleted()` - Exclude soft-deleted items from results
- `onlyDeleted()` - Return only soft-deleted items

### Entity Methods

- `getItem({ id, where?, is? })` - Get a single item by ID
- `getItems({ where?, is?, wherein?, order? })` - Get filtered items
- `addItems({ items })` - Add multiple items
- `updateItem({ id, item, where?, is?, wherein? })` - Update a single item
- `updateItems({ items, identity?, where?, is?, wherein? })` - Update multiple items

### Entity Configuration

- `softDelete: boolean` - (Required) When `true`, automatically excludes soft-deleted items; when `false`, includes them
- `schema?: string` - (Optional) PostgreSQL schema to query from (defaults to `"public"`)

### PartitionedEntity Configuration

- `partitionField: string` - (Required) Column name used for partition filtering (e.g., `"tenant_id"`)
- `softDelete: boolean` - (Required) When `true`, automatically excludes soft-deleted items
- `schema?: string` - (Optional) PostgreSQL schema to query from (defaults to `"public"`)

## Requirements

- TypeScript 5.0+
- Supabase JS Client v2
- functype 0.14+

## License

MIT

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/jordanburke/supabase-typed-query.git
cd supabase-typed-query

# Install dependencies
pnpm install

# Run validation pipeline
pnpm validate
```

### Commands

```bash
# Development
pnpm validate          # Run full validation: format, lint, typecheck, test, build
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage
pnpm build            # Build for production
pnpm build:dev:watch  # Build in watch mode for development

# Code Quality
pnpm format           # Format code with Prettier
pnpm lint             # Fix ESLint issues
pnpm typecheck        # Type check with TypeScript
```

### CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment:

#### Continuous Integration

- **Triggered on**: Push/PR to main/develop branches
- **Test matrix**: Node.js 18.x, 20.x, 22.x
- **Pipeline**: Format → Lint → Type Check → Test → Build

#### Release Process

1. Update version in `package.json`
2. Create and push a version tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. GitHub Actions automatically:
   - Runs full validation pipeline
   - Publishes to NPM registry
   - Creates GitHub release

#### Security

- CodeQL analysis runs on all PRs and weekly scheduled scans
- Dependency updates via Dependabot

### Publishing

The package is automatically published to NPM when a version tag is pushed. Manual publishing:

```bash
# Ensure you're logged into NPM
npm login

# Run validation and publish
pnpm build:publish
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

1. **Type Safety**: Maintain strict TypeScript types, no `any`
2. **Functional Style**: Use functional programming patterns with functype
3. **Testing**: Add tests for new features
4. **Documentation**: Update README for API changes
5. **Commits**: Follow conventional commits format

### Pull Request Process

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run `pnpm validate` to ensure all checks pass
4. Commit your changes (`git commit -m 'feat: add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

Tests will automatically run via GitHub Actions on your PR.
