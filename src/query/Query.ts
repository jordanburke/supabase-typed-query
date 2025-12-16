import type { EmptyObject } from "@/types"

import type { Brand, IOTask as Task, List, Option } from "functype"

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

// NOT conditions for negating IS and IN operations (follows Supabase .not() pattern)
export type NotConditions<T extends object = EmptyObject> = {
  is?: Partial<Record<keyof T, null | boolean>> // NOT IS NULL, NOT IS TRUE, NOT IS FALSE
  in?: Partial<Record<keyof T, unknown[]>> // NOT IN array
}

// Soft delete mode for controlling how deleted records are handled
export type SoftDeleteMode = "include" | "exclude" | "only"

// =============================================================================
// Standard Execution Interfaces for Consistent OrThrow Pattern
// =============================================================================

/**
 * Base execution interface that all database operations implement
 */
export interface ExecutableQuery<T> {
  // Task version - lazy, returns Either on .run() (for explicit error handling)
  execute(): Task<Error, T>

  // OrThrow version (for simple error handling)
  executeOrThrow(): Promise<T>
}

/**
 * Standard interface for operations that return a single result
 */
export interface SingleExecution<T> extends ExecutableQuery<Option<T>> {
  one(): Task<Error, Option<T>>
  oneOrThrow(): Promise<T>
}

/**
 * Standard interface for operations that return multiple results
 */
export interface MultiExecution<T> extends ExecutableQuery<List<T>> {
  many(): Task<Error, List<T>>
  manyOrThrow(): Promise<List<T>>
}

// Branded type support for query conditions
export type BrandedWhereParams<T extends object = EmptyObject> = {
  [K in keyof T]?: T[K] | unknown // Simplified to avoid complex conditional types
}

// Helper type for branded field values
export type BrandedFieldValue<T> = T extends Brand<string, infer BaseType> ? T | BaseType : T

// =============================================================================
// Core Query Interface - Simplified with Row Type Only
// =============================================================================

/**
 * Core Query interface with branded type support.
 * Simplified to take just the Row type for better TypeScript performance.
 *
 * @typeParam Row - The row type for the table
 */
export interface Query<Row extends object> {
  // Execution methods - lazy Task that returns Either on .run()
  one(): Task<Error, Option<Row>>
  many(): Task<Error, List<Row>>
  first(): Task<Error, Option<Row>>

  // OrThrow methods - throw errors instead of returning Task
  oneOrThrow(): Promise<Row>
  manyOrThrow(): Promise<List<Row>>
  firstOrThrow(): Promise<Row>

  // Query composition - chainable OR logic with type-safe where conditions
  or(where: WhereConditions<Row>, is?: IsConditions<Row>): Query<Row>

  // Branded type-aware query methods (simplified)
  whereId<ID extends Brand<string, string>>(id: ID): Query<Row>
  orWhereId<ID extends Brand<string, string>>(id: ID): Query<Row>

  // Functional operations - maintain composability
  map<U>(fn: (item: Row) => U): MappedQuery<U>
  filter(predicate: (item: Row) => boolean): Query<Row>

  // Pagination
  limit(count: number): Query<Row>
  offset(count: number): Query<Row>

  // Soft delete filtering
  includeDeleted(): Query<Row>
  excludeDeleted(): Query<Row>
  onlyDeleted(): Query<Row>
}

// Mapped query for transformed results
export interface MappedQuery<U> {
  one(): Task<Error, Option<U>>
  many(): Task<Error, List<U>>
  first(): Task<Error, Option<U>>

  // OrThrow methods - throw errors instead of returning Task
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
 * @typeParam Row - The row type
 */
export interface QueryCondition<Row extends object> {
  where: WhereConditions<Row>
  is?: IsConditions<Row>
  wherein?: Partial<Record<keyof Row, unknown[]>>
  // Comparison operators
  gt?: Partial<Record<keyof Row, number | string | Date>>
  gte?: Partial<Record<keyof Row, number | string | Date>>
  lt?: Partial<Record<keyof Row, number | string | Date>>
  lte?: Partial<Record<keyof Row, number | string | Date>>
  neq?: Partial<Record<keyof Row, unknown>>
  // Pattern matching
  like?: Partial<Record<keyof Row, string>>
  ilike?: Partial<Record<keyof Row, string>>
  // NOT conditions (for IS NOT NULL, NOT IN, etc.)
  not?: NotConditions<Row>
}

// =============================================================================
// Entity Query Interfaces
// =============================================================================

/**
 * Entity-specific query interfaces for better type safety.
 *
 * @typeParam Row - The row type
 */
export interface EntityQuery<Row extends object> extends Query<Row> {
  // Entity-specific methods can be added here
  normalize(): NormalizedQuery<Row>
}

/**
 * Normalized query interface.
 *
 * @typeParam Row - The row type
 */
export interface NormalizedQuery<Row extends object> {
  one(): Task<Error, Option<Row>>
  many(): Task<Error, List<Row>>
  first(): Task<Error, Option<Row>>
}

// =============================================================================
// Type Guards
// =============================================================================

// Type guards for runtime type checking
export const isQuery = <Row extends object>(obj: unknown): obj is Query<Row> => {
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
 * Simplified to take Row type directly.
 *
 * @typeParam Row - The row type
 */
export type QueryWhereParams<Row extends object> = WhereConditions<Row>
export type QueryIsParams<Row extends object> = IsConditions<Row>
export type QueryWhereinParams<Row extends object> = Partial<Record<keyof Row, unknown[]>>
export type QueryOrderParams<Row extends object> = [keyof Row & string, { ascending?: boolean; nullsFirst?: boolean }]

// =============================================================================
// Builder Configuration
// =============================================================================

/**
 * Builder configuration for query construction.
 * Simplified to take Row type directly for better TypeScript performance.
 *
 * @typeParam Row - The row type
 */
export interface QueryBuilderConfig<Row extends object> {
  table: string
  conditions: QueryCondition<Row>[]
  order?: QueryOrderParams<Row>
  mapFn?: (item: Row) => unknown
  filterFn?: (item: Row) => boolean
  limit?: number
  offset?: number
  softDeleteMode?: SoftDeleteMode
  softDeleteAppliedByDefault?: boolean
  /** Database schema to query (defaults to "public") */
  schema?: string
}
