/**
 * Shared type definitions for Entity and PartitionedEntity
 */

import type { MultiExecution, Query, SingleExecution, WhereConditions } from "@/query/Query"
import type { EmptyObject, TableInsert, TableNames, TableRow, TableUpdate } from "@/types"

import type { Brand, FPromise, List, TaskOutcome } from "functype"
import { Option } from "functype"

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
}

/**
 * Configuration for PartitionedEntity
 */
export type PartitionedEntityConfig = {
  /** The database column name used for partitioning (e.g., "tenant_id") */
  partitionField: string
  /** Soft delete filtering. true = exclude deleted items, false = include deleted items */
  softDelete: boolean
}

// =============================================================================
// Base Parameter Types
// =============================================================================

export type WhereParams<T extends object = EmptyObject> = {
  where?: WhereConditions<T>
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
  OrderParams<T>

export type AddItemsParams<T extends TableNames> = {
  items: TableInsert<T>[]
}

/**
 * Prisma-style update params for single item: { where, data }
 */
export type UpdateItemParams<T extends TableNames, Row extends object = EmptyObject> = {
  /** Conditions to match the item to update */
  where: WhereConditions<Row>
  /** The data to update */
  data: TableUpdate<T>
} & IsParams<Row> &
  WhereinParams<Row>

/**
 * Prisma-style update params for multiple items: { where, data }
 */
export type UpdateItemsParams<T extends TableNames, Row extends object = EmptyObject> = {
  /** Conditions to match items to update */
  where: WhereConditions<Row>
  /** The data to update on all matched items */
  data: TableUpdate<T>
} & IsParams<Row> &
  WhereinParams<Row>

// =============================================================================
// Mutation Query Wrappers
// =============================================================================

/**
 * Wrapper type for multi-result mutation operations that implements standard execution interface
 */
export type MutationMultiExecution<T> = FPromise<TaskOutcome<List<T>>> & MultiExecution<T>

/**
 * Wrapper type for single-result mutation operations that implements standard execution interface
 */
export type MutationSingleExecution<T> = FPromise<TaskOutcome<T>> & SingleExecution<T>

/**
 * Creates a multi-result mutation query that implements the standard execution interface
 */
export function MultiMutationQuery<T>(promise: FPromise<TaskOutcome<List<T>>>): MutationMultiExecution<T> {
  const result = Object.assign(promise, {
    many: () => promise,
    manyOrThrow: async (): Promise<List<T>> => {
      const taskResult = await promise
      return taskResult.orThrow()
    },
    execute: () => promise,
    executeOrThrow: async (): Promise<List<T>> => {
      const taskResult = await promise
      return taskResult.orThrow()
    },
  })
  return result as MutationMultiExecution<T>
}

/**
 * Creates a single-result mutation query that implements the standard execution interface
 */
export function SingleMutationQuery<T>(promise: FPromise<TaskOutcome<T>>): MutationSingleExecution<T> {
  const result = Object.assign(promise, {
    one: () => promise.then((outcome: TaskOutcome<T>) => outcome.map((value: T) => Option(value))),
    oneOrThrow: async (): Promise<T> => {
      const taskResult = await promise
      return taskResult.orThrow()
    },
    execute: () => promise.then((outcome: TaskOutcome<T>) => outcome.map((value: T) => Option(value))),
    executeOrThrow: async (): Promise<Option<T>> => {
      const taskResult = await promise
      const value = taskResult.orThrow()
      return Option(value)
    },
  })
  return result as MutationSingleExecution<T>
}

// =============================================================================
// Entity Interfaces
// =============================================================================

/**
 * Base interface for Entity instances (global, no partition)
 */
export type IEntity<T extends TableNames> = {
  getItem(params: GetItemParams<TableRow<T>>): Query<T>
  getItems(params?: GetItemsParams<TableRow<T>>): Query<T>
  addItems(params: AddItemsParams<T>): MutationMultiExecution<TableRow<T>>
  updateItem(params: UpdateItemParams<T, TableRow<T>>): MutationSingleExecution<TableRow<T>>
  updateItems(params: UpdateItemsParams<T, TableRow<T>>): MutationMultiExecution<TableRow<T>>
}

/**
 * Interface for PartitionedEntity instances (requires partition key on calls)
 */
export type IPartitionedEntity<T extends TableNames, K extends PartitionKey> = {
  getItem(partitionKey: K, params: GetItemParams<TableRow<T>>): Query<T>
  getItems(partitionKey: K, params?: GetItemsParams<TableRow<T>>): Query<T>
  addItems(params: AddItemsParams<T>): MutationMultiExecution<TableRow<T>>
  updateItem(partitionKey: K, params: UpdateItemParams<T, TableRow<T>>): MutationSingleExecution<TableRow<T>>
  updateItems(partitionKey: K, params: UpdateItemsParams<T, TableRow<T>>): MutationMultiExecution<TableRow<T>>
}

/**
 * Type for an entity instance for a specific table
 * @deprecated Use IEntity<T> instead
 */
export type EntityType<T extends TableNames> = IEntity<T>
