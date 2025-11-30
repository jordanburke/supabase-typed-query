# Common Patterns

## Basic CRUD Operations

### Read Operations

```typescript
import { query, Entity } from "supabase-typed-query"
import type { Database } from "./database.types"

// Get by ID
const user = await query<"users", Database>(client, "users", { id: userId }).oneOrThrow()

// Get with conditions
const activeUsers = await query<"users", Database>(client, "users", {
  status: "active",
  role: { in: ["admin", "editor"] },
}).manyOrThrow()

// Get with ordering
const latestPosts = await query<"posts", Database>(client, "posts", {
  status: "published",
})
  .limit(10)
  .manyOrThrow()
```

### Create Operations

```typescript
const PostEntity = Entity<"posts", Database>(client, "posts", { softDelete: true })

// Single item
const [post] = await PostEntity.addItems({
  items: [{ title: "New Post", author_id: userId, status: "draft" }],
}).executeOrThrow()

// Multiple items
const posts = await PostEntity.addItems({
  items: [
    { title: "Post 1", author_id: userId, status: "draft" },
    { title: "Post 2", author_id: userId, status: "draft" },
  ],
}).executeOrThrow()
```

### Update Operations

```typescript
// Update single item by ID
const updated = await PostEntity.updateItem({
  where: { id: postId },
  data: { status: "published", published_at: new Date().toISOString() },
}).executeOrThrow()

// Update multiple items matching condition
const archived = await PostEntity.updateItems({
  where: { status: "draft", created_at: { lt: cutoffDate } },
  data: { status: "archived" },
}).executeOrThrow()
```

### Upsert Operations

```typescript
// Upsert by ID (default identity)
const upserted = await PostEntity.upsertItems({
  items: [
    { id: "existing-id", title: "Updated Title" },
    { id: "new-id", title: "New Post", author_id: userId },
  ],
}).executeOrThrow()

// Upsert with custom identity column
const result = await PostEntity.upsertItems({
  items: [{ external_id: "ext-123", title: "Synced Post" }],
  identity: "external_id",
}).executeOrThrow()
```

## OR Query Patterns

### Multiple Values for Same Field

```typescript
// Find posts by multiple authors
const posts = await query<"posts", Database>(client, "posts", { author_id: author1 })
  .or({ author_id: author2 })
  .or({ author_id: author3 })
  .manyOrThrow()
```

### Different Conditions

```typescript
// Find admins OR verified users
const users = await query<"users", Database>(client, "users", { role: "admin" }).or({ is_verified: true }).manyOrThrow()
```

### Combined AND/OR Logic

```typescript
// (role = 'admin') OR (role = 'editor' AND department = 'content')
const users = await query<"users", Database>(client, "users", { role: "admin" })
  .or({ role: "editor", department: "content" })
  .manyOrThrow()
```

## Functional Transformations

### Map for Data Extraction

```typescript
// Extract specific fields
const emails = await query<"users", Database>(client, "users", { status: "active" })
  .map((user) => user.email)
  .manyOrThrow()

// Transform to DTOs
interface UserDTO {
  id: string
  displayName: string
}

const dtos = await query<"users", Database>(client, "users", {})
  .map(
    (user): UserDTO => ({
      id: user.id,
      displayName: `${user.first_name} ${user.last_name}`,
    }),
  )
  .manyOrThrow()
```

### Filter for Client-Side Refinement

```typescript
// Additional filtering after database query
const premiumAdults = await query<"users", Database>(client, "users", { status: "active" })
  .filter((user) => user.age >= 18)
  .filter((user) => user.subscription_tier === "premium")
  .manyOrThrow()
```

### Chained Transformations

```typescript
// Filter then map
const adultEmails = await query<"users", Database>(client, "users", { status: "active" })
  .filter((user) => user.age >= 18)
  .map((user) => user.email)
  .manyOrThrow()
```

## Multi-Tenancy Patterns

### Basic Tenant Isolation

```typescript
import { PartitionedEntity } from "supabase-typed-query"

const TenantPostEntity = PartitionedEntity<"posts", string, Database>(client, "posts", {
  partitionField: "tenant_id",
  softDelete: true,
})

// All operations automatically scoped to tenant
const tenantPosts = await TenantPostEntity.getItems(tenantId, {
  where: { status: "published" },
}).manyOrThrow()
```

### Type-Safe Tenant Keys

```typescript
import { ValidatedBrand } from "functype"

// Define branded tenant ID type
type TenantId = ValidatedBrand<string, "TenantId">

const TenantPostEntity = PartitionedEntity<"posts", TenantId, Database>(client, "posts", {
  partitionField: "tenant_id",
  softDelete: true,
})

// Type-safe tenant key required
const tenantId = "tenant-123" as TenantId
const posts = await TenantPostEntity.getItems(tenantId, {}).manyOrThrow()
```

## Soft Delete Patterns

### Default Behavior (Exclude Deleted)

```typescript
const PostEntity = Entity<"posts", Database>(client, "posts", { softDelete: true })

// Only returns non-deleted items by default
const activePosts = await PostEntity.getItems({}).manyOrThrow()
```

### Include All Records

```typescript
// For admin views or auditing
const allPosts = await PostEntity.getItems({}).includeDeleted().manyOrThrow()
```

### View Only Deleted

```typescript
// For trash/recovery views
const deletedPosts = await PostEntity.getItems({}).onlyDeleted().manyOrThrow()
```

### Soft Delete Implementation

```typescript
// "Delete" by setting deleted timestamp
await PostEntity.updateItem({
  where: { id: postId },
  data: { deleted: new Date().toISOString() },
}).executeOrThrow()

// "Restore" by clearing deleted timestamp
await PostEntity.updateItem({
  where: { id: postId },
  data: { deleted: null },
}).executeOrThrow()
```

## Error Handling Patterns

### Explicit TaskOutcome Handling

```typescript
import { Option } from "functype"

async function safeGetUser(userId: string): Promise<Option<User>> {
  const result = await query<"users", Database>(client, "users", { id: userId }).one()

  if (result.isOk()) {
    return result.getOrThrow() // Returns Option<User>
  }

  // Log error, return None
  console.error("Failed to fetch user:", result.error)
  return Option.none()
}
```

### Error Recovery

```typescript
async function getUserOrDefault(userId: string): Promise<User> {
  try {
    return await query<"users", Database>(client, "users", { id: userId }).oneOrThrow()
  } catch (error) {
    if (error instanceof SupabaseError && error.code === "PGRST116") {
      // Not found - return default
      return { id: userId, name: "Unknown", email: "" }
    }
    throw error
  }
}
```

### Validation Before Insert

```typescript
import { Either, Left, Right } from "functype"

async function createUser(data: UserInput): Promise<Either<string, User>> {
  // Validate
  if (!data.email.includes("@")) {
    return Left("Invalid email format")
  }

  try {
    const [user] = await UserEntity.addItems({
      items: [data],
    }).executeOrThrow()
    return Right(user)
  } catch (error) {
    if (error instanceof SupabaseError && error.code === "23505") {
      return Left("Email already exists")
    }
    return Left("Failed to create user")
  }
}
```

## Pagination Patterns

### Offset-Based Pagination

```typescript
async function getPage(page: number, pageSize: number = 20) {
  const offset = (page - 1) * pageSize

  return await query<"posts", Database>(client, "posts", { status: "published" })
    .limit(pageSize)
    .offset(offset)
    .manyOrThrow()
}
```

### Cursor-Based Pagination

```typescript
async function getPostsAfter(cursor: string | null, limit: number = 20) {
  const baseQuery = query<"posts", Database>(
    client,
    "posts",
    cursor ? { id: { gt: cursor }, status: "published" } : { status: "published" },
  )

  return await baseQuery.limit(limit).manyOrThrow()
}
```

## Complex Query Examples

### Date Range with Multiple Conditions

```typescript
const thisWeeksPosts = await query<"posts", Database>(client, "posts", {
  created_at: { gte: startOfWeek, lte: endOfWeek },
  status: { in: ["published", "featured"] },
  view_count: { gte: 100 },
}).manyOrThrow()
```

### Search with Pattern Matching

```typescript
const searchResults = await query<"posts", Database>(client, "posts", {
  title: { ilike: `%${searchTerm}%` },
})
  .or({ content: { ilike: `%${searchTerm}%` } })
  .limit(50)
  .manyOrThrow()
```

### Null Checks

```typescript
// Find posts without published date (drafts)
const drafts = await query<"posts", Database>(client, "posts", {
  published_at: { is: null },
}).manyOrThrow()

// Find posts with published date
const published = await query<"posts", Database>(client, "posts", {
  published_at: { is: false }, // IS NOT NULL
}).manyOrThrow()
```
