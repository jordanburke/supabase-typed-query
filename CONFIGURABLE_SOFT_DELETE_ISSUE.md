# GitHub Issue: Configurable soft delete field name

**Title:** Allow configuring the soft delete field name (default: `deleted`)

---

## Feature request

### Is your feature request related to a problem?

Currently, the soft delete field is hardcoded to `deleted`:

```typescript
// In softDeleteEntity/softDeleteEntities
.update({ deleted: new Date().toISOString() })

// In query filtering
.is("deleted", null)  // excludeDeleted
.not.is("deleted", null)  // onlyDeleted
```

Users with existing schemas using `deleted_at` or other field names cannot use the soft delete feature without renaming their column.

### Describe the solution you'd like

Add a `softDeleteField` option to Entity/PartitionedEntity config:

```typescript
const PostEntity = Entity<"posts", Database>(client, "posts", {
  softDelete: true,
  softDeleteField: "deleted_at", // defaults to "deleted"
})
```

### Implementation notes

Files to modify:

1. **`src/entity/types.ts`** - Add `softDeleteField?: string` to `EntityConfig` and `PartitionedEntityConfig`

2. **`src/query/index.ts`** - Update `softDeleteEntity` and `softDeleteEntities` to accept field name parameter

3. **`src/query/QueryBuilder.ts`** - Thread field name through to `.excludeDeleted()`, `.includeDeleted()`, `.onlyDeleted()` methods

4. **`src/entity/Entity.ts`** and **`src/entity/PartitionedEntity.ts`** - Pass config through to query functions

### Complexity

Medium - the tricky part is threading the field name from Entity config through to Query methods, since Query is currently independent of Entity.

### Workaround

Use `deleted` as the column name in your schema.

---

## To create this issue

```bash
gh issue create --title "Allow configuring the soft delete field name" --body "$(cat CONFIGURABLE_SOFT_DELETE_ISSUE.md)"
```

Or go to: https://github.com/jordanburke/supabase-typed-query/issues/new
