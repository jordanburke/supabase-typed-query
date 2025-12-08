/**
 * PartitionedEntity - Entity with partition key required on every call
 *
 * Use this for multi-tenant or partitioned data where every query must be scoped
 * to a specific partition (e.g., tenant_id, organization_id, etc.)
 *
 * Supports branded types via functype's Brand/ValidatedBrand for type-safe partition keys.
 *
 * @example
 * ```typescript
 * import { ValidatedBrand } from "functype"
 *
 * // Define a branded partition key type
 * const TenantId = ValidatedBrand("TenantId", isValidUuid)
 * type TenantId = ReturnType<typeof TenantId.of> extends Option<infer T> ? T : never
 *
 * // Create a partitioned entity
 * const UserEntity = PartitionedEntity<"users", TenantId>(client, "users", {
 *   partitionField: "tenant_id",
 *   softDelete: true
 * })
 *
 * // All queries require the partition key
 * const users = await UserEntity.getItems(tenantId, { where: { status: "active" } }).many()
 * const user = await UserEntity.getItem(tenantId, { id: "123" }).one()
 * ```
 */

import type { Database, DatabaseSchema, SchemaNames, SupabaseClientType, TableNames } from "@/types"

import {
  getSoftDeleteMode,
  makeAddItems,
  makePartitionedDeleteItem,
  makePartitionedDeleteItems,
  makePartitionedGetItem,
  makePartitionedGetItems,
  makePartitionedUpdateItem,
  makePartitionedUpdateItems,
  makePartitionedUpsertItems,
} from "./core"
import type { IPartitionedEntity, PartitionedEntityConfig, PartitionKey } from "./types"

/**
 * Creates a partitioned entity interface where all queries require a partition key.
 *
 * @param client The Supabase client instance to use for queries.
 * @param name The name of the table to interact with.
 * @param config Configuration including partition field and soft delete behavior.
 * @returns An object with methods for interacting with the partitioned table.
 *
 * @typeParam T - The table name type
 * @typeParam K - The partition key type (string or branded type)
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 * @typeParam S - The schema name (defaults to "public")
 *
 * @example
 * ```typescript
 * // Using default public schema
 * const UserEntity = PartitionedEntity<"users", TenantId>(client, "users", {
 *   partitionField: "tenant_id",
 *   softDelete: true
 * })
 *
 * // Using a custom schema
 * const TaskEntity = PartitionedEntity<"tasks", TenantId, Database, "agent_todo">(
 *   client, "tasks", { partitionField: "user_id", softDelete: false }
 * )
 * ```
 */
export const PartitionedEntity = <
  T extends TableNames<DB, S>,
  K extends PartitionKey = string,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(
  client: SupabaseClientType<DB>,
  name: T,
  config: PartitionedEntityConfig,
): IPartitionedEntity<T, K, DB, S> => {
  const softDeleteMode = getSoftDeleteMode(config.softDelete)
  const { partitionField, schema } = config

  return {
    /**
     * Retrieve a single item from the table by ID within a partition.
     * @param partitionKey The partition key value (e.g., tenantId)
     * @param params Query parameters including id, where conditions, and is conditions
     * @returns A chainable query that can be executed with .one(), .many(), or .first()
     */
    getItem: makePartitionedGetItem<T, K, DB, S>(client, name, partitionField, softDeleteMode, schema),

    /**
     * Get a list of items from the table within a partition.
     * @param partitionKey The partition key value (e.g., tenantId)
     * @param params Optional query parameters including where, is, wherein, and order
     * @returns A chainable query that can be executed with .one(), .many(), or .first()
     */
    getItems: makePartitionedGetItems<T, K, DB, S>(client, name, partitionField, softDeleteMode, schema),

    /**
     * Adds multiple items to the table.
     * Note: Items should include the partition key value in their data.
     * @param params Parameters including items array
     * @returns A mutation query with OrThrow methods
     */
    addItems: makeAddItems<T, DB, S>(client, name, schema),

    /**
     * Update a single item in the table within a partition.
     * @param partitionKey The partition key value (e.g., tenantId)
     * @param params Update parameters including id, item data, and optional filters
     * @returns A mutation query with OrThrow methods
     */
    updateItem: makePartitionedUpdateItem<T, K, DB, S>(client, name, partitionField, schema),

    /**
     * Update multiple items in the table within a partition.
     * @param partitionKey The partition key value (e.g., tenantId)
     * @param params Update parameters including items array, identity, and optional filters
     * @returns A mutation query with OrThrow methods
     */
    updateItems: makePartitionedUpdateItems<T, K, DB, S>(client, name, partitionField, schema),

    /**
     * Upsert multiple items with different data per row within a partition.
     * Note: Items should include the partition key value in their data.
     * @param partitionKey The partition key value (e.g., tenantId)
     * @param params Upsert parameters including items array and identity columns
     * @returns A mutation query with OrThrow methods
     */
    upsertItems: makePartitionedUpsertItems<T, K, DB, S>(client, name, partitionField, schema),

    /**
     * Delete a single item from the table within a partition.
     * When softDelete is true, sets the deleted timestamp instead of hard deleting.
     * @param partitionKey The partition key value (e.g., tenantId)
     * @param params Delete parameters including where conditions
     * @returns A mutation query with OrThrow methods, returns deleted row
     */
    deleteItem: makePartitionedDeleteItem<T, K, DB, S>(client, name, partitionField, config.softDelete, schema),

    /**
     * Delete multiple items from the table within a partition.
     * When softDelete is true, sets the deleted timestamp instead of hard deleting.
     * @param partitionKey The partition key value (e.g., tenantId)
     * @param params Delete parameters including where conditions
     * @returns A mutation query with OrThrow methods, returns deleted rows
     */
    deleteItems: makePartitionedDeleteItems<T, K, DB, S>(client, name, partitionField, config.softDelete, schema),
  }
}
