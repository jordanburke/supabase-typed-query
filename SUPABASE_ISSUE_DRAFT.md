# GitHub Issue Draft for supabase/supabase-js

**Title:** `__InternalSupabase` type breaks generic database constraints for third-party libraries

---

## Bug report

### Describe the bug

The generated `Database` types include an `__InternalSupabase` property that doesn't conform to the schema structure:

```typescript
// Generated database.types.ts
export type Database = {
  public: {
    Tables: { ... }
    Views: { ... }
    // etc.
  }
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
}
```

The `__InternalSupabase` object has `PostgrestVersion` but no `Tables`, `Views`, etc. This breaks generic constraints for libraries that want to accept any valid `Database` type.

### To Reproduce

```typescript
// Library code trying to accept any Supabase Database type
interface SchemaDefinition {
  Tables: Record<string, { Row: object; Insert: object; Update: object }>
  Views?: Record<string, { Row: object }>
  // etc.
}

interface DatabaseSchema {
  public: SchemaDefinition
  [schemaName: string]: SchemaDefinition  // Index signature
}

// This fails because __InternalSupabase doesn't have Tables
function query<DB extends DatabaseSchema>(client: SupabaseClient<DB>) { ... }
```

**Error:**

```
Type 'Database' does not satisfy the constraint 'DatabaseSchema'.
Property '__InternalSupabase' is incompatible with index signature.
Property 'Tables' is missing in type '{ PostgrestVersion: "12.2.3 (519615d)"; }'
```

### Expected behavior

Third-party libraries should be able to define generic constraints on database types without workarounds.

### Current workaround

We use `Omit<Database, '__InternalSupabase'>` everywhere (same pattern as in `SupabaseClient` source), but this:

1. Requires every library to know about this internal implementation detail
2. Forces use of `any` in index signatures, losing type safety for custom schemas
3. Adds complexity for library consumers

### Suggested solutions

**Option 1: Separate internal metadata type**

```typescript
export type Database = {
  public: { Tables: {...} }
  // Custom schemas work with index signature
}

// Separate from Database type
export type DatabaseMeta = {
  __PostgrestVersion: string
}
```

**Option 2: Symbol key instead of string key**

```typescript
declare const __internal: unique symbol

export type Database = {
  public: { Tables: {...} }
  [__internal]?: { PostgrestVersion: string }  // Symbol keys don't affect string index signatures
}
```

**Option 3: Branded/tagged type**

```typescript
export type Database = {
  public: { Tables: {...} }
} & { __brand?: { PostgrestVersion: string } }  // Intersection doesn't pollute index signature
```

### System information

- supabase-js version: 2.x
- TypeScript version: 5.x

### Additional context

This affects any library building type-safe abstractions on top of Supabase, including:

- Query builders
- ORM-like patterns
- Entity frameworks

The Supabase client itself works around this with `Omit<Database, '__InternalSupabase'>` throughout `SupabaseClient.ts`, suggesting this is a known issue internally.

---

## To submit this issue

1. Go to: https://github.com/supabase/supabase-js/issues/new
2. Copy the content above (everything between the `---` lines)
3. Review and adjust as needed
4. Submit
