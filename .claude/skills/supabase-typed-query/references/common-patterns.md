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

### Soft Delete with deleteItem/deleteItems

```typescript
// When softDelete: true, deleteItem sets the deleted timestamp automatically
const PostEntity = Entity<"posts", Database>(client, "posts", { softDelete: true })

// Soft delete a single item (sets deleted = timestamp)
await PostEntity.deleteItem({ where: { id: postId } }).executeOrThrow()

// Soft delete multiple items
await PostEntity.deleteItems({ where: { status: "archived" } }).executeOrThrow()
```

### Hard Delete (Physical Removal)

```typescript
// When softDelete: false, deleteItem physically removes the row
const LogEntity = Entity<"logs", Database>(client, "logs", { softDelete: false })

// Permanently delete a single item
await LogEntity.deleteItem({ where: { id: logId } }).executeOrThrow()

// Permanently delete multiple items
await LogEntity.deleteItems({ where: { created_at: { lt: cutoffDate } } }).executeOrThrow()
```

### Restore Soft-Deleted Items

```typescript
// To restore, manually clear the deleted timestamp
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
// Find posts without published date (drafts) - IS NULL
const drafts = await query<"posts", Database>(client, "posts", {
  published_at: { is: null },
}).manyOrThrow()

// Find posts with published date - IS NOT NULL (using NOT operator)
const published = await query<"posts", Database>(client, "posts", {
  not: { is: { published_at: null } },
}).manyOrThrow()

// Find posts with external_id set
const linkedPosts = await query<"posts", Database>(client, "posts", {
  status: "published",
  not: { is: { external_id: null } },
}).manyOrThrow()
```

### NOT IN Queries

```typescript
// Exclude specific statuses
const visiblePosts = await query<"posts", Database>(client, "posts", {
  not: { in: { status: ["draft", "archived", "spam"] } },
}).manyOrThrow()

// Exclude multiple categories
const generalPosts = await query<"posts", Database>(client, "posts", {
  status: "published",
  not: { in: { category_id: ["internal", "test", "admin"] } },
}).manyOrThrow()
```

### Combined NOT Conditions

```typescript
// Multiple NOT conditions in one query
const filteredPosts = await query<"posts", Database>(client, "posts", {
  status: "published",
  not: {
    is: { deleted: null }, // IS NOT NULL (was soft deleted then restored)
    in: { tag: ["internal", "test"] },
  },
}).manyOrThrow()

// Entity API with NOT
const posts = await PostEntity.getItems({
  where: { author_id: userId },
  not: { is: { published_at: null } },
}).manyOrThrow()
```

> **Note**: `neq: null` is deprecated. Use `not: { is: { field: null } }` for IS NOT NULL checks.

## RPC (Stored Procedures) Patterns

### Basic RPC Call

```typescript
import { rpc } from "supabase-typed-query"

// Call a function that returns aggregate data
const stats = await rpc<"get_user_stats", Database>(client, "get_user_stats", {
  user_id: userId,
}).oneOrThrow()

// Call a function that returns multiple rows
const searchResults = await rpc<"search_products", Database>(client, "search_products", {
  query: searchTerm,
  limit: 20,
}).manyOrThrow()
```

### RPC with Safe Error Handling

```typescript
// Using TaskOutcome for explicit error handling
const result = await rpc<"calculate_totals", Database>(client, "calculate_totals", {
  order_id: orderId,
}).one()

if (result.isOk()) {
  const maybeTotal = result.orThrow()
  if (maybeTotal.isSome()) {
    console.log("Total:", maybeTotal.orElse(null))
  } else {
    console.log("No result returned")
  }
} else {
  console.error("RPC failed:", result.error)
}
```

### RPC for Bulk Operations

```typescript
// Functions that perform bulk operations
const migratedCount = await rpc<"migrate_old_records", Database>(client, "migrate_old_records", {
  before_date: cutoffDate,
  batch_size: 1000,
}).oneOrThrow()

console.log(`Migrated ${migratedCount} records`)
```

### RPC with No Arguments

```typescript
// Functions that take no arguments
const serverTime = await rpc<"get_server_time", Database>(client, "get_server_time").oneOrThrow()

const metrics = await rpc<"get_system_metrics", Database>(client, "get_system_metrics").manyOrThrow()
```

### RPC in Service Layer

```typescript
import { Either, Left, Right } from "functype"

async function getUserDashboardData(userId: string): Promise<Either<string, DashboardData>> {
  try {
    const stats = await rpc<"get_user_dashboard", Database>(client, "get_user_dashboard", {
      user_id: userId,
    }).oneOrThrow()

    return Right(stats)
  } catch (error) {
    if (error instanceof SupabaseError) {
      return Left(`Database error: ${error.message}`)
    }
    return Left("Failed to load dashboard")
  }
}
```

### Combining RPC with Queries

```typescript
// Get aggregate data via RPC, then query for details
const summary = await rpc<"get_order_summary", Database>(client, "get_order_summary", {
  customer_id: customerId,
}).oneOrThrow()

// Use summary data to query related records
const recentOrders = await query<"orders", Database>(client, "orders", {
  customer_id: customerId,
  status: { in: ["pending", "processing"] },
})
  .limit(summary.pending_count)
  .manyOrThrow()
```

## ViewEntity Patterns (Read-Only Views)

### Basic View Queries

```typescript
import { ViewEntity } from "supabase-typed-query"

// Create a view entity (views are always read-only)
const AuthUsersView = ViewEntity<"auth_users_view", Database, "agent_gate">(client, "auth_users_view", {
  schema: "agent_gate",
})

// Query the view
const user = await AuthUsersView.getItem({ id: userId }).oneOrThrow()
const activeUsers = await AuthUsersView.getItems({
  where: { is_active: true },
}).manyOrThrow()
```

### Aggregation Views

```typescript
// Views are perfect for pre-computed aggregations
const UserStatsView = ViewEntity<"user_stats_view", Database>(client, "user_stats_view")

// Get stats for a user
const stats = await UserStatsView.getItem({ id: userId }).oneOrThrow()
console.log(`Orders: ${stats.total_orders}, Spent: ${stats.total_spent}`)

// Get top spenders
const topSpenders = await UserStatsView.getItems({
  order: ["total_spent", { ascending: false }],
}).manyOrThrow()
```

### Views with Custom Schema

```typescript
// Access views in non-public schemas
const AnalyticsView = ViewEntity<"daily_metrics_view", Database, "analytics">(client, "daily_metrics_view", {
  schema: "analytics",
})

const metrics = await AnalyticsView.getItems({
  where: { date: { gte: startDate, lte: endDate } },
}).manyOrThrow()
```

### Partitioned Views (Multi-Tenant)

```typescript
import { PartitionedViewEntity } from "supabase-typed-query"

// Tenant-scoped view for analytics
const TenantAnalyticsView = PartitionedViewEntity<"tenant_metrics_view", string, Database>(
  client,
  "tenant_metrics_view",
  { partitionField: "tenant_id" },
)

// All queries automatically scoped to tenant
const metrics = await TenantAnalyticsView.getItems(tenantId, {
  where: { period: "monthly" },
  order: ["date", { ascending: false }],
}).manyOrThrow()
```

### Type-Safe View with Branded Partition Key

```typescript
import { ValidatedBrand } from "functype"

type TenantId = ValidatedBrand<string, "TenantId">

const TenantReportView = PartitionedViewEntity<"tenant_reports_view", TenantId, Database>(
  client,
  "tenant_reports_view",
  { partitionField: "tenant_id", schema: "reporting" },
)

// Type-safe tenant key required
const tenantId = "tenant-123" as TenantId
const reports = await TenantReportView.getItems(tenantId, {
  where: { status: "completed" },
}).manyOrThrow()
```

### Views vs Tables: When to Use Each

```typescript
// Use ViewEntity when:
// - Querying pre-computed aggregations
// - Accessing data across schema boundaries (e.g., auth.users)
// - Working with denormalized read-optimized views
// - Data is naturally read-only

const AuthView = ViewEntity<"auth_users_view", Database>(client, "auth_users_view")

// Use Entity when:
// - You need CRUD operations
// - Working with base tables
// - Need soft delete functionality

const UserEntity = Entity<"users", Database>(client, "users", { softDelete: true })
```
