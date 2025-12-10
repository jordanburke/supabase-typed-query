# Quick Reference

## Query API

### Creating Queries

```typescript
import { query } from "supabase-typed-query"

query<TableName, Database>(client, "table", where?, is?, wherein?, order?, schema?)
```

### Query Methods

| Method               | Returns                            | Description                  |
| -------------------- | ---------------------------------- | ---------------------------- |
| `.one()`             | `FPromise<TaskOutcome<Option<T>>>` | Expects 0-1 results          |
| `.many()`            | `FPromise<TaskOutcome<List<T>>>`   | Expects 0+ results           |
| `.first()`           | `FPromise<TaskOutcome<Option<T>>>` | Gets first if multiple       |
| `.oneOrThrow()`      | `Promise<T>`                       | Throws if not found or error |
| `.manyOrThrow()`     | `Promise<List<T>>`                 | Throws on error              |
| `.firstOrThrow()`    | `Promise<T>`                       | Throws if not found or error |
| `.or(where, is?)`    | `Query<T>`                         | Add OR condition             |
| `.map(fn)`           | `MappedQuery<U>`                   | Transform results            |
| `.filter(predicate)` | `Query<T>`                         | Filter results               |
| `.limit(n)`          | `Query<T>`                         | Limit results                |
| `.offset(n)`         | `Query<T>`                         | Skip first n results         |
| `.includeDeleted()`  | `Query<T>`                         | Include soft-deleted records |
| `.excludeDeleted()`  | `Query<T>`                         | Exclude soft-deleted records |
| `.onlyDeleted()`     | `Query<T>`                         | Only soft-deleted records    |

### Comparison Operators

```typescript
{
  gte: V        // >= (greater than or equal)
  gt: V         // >  (greater than)
  lte: V        // <= (less than or equal)
  lt: V         // <  (less than)
  neq: V        // != (not equal, use NOT for null)
  like: string  // LIKE pattern (case-sensitive)
  ilike: string // ILIKE pattern (case-insensitive)
  in: V[]       // IN array
  is: null | boolean  // IS NULL / IS TRUE / IS FALSE
}
```

### NOT Operator

```typescript
{
  not: {
    is: { field: null | boolean }  // IS NOT NULL / IS NOT TRUE / IS NOT FALSE
    in: { field: V[] }             // NOT IN array
  }
}
```

### Examples

```typescript
// Direct equality
{ id: "123" }

// Comparison operators
{ created_at: { gte: startDate, lte: endDate } }

// Pattern matching
{ email: { ilike: "%@example.com" } }

// IN clause
{ status: { in: ["active", "pending"] } }

// IS NULL
{ deleted_at: { is: null } }

// IS NOT NULL (using NOT operator)
{ not: { is: { external_id: null } } }

// NOT IN
{ not: { in: { status: ["draft", "spam"] } } }
```

> **Note**: `neq: null` is deprecated. Use `not: { is: { field: null } }` for IS NOT NULL.

## RPC API

### Calling Stored Procedures

```typescript
import { rpc } from "supabase-typed-query"

rpc<FunctionName, Database>(client, "function_name", args?, options?)
```

### RPC Methods

| Method           | Returns                            | Description                   |
| ---------------- | ---------------------------------- | ----------------------------- |
| `.one()`         | `FPromise<TaskOutcome<Option<T>>>` | Expects single result or none |
| `.many()`        | `FPromise<TaskOutcome<List<T>>>`   | Expects 0+ results as list    |
| `.oneOrThrow()`  | `Promise<T>`                       | Throws if not found or error  |
| `.manyOrThrow()` | `Promise<List<T>>`                 | Throws on error               |

### RPC Options

```typescript
{
  schema?: string           // Database schema (defaults to "public")
  count?: "exact" | "planned" | "estimated"  // Row count option
}
```

### RPC Examples

```typescript
// Single result
const stats = await rpc<"get_user_stats", Database>(client, "get_user_stats", {
  user_id: "123",
}).oneOrThrow()

// Multiple results
const products = await rpc<"search_products", Database>(client, "search_products", {
  query: "laptop",
  limit: 10,
}).manyOrThrow()

// No arguments
const count = await rpc<"get_total_count", Database>(client, "get_total_count").oneOrThrow()
```

### RPC Types

```typescript
import type { FunctionNames, FunctionArgs, FunctionReturns, RpcExecution, RpcOptions } from "supabase-typed-query"

// Get all function names from schema
type Functions = FunctionNames<Database>

// Get function argument type
type Args = FunctionArgs<"get_user_stats", Database>

// Get function return type
type Returns = FunctionReturns<"get_user_stats", Database>
```

## Entity API

### Standard Entity

```typescript
import { Entity } from "supabase-typed-query"

const MyEntity = Entity<"table", Database>(client, "table", {
  softDelete: boolean,
  schema?: string, // Optional: defaults to "public"
})
```

| Method                               | Returns                      | Description                         |
| ------------------------------------ | ---------------------------- | ----------------------------------- |
| `.getItem({ id, ... })`              | `Query<T>`                   | Get single by ID                    |
| `.getItems({ ... })`                 | `Query<T>`                   | Get multiple items                  |
| `.addItems({ items })`               | `MutationMultiExecution<T>`  | Insert items                        |
| `.updateItem({ where, data })`       | `MutationSingleExecution<T>` | Update single item                  |
| `.updateItems({ where, data })`      | `MutationMultiExecution<T>`  | Update multiple items               |
| `.upsertItems({ items, identity? })` | `MutationMultiExecution<T>`  | Upsert items                        |
| `.deleteItem({ where })`             | `MutationSingleExecution<T>` | Delete single item (soft/hard)\*    |
| `.deleteItems({ where })`            | `MutationMultiExecution<T>`  | Delete multiple items (soft/hard)\* |

\* When `softDelete: true`, delete methods set the `deleted` timestamp instead of removing rows.

### PartitionedEntity

```typescript
import { PartitionedEntity } from "supabase-typed-query"

const MyEntity = PartitionedEntity<"table", KeyType, Database>(client, "table", {
  partitionField: "tenant_id",
  softDelete: boolean,
  schema?: string, // Optional: defaults to "public"
})
```

All methods take partition key as first argument:

```typescript
MyEntity.getItem(partitionKey, { id, ... })
MyEntity.getItems(partitionKey, { ... })
MyEntity.updateItem(partitionKey, { where, data })
MyEntity.deleteItem(partitionKey, { where })  // soft/hard based on config
MyEntity.deleteItems(partitionKey, { where }) // soft/hard based on config
```

### Parameter Types

```typescript
// GetItemParams
{ id: string, where?: WhereConditions, is?: IsConditions }

// GetItemsParams
{ where?: WhereConditions, is?: IsConditions, wherein?: WhereinConditions, order?: OrderParams }

// AddItemsParams
{ items: TableInsert[] }

// UpdateItemParams / UpdateItemsParams
{ where: WhereConditions, data: TableUpdate, is?: IsConditions, wherein?: WhereinConditions }

// UpsertItemsParams
{ items: TableUpdate[], identity?: string | string[] }

// DeleteItemParams / DeleteItemsParams
{ where: WhereConditions, is?: IsConditions, wherein?: WhereinConditions }

// OrderParams
[columnName, { ascending?: boolean, nullsFirst?: boolean }]
```

## Type Utilities

```typescript
import type {
  TableNames,
  TableRow,
  TableInsert,
  TableUpdate,
  DatabaseSchema,
  SchemaNames,
  TypedDatabase,
  ValidSchema,
  DEFAULT_SCHEMA,
} from "supabase-typed-query"

// Get all schema names (excludes __InternalSupabase automatically)
type Schemas = SchemaNames<Database>

// Get all table names (defaults to public schema)
type Tables = TableNames<Database>

// Get table names from a specific schema
type InventoryTables = TableNames<Database, "inventory">

// Get row type for a table (defaults to public schema)
type UserRow = TableRow<"users", Database>

// Get row type from a custom schema
type ItemRow = TableRow<"items", Database, "inventory">

// Get insert type for a table
type UserInsert = TableInsert<"users", Database>

// Get update type for a table
type UserUpdate = TableUpdate<"users", Database>

// Strip __InternalSupabase from Database type (optional - SchemaNames handles this automatically)
type CleanDB = TypedDatabase<Database>

// Type-safe schema access (returns never for invalid schemas)
type PublicSchema = ValidSchema<Database, "public">
```

## Re-exported from functype

```typescript
import { List, Option, Ok, Err, TaskOutcome, FPromise } from "supabase-typed-query"
```

## Error Handling

```typescript
import { SupabaseError, toError } from "supabase-typed-query"

// SupabaseError properties
error.code // PostgreSQL error code
error.details // Additional details
error.hint // Hint for fixing
error.message // Error message
```

## Type Guards

```typescript
import { isQuery, isMappedQuery } from "supabase-typed-query"

if (isQuery(obj)) {
  // obj is Query<T>
}

if (isMappedQuery(obj)) {
  // obj is MappedQuery<U>
}
```
