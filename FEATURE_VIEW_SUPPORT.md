# Feature: Support for Database Views in Entity Pattern

## Summary

Add support for querying Supabase Views using the Entity pattern, similar to how Tables are currently supported.

## Background

Supabase generates TypeScript types for both Tables and Views:

```typescript
export type Database = {
  agent_gate: {
    Tables: {
      users: { Row: {...}, Insert: {...}, Update: {...} }
    }
    Views: {
      auth_users_view: { Row: {...} }  // Views only have Row type
    }
  }
}
```

Currently, the `Entity` function only works with Tables. When needing to query a View, users must fall back to raw Supabase client calls or raw SQL.

## Use Case

In `agent-todo`, we have an `auth_users_view` that exposes `auth.users` data (which is otherwise inaccessible via PostgREST). Currently we query it with raw D1 SQL:

```typescript
// Current workaround - raw SQL
const user = await this.env.DB.prepare("SELECT email_confirmed_at FROM agent_gate.auth_users_view WHERE email = ?")
  .bind(email)
  .first()
```

We'd prefer to use the Entity pattern for consistency:

```typescript
// Desired - Entity pattern for Views
const authUsersView = ViewEntity<"auth_users_view", Database, "agent_gate">(supabase, "auth_users_view")
const result = await authUsersView.getItems({ where: { email } }).first()
```

## Proposed API

### Option 1: Separate `ViewEntity` function

```typescript
import { ViewEntity } from "supabase-typed-query"

// Views are read-only, so no Insert/Update/Delete operations
const view = ViewEntity<"auth_users_view", Database, "agent_gate">(supabase, "auth_users_view")

// Only read operations available
const result = await view.getItems({ where: { email: "user@example.com" } }).first()
const items = await view.getItems({ order: ["created_at", { ascending: false }] }).many()
```

### Option 2: Extend existing `Entity` to detect Views

```typescript
import { Entity } from "supabase-typed-query"

// Entity auto-detects if it's a View and restricts to read-only operations
const view = Entity<"auth_users_view", Database, "agent_gate">(supabase, "auth_users_view", {
  readonly: true, // Or auto-detect from type
})
```

## Type Constraints

Views in Supabase only have a `Row` type (no `Insert` or `Update`), so the Entity for Views should:

1. Only expose read operations: `getItems()`, `first()`, `many()`, `count()`
2. NOT expose write operations: `addItems()`, `updateItem()`, `deleteItem()`
3. Type-check at compile time to prevent write attempts

## Implementation Notes

- Views path in Database types: `Database[Schema]["Views"][ViewName]`
- Views only have `Row` type, no `Insert`/`Update`/`Relationships`
- The `softDelete` option should not apply to Views
- Consider a `ViewEntity` type that only has read methods in the return interface

## Priority

Medium - Currently working around with raw SQL, but would improve codebase consistency.

## Related

- Current Entity implementation for Tables
- Supabase type generation includes Views automatically
