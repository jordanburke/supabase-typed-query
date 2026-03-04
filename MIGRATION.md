# Migration Guide: Mutation API Changes

## Version: 1.2.0 (Breaking)

### Summary

Mutation builders (`addItems`, `updateItem`, `updateItems`, `upsertItems`, `deleteItem`, `deleteItems`) have been simplified:

1. **Removed** `execute()` and `executeOrThrow()` — use `many()`/`manyOrThrow()` or `one()`/`oneOrThrow()` instead
2. **Added** poison `.then()` — awaiting a mutation builder without calling a terminal method now throws immediately with a descriptive error

### Why

The `execute`/`executeOrThrow` methods were redundant aliases of `many`/`one` with less descriptive names. Removing them reduces API surface and makes cardinality explicit. The poison `.then()` catches a class of silent bugs where `await Entity.addItems(...)` builds the query but never sends it to the database.

### Migration

#### Multi-result mutations (`addItems`, `updateItems`, `upsertItems`, `deleteItems`)

```typescript
// Before
Entity.addItems({ items }).executeOrThrow()
Entity.addItems({ items }).execute()

// After
Entity.addItems({ items }).manyOrThrow()
Entity.addItems({ items }).many() // lazy Task — call .run() or .runOrThrow()
```

#### Single-result mutations (`updateItem`, `deleteItem`)

```typescript
// Before
Entity.updateItem({ where, data }).executeOrThrow()
Entity.updateItem({ where, data }).execute()

// After
Entity.updateItem({ where, data }).oneOrThrow()
Entity.updateItem({ where, data }).one() // lazy Task — call .run() or .runOrThrow()
```

#### Return type change for `oneOrThrow()`

`oneOrThrow()` now returns `T` directly instead of `Option<T>`. Remove any `.orThrow()` unwrapping on the result:

```typescript
// Before
const result = await Entity.updateItem({ where, data }).executeOrThrow()
const value = result.orThrow() // unwrap Option

// After
const value = await Entity.updateItem({ where, data }).oneOrThrow()
// value is T directly — no unwrapping needed
```

#### Poison `.then()` catches silent bugs

Any code that `await`s a mutation builder without a terminal method will now throw immediately:

```typescript
// Before: silently does nothing — query built but never sent
await Entity.addItems({ items })

// After: throws "Query builder awaited without calling a terminal method..."
await Entity.addItems({ items })

// Fix: add terminal method
await Entity.addItems({ items }).manyOrThrow()
```

### Quick find-and-replace

For most codebases, this migration can be done with search-and-replace:

| Pattern                              | Replacement                       |
| ------------------------------------ | --------------------------------- |
| `.addItems(...).executeOrThrow()`    | `.addItems(...).manyOrThrow()`    |
| `.updateItems(...).executeOrThrow()` | `.updateItems(...).manyOrThrow()` |
| `.upsertItems(...).executeOrThrow()` | `.upsertItems(...).manyOrThrow()` |
| `.deleteItems(...).executeOrThrow()` | `.deleteItems(...).manyOrThrow()` |
| `.updateItem(...).executeOrThrow()`  | `.updateItem(...).oneOrThrow()`   |
| `.deleteItem(...).executeOrThrow()`  | `.deleteItem(...).oneOrThrow()`   |
| `.addItems(...).execute()`           | `.addItems(...).many()`           |
| `.updateItem(...).execute()`         | `.updateItem(...).one()`          |

Then search for `.orThrow()` on mutation results and remove where the upstream call was changed to `oneOrThrow()`.

### Available terminal methods

| Method          | Returns                  | Use when                                                         |
| --------------- | ------------------------ | ---------------------------------------------------------------- |
| `many()`        | `Task<Error, List<T>>`   | Lazy execution with functional error handling (Either)           |
| `manyOrThrow()` | `Promise<List<T>>`       | Eager execution, throws on error                                 |
| `one()`         | `Task<Error, Option<T>>` | Lazy execution for single results                                |
| `oneOrThrow()`  | `Promise<T>`             | Eager execution for single results, throws on error or no result |
