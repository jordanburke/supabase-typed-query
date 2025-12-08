/**
 * Entity - Standard entity without partition
 *
 * Use this for global/shared data that doesn't require partition-based isolation.
 * For multi-tenant data, use PartitionedEntity instead.
 *
 * @example
 * ```typescript
 * // Create a global entity
 * const TenantEntity = Entity<"tenants">(client, "tenants", {
 *   softDelete: true
 * })
 *
 * // Query without partition key
 * const tenants = await TenantEntity.getItems({ where: { status: "active" } }).many()
 * const tenant = await TenantEntity.getItem({ id: "123" }).one()
 * ```
 */

import type { Database, DatabaseSchema, SchemaNames, SupabaseClientType, TableNames } from "@/types"

import {
  getSoftDeleteMode,
  makeAddItems,
  makeDeleteItem,
  makeDeleteItems,
  makeGetItem,
  makeGetItems,
  makeUpdateItem,
  makeUpdateItems,
  makeUpsertItems,
} from "./core"
import type { EntityConfig, IEntity } from "./types"

// Re-export types for backwards compatibility
export type {
  AddItemsParams,
  DeleteItemParams,
  DeleteItemsParams,
  EntityConfig,
  EntityType,
  GetItemParams,
  GetItemsParams,
  IdParam,
  IEntity,
  IsParams,
  MutationMultiExecution,
  MutationSingleExecution,
  OrderParams,
  TypedRecord,
  UpdateItemParams,
  UpdateItemsParams,
  UpsertItemsParams,
  WhereinParams,
  WhereParams,
} from "./types"
export { MultiMutationQuery, SingleMutationQuery } from "./types"

/**
 * Creates an entity interface with methods for interacting with the given table.
 *
 * @param client The Supabase client instance to use for queries.
 * @param name The name of the table to interact with.
 * @param config Configuration for entity behavior.
 * @returns An object with methods for interacting with the table.
 *
 * @typeParam T - The table name type
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 * @typeParam S - The schema name (defaults to "public")
 *
 * @example
 * ```typescript
 * // Using default public schema
 * const Users = Entity<"users">(client, "users", { softDelete: false })
 *
 * // Using a custom schema
 * const Tokens = Entity<"provider_tokens", Database, "agent_todo">(
 *   client, "provider_tokens", { softDelete: false }
 * )
 * ```
 */
export const Entity = <
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(
  client: SupabaseClientType<DB>,
  name: T,
  config: EntityConfig,
): IEntity<T, DB, S> => {
  const softDeleteMode = getSoftDeleteMode(config.softDelete)
  const { schema } = config

  return {
    /**
     * Retrieve a single item from the table by ID.
     * @param params Query parameters including id, where conditions, and is conditions
     * @returns A chainable query that can be executed with .one(), .many(), or .first()
     */
    getItem: makeGetItem<T, DB, S>(client, name, softDeleteMode, schema),

    /**
     * Get a list of items from the table filtered by conditions.
     * @param params Optional query parameters including where, is, wherein, and order
     * @returns A chainable query that can be executed with .one(), .many(), or .first()
     */
    getItems: makeGetItems<T, DB, S>(client, name, softDeleteMode, schema),

    /**
     * Adds multiple items to the table.
     * @param params Parameters including items array
     * @returns A mutation query with OrThrow methods
     */
    addItems: makeAddItems<T, DB, S>(client, name, schema),

    /**
     * Update a single item in the table.
     * @param params Update parameters including id, item data, and optional filters
     * @returns A mutation query with OrThrow methods
     */
    updateItem: makeUpdateItem<T, DB, S>(client, name, schema),

    /**
     * Update multiple items in the table.
     * @param params Update parameters including items array, identity, and optional filters
     * @returns A mutation query with OrThrow methods
     */
    updateItems: makeUpdateItems<T, DB, S>(client, name, schema),

    /**
     * Upsert multiple items with different data per row.
     * @param params Upsert parameters including items array and identity columns
     * @returns A mutation query with OrThrow methods
     */
    upsertItems: makeUpsertItems<T, DB, S>(client, name, schema),

    /**
     * Delete a single item from the table.
     * When softDelete is true, sets the deleted timestamp instead of hard deleting.
     * @param params Delete parameters including where conditions
     * @returns A mutation query with OrThrow methods, returns deleted row
     */
    deleteItem: makeDeleteItem<T, DB, S>(client, name, config.softDelete, schema),

    /**
     * Delete multiple items from the table.
     * When softDelete is true, sets the deleted timestamp instead of hard deleting.
     * @param params Delete parameters including where conditions
     * @returns A mutation query with OrThrow methods, returns deleted rows
     */
    deleteItems: makeDeleteItems<T, DB, S>(client, name, config.softDelete, schema),
  }
}
