/**
 * PartitionedViewEntity - Read-only entity for partitioned database views
 *
 * Use this for querying database views with partition key requirements.
 * Views are read-only in Supabase, so only getItem and getItems operations are available.
 * All queries require a partition key for multi-tenant isolation.
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
 * // Create a partitioned view entity
 * const UserStatsView = PartitionedViewEntity<"user_stats_view", TenantId, Database>(
 *   client, "user_stats_view", { partitionField: "tenant_id" }
 * )
 *
 * // All queries require the partition key
 * const stats = await UserStatsView.getItems(tenantId, { where: { active: true } }).many()
 * const stat = await UserStatsView.getItem(tenantId, { id: "123" }).one()
 * ```
 */

import type { Database, DatabaseSchema, SchemaNames, SupabaseClientType, ViewNames } from "@/types"

import { makePartitionedViewGetItem, makePartitionedViewGetItems } from "./core"
import type { IPartitionedViewEntity, PartitionedViewEntityConfig, PartitionKey } from "./types"

/**
 * Creates a read-only partitioned entity interface for querying database views.
 *
 * @param client The Supabase client instance to use for queries.
 * @param name The name of the view to query.
 * @param config Configuration including partition field.
 * @returns An object with read-only methods for querying the partitioned view.
 *
 * @typeParam V - The view name type
 * @typeParam K - The partition key type (string or branded type)
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 * @typeParam S - The schema name (defaults to "public")
 *
 * @example
 * ```typescript
 * // Using default public schema
 * const TenantStatsView = PartitionedViewEntity<"tenant_stats_view", TenantId>(
 *   client, "tenant_stats_view", { partitionField: "tenant_id" }
 * )
 *
 * // Using a custom schema
 * const UserActivityView = PartitionedViewEntity<"user_activity_view", UserId, Database, "analytics">(
 *   client, "user_activity_view", { partitionField: "user_id", schema: "analytics" }
 * )
 * ```
 */
export const PartitionedViewEntity = <
  V extends ViewNames<DB, S>,
  K extends PartitionKey = string,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(
  client: SupabaseClientType<DB>,
  name: V,
  config: PartitionedViewEntityConfig,
): IPartitionedViewEntity<V, K, DB, S> => {
  const { partitionField, schema } = config

  return {
    /**
     * Retrieve a single item from the view by ID within a partition.
     * @param partitionKey The partition key value (e.g., tenantId)
     * @param params Query parameters including id, where conditions, and is conditions
     * @returns A chainable query that can be executed with .one(), .many(), or .first()
     */
    getItem: makePartitionedViewGetItem<V, K, DB, S>(client, name, partitionField, schema),

    /**
     * Get a list of items from the view within a partition.
     * @param partitionKey The partition key value (e.g., tenantId)
     * @param params Optional query parameters including where, is, wherein, and order
     * @returns A chainable query that can be executed with .one(), .many(), or .first()
     */
    getItems: makePartitionedViewGetItems<V, K, DB, S>(client, name, partitionField, schema),
  }
}
