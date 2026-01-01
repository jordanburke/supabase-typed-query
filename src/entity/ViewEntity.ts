/**
 * ViewEntity - Read-only entity for database views
 *
 * Use this for querying database views. Views are read-only in Supabase,
 * so only getItem and getItems operations are available.
 *
 * @example
 * ```typescript
 * // Create a view entity
 * const AuthUsersView = ViewEntity<"auth_users_view", Database, "agent_gate">(
 *   client, "auth_users_view"
 * )
 *
 * // Query the view
 * const users = await AuthUsersView.getItems({ where: { status: "active" } }).many()
 * const user = await AuthUsersView.getItem({ id: "123" }).one()
 * ```
 */

import type { Database, DatabaseSchema, SchemaNames, SupabaseClientType, ViewNames } from "@/types"

import { makeViewGetItem, makeViewGetItems } from "./core"
import type { IViewEntity, ViewEntityConfig } from "./types"

/**
 * Creates a read-only entity interface for querying database views.
 *
 * @param client The Supabase client instance to use for queries.
 * @param name The name of the view to query.
 * @param config Optional configuration for the view entity.
 * @returns An object with read-only methods for querying the view.
 *
 * @typeParam V - The view name type
 * @typeParam DB - The database schema type (defaults to placeholder Database)
 * @typeParam S - The schema name (defaults to "public")
 *
 * @example
 * ```typescript
 * // Using default public schema
 * const ActiveUsersView = ViewEntity<"active_users_view">(client, "active_users_view")
 *
 * // Using a custom schema
 * const AuthUsersView = ViewEntity<"auth_users_view", Database, "agent_gate">(
 *   client, "auth_users_view", { schema: "agent_gate" }
 * )
 * ```
 */
export const ViewEntity = <
  V extends ViewNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(
  client: SupabaseClientType<DB>,
  name: V,
  config?: ViewEntityConfig,
): IViewEntity<V, DB, S> => {
  const schema = config?.schema

  return {
    /**
     * Retrieve a single item from the view by ID.
     * @param params Query parameters including id, where conditions, and is conditions
     * @returns A chainable query that can be executed with .one(), .many(), or .first()
     */
    getItem: makeViewGetItem<V, DB, S>(client, name, schema),

    /**
     * Get a list of items from the view filtered by conditions.
     * @param params Optional query parameters including where, is, wherein, and order
     * @returns A chainable query that can be executed with .one(), .many(), or .first()
     */
    getItems: makeViewGetItems<V, DB, S>(client, name, schema),
  }
}
