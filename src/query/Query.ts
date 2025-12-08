import type { Database, DatabaseSchema, EmptyObject, TableNames, TableRow } from "@/types"

import type { Brand, FPromise, List, Option, TaskOutcome } from "functype"

// Comparison operators for advanced queries
export type ComparisonOperators<V> = {
  gte?: V // Greater than or equal
  gt?: V // Greater than
  lte?: V // Less than or equal
  lt?: V // Less than
  neq?: V // Not equal
  like?: string // LIKE pattern (for string fields)
  ilike?: string // Case-insensitive LIKE
  in?: V[] // IN array
  is?: null | boolean // IS NULL/TRUE/FALSE
}

// Type-safe WHERE conditions that provide IntelliSense for table columns
// Supports both direct values and operator objects for advanced queries
export type WhereConditions<T extends object> = Partial<{
  [K in keyof T]: T[K] | null | ComparisonOperators<T[K]>
}> & {
  // Special operators that work across columns with type-safe values
  gte?: Partial<{ [K in keyof T]?: T[K] }>
  gt?: Partial<{ [K in keyof T]?: T[K] }>
  lte?: Partial<{ [K in keyof T]?: T[K] }>
  lt?: Partial<{ [K in keyof T]?: T[K] }>
  neq?: Partial<{ [K in keyof T]?: T[K] }>
  like?: Partial<{ [K in keyof T]?: Extract<T[K], string> }>
  ilike?: Partial<{ [K in keyof T]?: Extract<T[K], string> }>
}

/**
 * Entity-specific WHERE conditions - no nested ComparisonOperators allowed.
 * Entity API methods (getItems, updateItem, etc.) don't process nested operators.
 * Use separate `is`, `wherein`, etc. parameters for these operations.
 *
 * @example
 * // Correct Entity usage:
 * Entity.getItems({ where: { code }, is: { used_at: null } })
 *
 * // Incorrect (use Query API instead for nested operators):
 * Entity.getItems({ where: { code, used_at: { is: null } } }) // TypeScript error
 */
export type EntityWhereConditions<T extends object> = Partial<{
  [K in keyof T]: T[K] | null
}>

// Enhanced type for IS conditions with field-level type safety
export type IsConditions<T extends object = EmptyObject> = Partial<Record<keyof T, null | boolean>>

// Soft delete mode for controlling how deleted records are handled
export type SoftDeleteMode = "include" | "exclude" | "only"

// =============================================================================
// Standard Execution Interfaces for Consistent OrThrow Pattern
// =============================================================================

/**
 * Base execution interface that all database operations implement
 */
export interface ExecutableQuery<T> {
  // TaskOutcome version (for explicit error handling)
  execute(): FPromise<TaskOutcome<T>>

  // OrThrow version (for simple error handling)
  executeOrThrow(): Promise<T>
}

/**
 * Standard interface for operations that return a single result
 */
export interface SingleExecution<T> extends ExecutableQuery<Option<T>> {
  one(): FPromise<TaskOutcome<Option<T>>>
  oneOrThrow(): Promise<T>
}

/**
 * Standard interface for operations that return multiple results
 */
export interface MultiExecution<T> extends ExecutableQuery<List<T>> {
  many(): FPromise<TaskOutcome<List<T>>>
  manyOrThrow(): Promise<List<T>>
}

// Branded type support for query conditions
export type BrandedWhereParams<T extends object = EmptyObject> = {
  [K in keyof T]?: T[K] | unknown // Simplified to avoid complex conditional types
}

// Helper type for branded field values
export type BrandedFieldValue<T> = T extends Brand<string, infer BaseType> ? T | BaseType : T

// =============================================================================
// Core Query Interface with Database Generic Support
// =============================================================================

/**
 * Core Query interface with branded type support.
 *
 * @typeParam T - The table name
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 */
export interface Query<T extends TableNames<DB>, DB extends DatabaseSchema = Database> {
  // Execution methods - explicit about expected results
  one(): FPromise<TaskOutcome<Option<TableRow<T, DB>>>>
  many(): FPromise<TaskOutcome<List<TableRow<T, DB>>>>
  first(): FPromise<TaskOutcome<Option<TableRow<T, DB>>>>

  // OrThrow methods - throw errors instead of returning TaskOutcome (v0.8.0+)
  oneOrThrow(): Promise<TableRow<T, DB>>
  manyOrThrow(): Promise<List<TableRow<T, DB>>>
  firstOrThrow(): Promise<TableRow<T, DB>>

  // Query composition - chainable OR logic with type-safe where conditions
  or(where: WhereConditions<TableRow<T, DB>>, is?: IsConditions<TableRow<T, DB>>): Query<T, DB>

  // Branded type-aware query methods (simplified)
  whereId<ID extends Brand<string, string>>(id: ID): Query<T, DB>
  orWhereId<ID extends Brand<string, string>>(id: ID): Query<T, DB>

  // Functional operations - maintain composability
  map<U>(fn: (item: TableRow<T, DB>) => U): MappedQuery<U>
  filter(predicate: (item: TableRow<T, DB>) => boolean): Query<T, DB>

  // Pagination
  limit(count: number): Query<T, DB>
  offset(count: number): Query<T, DB>

  // Soft delete filtering
  includeDeleted(): Query<T, DB>
  excludeDeleted(): Query<T, DB>
  onlyDeleted(): Query<T, DB>
}

// Mapped query for transformed results
export interface MappedQuery<U> {
  one(): FPromise<TaskOutcome<Option<U>>>
  many(): FPromise<TaskOutcome<List<U>>>
  first(): FPromise<TaskOutcome<Option<U>>>

  // OrThrow methods - throw errors instead of returning TaskOutcome (v0.8.0+)
  oneOrThrow(): Promise<U>
  manyOrThrow(): Promise<List<U>>
  firstOrThrow(): Promise<U>

  // Continue chaining
  map<V>(fn: (item: U) => V): MappedQuery<V>
  filter(predicate: (item: U) => boolean): MappedQuery<U>
}

// =============================================================================
// Query Condition Types
// =============================================================================

/**
 * Query condition for internal state management with type-safe where.
 *
 * @typeParam T - The table name
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 */
export interface QueryCondition<T extends TableNames<DB>, DB extends DatabaseSchema = Database> {
  where: WhereConditions<TableRow<T, DB>>
  is?: IsConditions<TableRow<T, DB>>
  wherein?: Partial<Record<keyof TableRow<T, DB>, unknown[]>>
  // Comparison operators
  gt?: Partial<Record<keyof TableRow<T, DB>, number | string | Date>>
  gte?: Partial<Record<keyof TableRow<T, DB>, number | string | Date>>
  lt?: Partial<Record<keyof TableRow<T, DB>, number | string | Date>>
  lte?: Partial<Record<keyof TableRow<T, DB>, number | string | Date>>
  neq?: Partial<Record<keyof TableRow<T, DB>, unknown>>
  // Pattern matching
  like?: Partial<Record<keyof TableRow<T, DB>, string>>
  ilike?: Partial<Record<keyof TableRow<T, DB>, string>>
}

// =============================================================================
// Entity Query Interfaces
// =============================================================================

/**
 * Entity-specific query interfaces for better type safety.
 *
 * @typeParam T - The table name
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 */
export interface EntityQuery<T extends TableNames<DB>, DB extends DatabaseSchema = Database> extends Query<T, DB> {
  // Entity-specific methods can be added here
  normalize(): NormalizedQuery<T, DB>
}

/**
 * Normalized query interface.
 *
 * @typeParam T - The table name
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 */
export interface NormalizedQuery<T extends TableNames<DB>, DB extends DatabaseSchema = Database> {
  one(): FPromise<TaskOutcome<Option<TableRow<T, DB>>>>
  many(): FPromise<TaskOutcome<List<TableRow<T, DB>>>>
  first(): FPromise<TaskOutcome<Option<TableRow<T, DB>>>>
}

// =============================================================================
// Type Guards
// =============================================================================

// Type guards for runtime type checking
export const isQuery = <T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  obj: unknown,
): obj is Query<T, DB> => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "one" in obj &&
    "many" in obj &&
    "first" in obj &&
    "or" in obj &&
    "map" in obj &&
    "filter" in obj
  )
}

export const isMappedQuery = <U>(obj: unknown): obj is MappedQuery<U> => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "one" in obj &&
    "many" in obj &&
    "first" in obj &&
    "map" in obj &&
    "filter" in obj
  )
}

// =============================================================================
// Utility Types for Query Parameters
// =============================================================================

/**
 * Utility types for query parameters with type safety.
 *
 * @typeParam T - The table name
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 */
export type QueryWhereParams<T extends TableNames<DB>, DB extends DatabaseSchema = Database> = WhereConditions<
  TableRow<T, DB>
>
export type QueryIsParams<T extends TableNames<DB>, DB extends DatabaseSchema = Database> = IsConditions<
  TableRow<T, DB>
>
export type QueryWhereinParams<T extends TableNames<DB>, DB extends DatabaseSchema = Database> = Partial<
  Record<keyof TableRow<T, DB>, unknown[]>
>
export type QueryOrderParams<T extends TableNames<DB>, DB extends DatabaseSchema = Database> = [
  keyof TableRow<T, DB> & string,
  { ascending?: boolean; nullsFirst?: boolean },
]

// =============================================================================
// Builder Configuration
// =============================================================================

/**
 * Builder configuration for query construction.
 *
 * @typeParam T - The table name
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 */
export interface QueryBuilderConfig<T extends TableNames<DB>, DB extends DatabaseSchema = Database> {
  table: T
  conditions: QueryCondition<T, DB>[]
  order?: QueryOrderParams<T, DB>
  mapFn?: (item: TableRow<T, DB>) => unknown
  filterFn?: (item: TableRow<T, DB>) => boolean
  limit?: number
  offset?: number
  softDeleteMode?: SoftDeleteMode
  softDeleteAppliedByDefault?: boolean
  /** Database schema to query (defaults to "public") */
  schema?: string
}
