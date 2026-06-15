/**
 * Shared type definitions for Entity and PartitionedEntity
 */

import type { Brand, IOTask as Task, List } from "functype"
import { Option } from "functype"

import type { EntityWhereConditions, Query } from "@/query/Query"
import type {
  Database,
  DatabaseSchema,
  EmptyObject,
  SchemaNames,
  TableInsert,
  TableNames,
  TableRow,
  TableUpdate,
  ViewNames,
  ViewRow,
} from "@/types"

// =============================================================================
// Partition Key Types
// =============================================================================

/**
 * Partition key can be a string or any branded string type
 * This enables type-safe partition keys using functype's Brand/ValidatedBrand
 */
export type PartitionKey = string | Brand<string, string>

// =============================================================================
// Field-Level Type Safety
// =============================================================================

/**
 * Field-level type safety for queries
 */
export type TypedRecord<T, V> = Partial<Record<keyof T, V>>

// =============================================================================
// Entity Configuration
// =============================================================================

/**
 * Configuration for standard Entity (no partition)
 */
export type EntityConfig = {
  /** Soft delete filtering. true = exclude deleted items, false = include deleted items */
  softDelete: boolean
  /** Database schema to query (defaults to "public") */
  schema?: string
}

/**
 * Configuration for PartitionedEntity
 */
export type PartitionedEntityConfig = {
  /** The database column name used for partitioning (e.g., "tenant_id") */
  partitionField: string
  /** Soft delete filtering. true = exclude deleted items, false = include deleted items */
  softDelete: boolean
  /** Database schema to query (defaults to "public") */
  schema?: string
}

// =============================================================================
// Base Parameter Types
// =============================================================================

export type WhereParams<T extends object = EmptyObject> = {
  where?: EntityWhereConditions<T>
}

export type IsParams<T extends object = EmptyObject> = {
  is?: TypedRecord<T, null | boolean>
}

export type WhereinParams<T extends object = EmptyObject> = {
  wherein?: TypedRecord<T, unknown[]>
}

export type OrderParams<T extends object = EmptyObject> = {
  order?: [keyof T & string, { ascending?: boolean; nullsFirst?: boolean }]
}

export type LimitParams = {
  /** Maximum number of rows to return */
  limit?: number
}

export type OffsetParams = {
  /** Number of rows to skip before returning results */
  offset?: number
}

export type ComparisonParams<T extends object = EmptyObject> = {
  gte?: TypedRecord<T, number | string | Date>
  gt?: TypedRecord<T, number | string | Date>
  lte?: TypedRecord<T, number | string | Date>
  lt?: TypedRecord<T, number | string | Date>
  neq?: TypedRecord<T, unknown>
  like?: TypedRecord<T, string>
  ilike?: TypedRecord<T, string>
}

export type NotParams<T extends object = EmptyObject> = {
  not?: {
    is?: TypedRecord<T, null | boolean> // NOT IS NULL, NOT IS TRUE, NOT IS FALSE
    in?: TypedRecord<T, unknown[]> // NOT IN array
  }
}

export type IdParam = {
  id: string
}

// =============================================================================
// Composable Parameter Types
// =============================================================================

export type GetItemParams<T extends object = EmptyObject> = IdParam & WhereParams<T> & IsParams<T>

export type GetItemsParams<T extends object = EmptyObject> = WhereParams<T> &
  IsParams<T> &
  WhereinParams<T> &
  OrderParams<T> &
  ComparisonParams<T> &
  NotParams<T> &
  LimitParams &
  OffsetParams

export type AddItemsParams<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
> = {
  items: TableInsert<T, DB, S>[]
}

/**
 * Prisma-style update params for single item: { where, data }
 */
export type UpdateItemParams<
  T extends TableNames<DB, S>,
  Row extends object = EmptyObject,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
> = {
  /** Conditions to match the item to update */
  where: EntityWhereConditions<Row>
  /** The data to update */
  data: TableUpdate<T, DB, S>
} & IsParams<Row> &
  WhereinParams<Row>

/**
 * Prisma-style update params for multiple items: { where, data }
 */
export type UpdateItemsParams<
  T extends TableNames<DB, S>,
  Row extends object = EmptyObject,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
> = {
  /** Conditions to match items to update */
  where: EntityWhereConditions<Row>
  /** The data to update on all matched items */
  data: TableUpdate<T, DB, S>
} & IsParams<Row> &
  WhereinParams<Row>

/**
 * Batch upsert params: update multiple rows with different data per row
 */
export type UpsertItemsParams<
  T extends TableNames<DB, S>,
  Row extends object = EmptyObject,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
> = {
  /** Array of items to upsert, each with its own data */
  items: TableUpdate<T, DB, S>[]
  /** Column(s) to use as identity for matching (default: "id") */
  identity?: (keyof Row & string) | (keyof Row & string)[]
}

/**
 * Delete params for single item: { where }
 */
export type DeleteItemParams<Row extends object = EmptyObject> = {
  /** Conditions to match the item to delete */
  where: EntityWhereConditions<Row>
} & IsParams<Row> &
  WhereinParams<Row>

/**
 * Delete params for multiple items: { where }
 */
export type DeleteItemsParams<Row extends object = EmptyObject> = {
  /** Conditions to match items to delete */
  where: EntityWhereConditions<Row>
} & IsParams<Row> &
  WhereinParams<Row>

// =============================================================================
// Mutation Query Wrappers
// =============================================================================

const MUTATION_NOT_EXECUTED_ERROR =
  "Query builder awaited without calling a terminal method. Call .manyOrThrow() / .oneOrThrow() or .many() / .one() before awaiting."

/**
 * Mutation-specific execution interface for multi-result operations.
 *
 * Provides both lazy Task-based execution and eager Promise-based execution.
 * The redundant `execute()`/`executeOrThrow()` aliases are removed — use
 * `many()`/`manyOrThrow()` which clearly signal cardinality.
 *
 * Includes a poison `.then()` that throws if the builder is accidentally `await`ed
 * without calling a terminal method first.
 */
export type MutationMultiExecution<T> = {
  many(): Task<Error, List<T>>
  manyOrThrow(): Promise<List<T>>
  /** @internal Poison pill — throws if builder is awaited without calling a terminal method */
  then(onfulfilled?: unknown, onrejected?: unknown): never
}

/**
 * Mutation-specific execution interface for single-result operations.
 *
 * Provides both lazy Task-based execution and eager Promise-based execution.
 * The redundant `execute()`/`executeOrThrow()` aliases are removed — use
 * `one()`/`oneOrThrow()` which clearly signal cardinality.
 *
 * Includes a poison `.then()` that throws if the builder is accidentally `await`ed
 * without calling a terminal method first.
 */
export type MutationSingleExecution<T> = {
  one(): Task<Error, Option<T>>
  oneOrThrow(): Promise<T>
  /** @internal Poison pill — throws if builder is awaited without calling a terminal method */
  then(onfulfilled?: unknown, onrejected?: unknown): never
}

/**
 * Creates a multi-result mutation query.
 */
export function MultiMutationQuery<T>(task: Task<Error, List<T>>): MutationMultiExecution<T> {
  return {
    many: () => task,
    manyOrThrow: async (): Promise<List<T>> => {
      return task.runOrThrow()
    },
    then(): never {
      throw new Error(MUTATION_NOT_EXECUTED_ERROR)
    },
  }
}

/**
 * Creates a single-result mutation query.
 */
export function SingleMutationQuery<T>(task: Task<Error, T>): MutationSingleExecution<T> {
  return {
    one: () => task.map((value: T) => Option(value)),
    oneOrThrow: async (): Promise<T> => {
      return task.runOrThrow() as Promise<T>
    },
    then(): never {
      throw new Error(MUTATION_NOT_EXECUTED_ERROR)
    },
  }
}

// =============================================================================
// Entity Interfaces
// =============================================================================

/**
 * Base interface for Entity instances (global, no partition)
 *
 * @typeParam T - The table name
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 * @typeParam S - The schema name (defaults to "public")
 */
export type IEntity<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
> = {
  getItem(params: GetItemParams<TableRow<T, DB, S>>): Query<TableRow<T, DB, S>>
  getItems(params?: GetItemsParams<TableRow<T, DB, S>>): Query<TableRow<T, DB, S>>
  addItems(params: AddItemsParams<T, DB, S>): MutationMultiExecution<TableRow<T, DB, S>>
  updateItem(params: UpdateItemParams<T, TableRow<T, DB, S>, DB, S>): MutationSingleExecution<TableRow<T, DB, S>>
  updateItems(params: UpdateItemsParams<T, TableRow<T, DB, S>, DB, S>): MutationMultiExecution<TableRow<T, DB, S>>
  upsertItems(params: UpsertItemsParams<T, TableRow<T, DB, S>, DB, S>): MutationMultiExecution<TableRow<T, DB, S>>
  deleteItem(params: DeleteItemParams<TableRow<T, DB, S>>): MutationSingleExecution<TableRow<T, DB, S>>
  deleteItems(params: DeleteItemsParams<TableRow<T, DB, S>>): MutationMultiExecution<TableRow<T, DB, S>>
}

/**
 * Interface for PartitionedEntity instances (requires partition key on calls)
 *
 * @typeParam T - The table name
 * @typeParam K - The partition key type
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 * @typeParam S - The schema name (defaults to "public")
 */
export type IPartitionedEntity<
  T extends TableNames<DB, S>,
  K extends PartitionKey,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
> = {
  getItem(partitionKey: K, params: GetItemParams<TableRow<T, DB, S>>): Query<TableRow<T, DB, S>>
  getItems(partitionKey: K, params?: GetItemsParams<TableRow<T, DB, S>>): Query<TableRow<T, DB, S>>
  addItems(params: AddItemsParams<T, DB, S>): MutationMultiExecution<TableRow<T, DB, S>>
  updateItem(
    partitionKey: K,
    params: UpdateItemParams<T, TableRow<T, DB, S>, DB, S>,
  ): MutationSingleExecution<TableRow<T, DB, S>>
  updateItems(
    partitionKey: K,
    params: UpdateItemsParams<T, TableRow<T, DB, S>, DB, S>,
  ): MutationMultiExecution<TableRow<T, DB, S>>
  upsertItems(
    partitionKey: K,
    params: UpsertItemsParams<T, TableRow<T, DB, S>, DB, S>,
  ): MutationMultiExecution<TableRow<T, DB, S>>
  deleteItem(partitionKey: K, params: DeleteItemParams<TableRow<T, DB, S>>): MutationSingleExecution<TableRow<T, DB, S>>
  deleteItems(
    partitionKey: K,
    params: DeleteItemsParams<TableRow<T, DB, S>>,
  ): MutationMultiExecution<TableRow<T, DB, S>>
}

/**
 * Type for an entity instance for a specific table
 * @deprecated Use IEntity<T, DB, S> instead
 */
export type EntityType<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
> = IEntity<T, DB, S>

// =============================================================================
// View Entity Interfaces
// =============================================================================

/**
 * Configuration for ViewEntity (read-only, no partition)
 */
export type ViewEntityConfig = {
  /** Database schema to query (defaults to "public") */
  schema?: string
}

/**
 * Configuration for PartitionedViewEntity
 */
export type PartitionedViewEntityConfig = {
  /** The database column name used for partitioning (e.g., "tenant_id") */
  partitionField: string
  /** Database schema to query (defaults to "public") */
  schema?: string
}

/**
 * Read-only interface for ViewEntity instances (global, no partition)
 * Views only have Row type, so only read operations are available.
 *
 * @typeParam V - The view name
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 * @typeParam S - The schema name (defaults to "public")
 */
export type IViewEntity<
  V extends ViewNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
> = {
  getItem(params: GetItemParams<ViewRow<V, DB, S>>): Query<ViewRow<V, DB, S>>
  getItems(params?: GetItemsParams<ViewRow<V, DB, S>>): Query<ViewRow<V, DB, S>>
}

/**
 * Read-only interface for PartitionedViewEntity instances (requires partition key on calls)
 * Views only have Row type, so only read operations are available.
 *
 * @typeParam V - The view name
 * @typeParam K - The partition key type
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 * @typeParam S - The schema name (defaults to "public")
 */
export type IPartitionedViewEntity<
  V extends ViewNames<DB, S>,
  K extends PartitionKey,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
> = {
  getItem(partitionKey: K, params: GetItemParams<ViewRow<V, DB, S>>): Query<ViewRow<V, DB, S>>
  getItems(partitionKey: K, params?: GetItemsParams<ViewRow<V, DB, S>>): Query<ViewRow<V, DB, S>>
}
