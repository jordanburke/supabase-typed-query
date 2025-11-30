# Quick Reference

## Query API

### Creating Queries

```typescript
import { query } from "supabase-typed-query"

query<TableName, Database>(client, "table", where?, is?, wherein?, order?)
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
  neq: V        // != (not equal)
  like: string  // LIKE pattern (case-sensitive)
  ilike: string // ILIKE pattern (case-insensitive)
  in: V[]       // IN array
  is: null | boolean  // IS NULL / IS TRUE / IS FALSE
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
```

## Entity API

### Standard Entity

```typescript
import { Entity } from "supabase-typed-query"

const MyEntity = Entity<"table", Database>(client, "table", { softDelete: boolean })
```

| Method                               | Returns                      | Description           |
| ------------------------------------ | ---------------------------- | --------------------- |
| `.getItem({ id, ... })`              | `Query<T>`                   | Get single by ID      |
| `.getItems({ ... })`                 | `Query<T>`                   | Get multiple items    |
| `.addItems({ items })`               | `MutationMultiExecution<T>`  | Insert items          |
| `.updateItem({ where, data })`       | `MutationSingleExecution<T>` | Update single item    |
| `.updateItems({ where, data })`      | `MutationMultiExecution<T>`  | Update multiple items |
| `.upsertItems({ items, identity? })` | `MutationMultiExecution<T>`  | Upsert items          |

### PartitionedEntity

```typescript
import { PartitionedEntity } from "supabase-typed-query"

const MyEntity = PartitionedEntity<"table", KeyType, Database>(client, "table", {
  partitionField: "tenant_id",
  softDelete: boolean,
})
```

All methods take partition key as first argument:

```typescript
MyEntity.getItem(partitionKey, { id, ... })
MyEntity.getItems(partitionKey, { ... })
MyEntity.updateItem(partitionKey, { where, data })
// etc.
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

// OrderParams
[columnName, { ascending?: boolean, nullsFirst?: boolean }]
```

## Type Utilities

```typescript
import type { TableNames, TableRow, TableInsert, TableUpdate, DatabaseSchema } from "supabase-typed-query"

// Get all table names
type Tables = TableNames<Database>

// Get row type for a table
type UserRow = TableRow<"users", Database>

// Get insert type for a table
type UserInsert = TableInsert<"users", Database>

// Get update type for a table
type UserUpdate = TableUpdate<"users", Database>
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
