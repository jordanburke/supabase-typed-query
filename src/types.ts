/**
 * Core type definitions for supabase-typed-query
 */

// =============================================================================
// Database Schema Types
// =============================================================================

/**
 * Structure of a single schema within a database.
 */
export interface SchemaDefinition {
  Tables: Record<
    string,
    {
      Row: object
      Insert: object
      Update: object
    }
  >
  Views?: Record<string, { Row: object }>
  Functions?: Record<string, { Args: object; Returns: unknown }>
  Enums?: Record<string, unknown>
  CompositeTypes?: Record<string, unknown>
}

/**
 * Base schema interface that all databases must conform to.
 * Consumer-provided Database types must extend this interface.
 * Supports multiple schemas (public, custom schemas, etc.)
 *
 * Note: No index signature - TypeScript's structural typing allows additional properties.
 * This permits Supabase's __InternalSupabase while maintaining type safety for valid schemas.
 */
export interface DatabaseSchema {
  public: SchemaDefinition
}

/**
 * Extracts a valid schema from a database type.
 * Returns the schema if it's a valid SchemaDefinition, otherwise never.
 * This ensures type-safe access to schema properties.
 */
export type ValidSchema<DB extends DatabaseSchema, S extends string> = S extends keyof DB
  ? DB[S] extends SchemaDefinition
    ? DB[S]
    : never
  : never

/**
 * Helper type to strip `__InternalSupabase` from Supabase-generated database types.
 * Following Supabase's own pattern from SupabaseClient.
 *
 * @example
 * ```typescript
 * type Schemas = keyof TypedDatabase<Database>  // "public" | "inventory" (excludes __InternalSupabase)
 * ```
 */
export type TypedDatabase<DB> = Omit<DB, "__InternalSupabase">

/**
 * Default Database type - used as fallback when no specific database type is provided.
 * For proper type inference, consumers should pass their generated Database type as a generic.
 */
export interface Database extends DatabaseSchema {
  public: {
    Tables: Record<
      string,
      {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    >
    Views: Record<string, { Row: Record<string, unknown> }>
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>
    Enums: Record<string, unknown>
    CompositeTypes: Record<string, unknown>
  }
}

// =============================================================================
// Generic Table Types
// =============================================================================

/**
 * Schema names for a given database.
 * Only includes keys whose values are valid SchemaDefinitions (have Tables property).
 * This excludes __InternalSupabase by structure, not just by name - providing true type safety.
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 */
export type SchemaNames<DB extends DatabaseSchema = Database> = {
  [K in keyof DB]: DB[K] extends SchemaDefinition ? K : never
}[keyof DB] &
  string

/**
 * Default schema name constant.
 */
export const DEFAULT_SCHEMA = "public" as const

/**
 * Table names for a given database schema.
 * Uses ValidSchema for type-safe access - only valid SchemaDefinitions can be accessed.
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 * @typeParam S - The schema name (defaults to "public")
 */
export type TableNames<
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
> = keyof ValidSchema<DB, S>["Tables"] & string

/**
 * Row type for a given table in a database schema.
 * Uses ValidSchema for type-safe access.
 * @typeParam T - The table name
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 * @typeParam S - The schema name (defaults to "public")
 */
export type TableRow<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
> = ValidSchema<DB, S>["Tables"][T]["Row"]

/**
 * Insert type for a given table in a database schema.
 * Uses ValidSchema for type-safe access.
 * @typeParam T - The table name
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 * @typeParam S - The schema name (defaults to "public")
 */
export type TableInsert<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
> = ValidSchema<DB, S>["Tables"][T]["Insert"]

/**
 * Update type for a given table in a database schema.
 * Uses ValidSchema for type-safe access.
 * @typeParam T - The table name
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 * @typeParam S - The schema name (defaults to "public")
 */
export type TableUpdate<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
> = ValidSchema<DB, S>["Tables"][T]["Update"]

// =============================================================================
// Utility Types
// =============================================================================

// Empty object type for optional parameters
export type EmptyObject = Record<string, never>

// =============================================================================
// Query Builder Types
// =============================================================================

// Query builder interface that Supabase returns from .from()
export interface QueryBuilder extends Promise<{ data: unknown; error: unknown }> {
  select: (columns?: string) => QueryBuilder
  insert: (data: unknown) => QueryBuilder
  update: (data: unknown) => QueryBuilder
  upsert: (data: unknown, options?: { onConflict?: string }) => QueryBuilder
  delete: () => QueryBuilder
  match: (query: Record<string, unknown>) => QueryBuilder
  eq: (column: string, value: unknown) => QueryBuilder
  neq: (column: string, value: unknown) => QueryBuilder
  gt: (column: string, value: unknown) => QueryBuilder
  gte: (column: string, value: unknown) => QueryBuilder
  lt: (column: string, value: unknown) => QueryBuilder
  lte: (column: string, value: unknown) => QueryBuilder
  like: (column: string, pattern: string) => QueryBuilder
  ilike: (column: string, pattern: string) => QueryBuilder
  is: (column: string, value: boolean | null) => QueryBuilder
  in: (column: string, values: unknown[]) => QueryBuilder
  or: (filters: string) => QueryBuilder
  single: () => QueryBuilder
  limit: (count: number) => QueryBuilder
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder
}

// =============================================================================
// Client Types
// =============================================================================

/**
 * Query builder returned by client.from() or client.schema().from()
 */
export interface SupabaseQueryBuilder {
  select: (columns?: string) => unknown
  insert: (data: unknown) => unknown
  update: (data: unknown) => unknown
  upsert: (data: unknown, options?: { onConflict?: string }) => unknown
  delete: () => unknown
}

/**
 * Schema accessor returned by client.schema()
 */
export interface SupabaseSchemaAccessor {
  from: (table: string) => SupabaseQueryBuilder
}

/**
 * Supabase client type - accepts any client with compatible from() and schema() methods.
 * Uses `unknown` return type to allow SupabaseClient<Database> from @supabase/supabase-js
 * to be used directly without type casting.
 *
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 */
export interface SupabaseClientType<DB extends DatabaseSchema = Database> {
  from: (table: TableNames<DB>) => unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: (name: any) => SupabaseSchemaAccessor
}
