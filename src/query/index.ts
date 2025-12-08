import type {
  Database,
  DatabaseSchema,
  EmptyObject,
  SupabaseClientType,
  TableInsert,
  TableNames,
  TableRow,
  TableUpdate,
} from "@/types"
import { toError } from "@/utils/errors"

import type { FPromise, TaskOutcome } from "functype"
import { Err, List, Ok } from "functype"

import type { EntityWhereConditions, Query, WhereConditions } from "./Query"
import { createQuery } from "./QueryBuilder"

// Re-export query types
export type {
  ComparisonOperators,
  EntityQuery,
  EntityWhereConditions,
  ExecutableQuery,
  IsConditions,
  MappedQuery,
  MultiExecution,
  Query,
  QueryBuilderConfig,
  QueryCondition,
  QueryIsParams,
  QueryOrderParams,
  QueryWhereinParams,
  QueryWhereParams,
  SingleExecution,
  SoftDeleteMode,
  WhereConditions,
} from "./Query"

// Re-export type guards
export { isMappedQuery, isQuery } from "./Query"

// Re-export RPC types and function
export type { RpcExecution, RpcMultiExecution, RpcOptions, RpcSingleExecution } from "./rpc"
export { rpc } from "./rpc"

// Local type for IS conditions
type IsConditionsLocal<T extends object = EmptyObject> = Partial<Record<keyof T, null | boolean>>

// Helper to wrap async operations with error handling
const wrapAsync = <T>(fn: () => Promise<TaskOutcome<T>>): FPromise<TaskOutcome<T>> => {
  return fn() as unknown as FPromise<TaskOutcome<T>>
}

/**
 * Retrieves a single entity from the specified table.
 * @template T - The table name
 * @template DB - The database schema type
 * @param client - The Supabase client instance
 * @param table - The table to query
 * @param where - Conditions to filter by
 * @param is - IS conditions to filter by
 * @param schema - Database schema to query (defaults to "public")
 * @returns A promise resolving to the entity if found
 */
export const getEntity = <T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  table: T,
  where: EntityWhereConditions<TableRow<T, DB>>,
  is?: IsConditionsLocal<TableRow<T, DB>>,
  schema?: string,
): FPromise<TaskOutcome<TableRow<T, DB>>> =>
  wrapAsync(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tableQuery = schema ? client.schema(schema).from(table) : client.from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseQuery = (tableQuery as any).select("*").match(where)

      const queryWithIs = is
        ? List(Object.entries(is)).foldLeft(baseQuery)((query, [column, value]) =>
            query.is(column as keyof TableRow<T, DB> & string, value as boolean | null),
          )
        : baseQuery

      const { data, error } = await queryWithIs.single()

      if (error) {
        return Err<TableRow<T, DB>>(toError(error))
      }

      return Ok(data as TableRow<T, DB>)
    } catch (error) {
      return Err<TableRow<T, DB>>(toError(error))
    }
  })

/**
 * Retrieves multiple entities from the specified table.
 * @template T - The table name
 * @template DB - The database schema type
 * @param client - The Supabase client instance
 * @param table - The table to query
 * @param where - Conditions to filter by
 * @param is - IS conditions to filter by
 * @param wherein - WHERE IN conditions to filter by
 * @param order - Optional ordering parameters
 * @param schema - Database schema to query (defaults to "public")
 * @returns A promise resolving to the entities if found
 */
export const getEntities = <T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  table: T,
  where: EntityWhereConditions<TableRow<T, DB>> = {},
  is?: IsConditionsLocal<TableRow<T, DB>>,
  wherein?: Partial<Record<keyof TableRow<T, DB>, unknown[]>>,
  order: [keyof TableRow<T, DB> & string, { ascending?: boolean; nullsFirst?: boolean }] = [
    "id" as keyof TableRow<T, DB> & string,
    { ascending: true },
  ],
  schema?: string,
): FPromise<TaskOutcome<List<TableRow<T, DB>>>> =>
  wrapAsync(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tableQuery = schema ? client.schema(schema).from(table) : client.from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseQuery = (tableQuery as any).select("*").match(where)

      const queryWithIn = wherein
        ? List(Object.entries(wherein)).foldLeft(baseQuery)((query, [column, values]) =>
            query.in(column, values as never),
          )
        : baseQuery

      const queryWithIs = is
        ? List(Object.entries(is)).foldLeft(queryWithIn)((query, [column, value]) =>
            query.is(column as keyof TableRow<T, DB> & string, value as boolean | null),
          )
        : queryWithIn

      const queryOrderBy = queryWithIs.order(order[0], order[1])

      const { data, error } = await queryOrderBy

      if (error) {
        return Err<List<TableRow<T, DB>>>(toError(error))
      }

      return Ok(List(data as TableRow<T, DB>[]))
    } catch (error) {
      return Err<List<TableRow<T, DB>>>(toError(error))
    }
  })

/**
 * Adds multiple entities to the specified table.
 * @template T - The table name
 * @template DB - The database schema type
 * @param client - The Supabase client instance
 * @param table - The table to insert into
 * @param entities - The entities to add
 * @param schema - Database schema to query (defaults to "public")
 * @returns A promise resolving to the added entities
 */
export const addEntities = <T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  table: T,
  entities: TableInsert<T, DB>[],
  schema?: string,
): FPromise<TaskOutcome<List<TableRow<T, DB>>>> =>
  wrapAsync(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tableQuery = schema ? client.schema(schema).from(table) : client.from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (tableQuery as any).insert(entities as never).select()

      if (error) {
        return Err<List<TableRow<T, DB>>>(toError(error))
      }

      return Ok(List(data as unknown as TableRow<T, DB>[]))
    } catch (error) {
      return Err<List<TableRow<T, DB>>>(toError(error))
    }
  })

/**
 * Updates a single entity in the specified table.
 * @template T - The table name
 * @template DB - The database schema type
 * @param client - The Supabase client instance
 * @param table - The table to update
 * @param entities - The entity data to update
 * @param where - Conditions to filter by
 * @param is - IS conditions to filter by
 * @param wherein - WHERE IN conditions to filter by
 * @param schema - Database schema to query (defaults to "public")
 * @returns A promise resolving to the updated entity
 */
export const updateEntity = <T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  table: T,
  entities: TableUpdate<T, DB>,
  where: EntityWhereConditions<TableRow<T, DB>>,
  is?: IsConditionsLocal<TableRow<T, DB>>,
  wherein?: Partial<Record<keyof TableRow<T, DB>, unknown[]>>,
  schema?: string,
): FPromise<TaskOutcome<TableRow<T, DB>>> =>
  wrapAsync(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tableQuery = schema ? client.schema(schema).from(table) : client.from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseQuery = (tableQuery as any).update(entities as never).match(where)

      const queryWithIn = wherein
        ? List(Object.entries(wherein)).foldLeft(baseQuery)((query, [column, values]) =>
            query.in(column, values as never),
          )
        : baseQuery

      const queryWithIs = is
        ? List(Object.entries(is)).foldLeft(queryWithIn)((query, [column, value]) =>
            query.is(column as keyof TableRow<T, DB> & string, value as boolean | null),
          )
        : queryWithIn

      const { data, error } = await queryWithIs.select().single()

      if (error) {
        return Err<TableRow<T, DB>>(toError(error))
      }

      return Ok(data as TableRow<T, DB>)
    } catch (error) {
      return Err<TableRow<T, DB>>(toError(error))
    }
  })

/**
 * Upserts multiple entities in the specified table (insert or update on conflict).
 * Uses Supabase's upsert() under the hood with onConflict resolution.
 * @template T - The table name
 * @template DB - The database schema type
 * @param client - The Supabase client instance
 * @param table - The table to upsert into
 * @param entities - The entities to upsert
 * @param identity - The column(s) to use for conflict resolution (default: "id")
 * @param where - Additional conditions to filter by
 * @param is - IS conditions to filter by
 * @param wherein - WHERE IN conditions to filter by
 * @param schema - Database schema to query (defaults to "public")
 * @returns A promise resolving to the upserted entities
 */
export const upsertEntities = <T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  table: T,
  entities: TableUpdate<T, DB>[],
  identity: (keyof TableRow<T, DB> & string) | (keyof TableRow<T, DB> & string)[] = "id" as keyof TableRow<T, DB> &
    string,
  where?: EntityWhereConditions<TableRow<T, DB>>,
  is?: IsConditionsLocal<TableRow<T, DB>>,
  wherein?: Partial<Record<keyof TableRow<T, DB>, unknown[]>>,
  schema?: string,
): FPromise<TaskOutcome<List<TableRow<T, DB>>>> =>
  wrapAsync(async () => {
    try {
      const onConflict = Array.isArray(identity) ? identity.join(",") : identity

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tableQuery = schema ? client.schema(schema).from(table) : client.from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseQuery = (tableQuery as any).upsert(entities as never, { onConflict }).match(where ?? {})

      const queryWithIn = wherein
        ? List(Object.entries(wherein)).foldLeft(baseQuery)((query, [column, values]) =>
            query.in(column, values as never),
          )
        : baseQuery

      const queryWithIs = is
        ? List(Object.entries(is)).foldLeft(queryWithIn)((query, [column, value]) =>
            query.is(column as keyof TableRow<T, DB> & string, value as boolean | null),
          )
        : queryWithIn

      const { data, error } = await queryWithIs.select()

      if (error) {
        return Err<List<TableRow<T, DB>>>(toError(error))
      }

      return Ok(List(data as TableRow<T, DB>[]))
    } catch (error) {
      return Err<List<TableRow<T, DB>>>(toError(error))
    }
  })

/**
 * Deletes a single entity from the specified table.
 * @template T - The table name
 * @template DB - The database schema type
 * @param client - The Supabase client instance
 * @param table - The table to delete from
 * @param where - Conditions to filter by
 * @param is - IS conditions to filter by
 * @param wherein - WHERE IN conditions to filter by
 * @param schema - Database schema to query (defaults to "public")
 * @returns A promise resolving to the deleted entity
 */
export const deleteEntity = <T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  table: T,
  where: EntityWhereConditions<TableRow<T, DB>>,
  is?: IsConditionsLocal<TableRow<T, DB>>,
  wherein?: Partial<Record<keyof TableRow<T, DB>, unknown[]>>,
  schema?: string,
): FPromise<TaskOutcome<TableRow<T, DB>>> =>
  wrapAsync(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tableQuery = schema ? client.schema(schema).from(table) : client.from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseQuery = (tableQuery as any).delete().match(where)

      const queryWithIn = wherein
        ? List(Object.entries(wherein)).foldLeft(baseQuery)((query, [column, values]) =>
            query.in(column, values as never),
          )
        : baseQuery

      const queryWithIs = is
        ? List(Object.entries(is)).foldLeft(queryWithIn)((query, [column, value]) =>
            query.is(column as keyof TableRow<T, DB> & string, value as boolean | null),
          )
        : queryWithIn

      const { data, error } = await queryWithIs.select().single()

      if (error) {
        return Err<TableRow<T, DB>>(toError(error))
      }

      return Ok(data as TableRow<T, DB>)
    } catch (error) {
      return Err<TableRow<T, DB>>(toError(error))
    }
  })

/**
 * Deletes multiple entities from the specified table.
 * @template T - The table name
 * @template DB - The database schema type
 * @param client - The Supabase client instance
 * @param table - The table to delete from
 * @param where - Conditions to filter by
 * @param is - IS conditions to filter by
 * @param wherein - WHERE IN conditions to filter by
 * @param schema - Database schema to query (defaults to "public")
 * @returns A promise resolving to the deleted entities
 */
export const deleteEntities = <T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  table: T,
  where: EntityWhereConditions<TableRow<T, DB>>,
  is?: IsConditionsLocal<TableRow<T, DB>>,
  wherein?: Partial<Record<keyof TableRow<T, DB>, unknown[]>>,
  schema?: string,
): FPromise<TaskOutcome<List<TableRow<T, DB>>>> =>
  wrapAsync(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tableQuery = schema ? client.schema(schema).from(table) : client.from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseQuery = (tableQuery as any).delete().match(where)

      const queryWithIn = wherein
        ? List(Object.entries(wherein)).foldLeft(baseQuery)((query, [column, values]) =>
            query.in(column, values as never),
          )
        : baseQuery

      const queryWithIs = is
        ? List(Object.entries(is)).foldLeft(queryWithIn)((query, [column, value]) =>
            query.is(column as keyof TableRow<T, DB> & string, value as boolean | null),
          )
        : queryWithIn

      const { data, error } = await queryWithIs.select()

      if (error) {
        return Err<List<TableRow<T, DB>>>(toError(error))
      }

      return Ok(List(data as TableRow<T, DB>[]))
    } catch (error) {
      return Err<List<TableRow<T, DB>>>(toError(error))
    }
  })

/**
 * Soft deletes a single entity by setting the deleted timestamp.
 * @template T - The table name
 * @template DB - The database schema type
 * @param client - The Supabase client instance
 * @param table - The table to soft delete from
 * @param where - Conditions to filter by
 * @param is - IS conditions to filter by
 * @param wherein - WHERE IN conditions to filter by
 * @param schema - Database schema to query (defaults to "public")
 * @returns A promise resolving to the soft deleted entity
 */
export const softDeleteEntity = <T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  table: T,
  where: EntityWhereConditions<TableRow<T, DB>>,
  is?: IsConditionsLocal<TableRow<T, DB>>,
  wherein?: Partial<Record<keyof TableRow<T, DB>, unknown[]>>,
  schema?: string,
): FPromise<TaskOutcome<TableRow<T, DB>>> =>
  wrapAsync(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tableQuery = schema ? client.schema(schema).from(table) : client.from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseQuery = (tableQuery as any).update({ deleted: new Date().toISOString() } as never).match(where)

      const queryWithIn = wherein
        ? List(Object.entries(wherein)).foldLeft(baseQuery)((query, [column, values]) =>
            query.in(column, values as never),
          )
        : baseQuery

      const queryWithIs = is
        ? List(Object.entries(is)).foldLeft(queryWithIn)((query, [column, value]) =>
            query.is(column as keyof TableRow<T, DB> & string, value as boolean | null),
          )
        : queryWithIn

      const { data, error } = await queryWithIs.select().single()

      if (error) {
        return Err<TableRow<T, DB>>(toError(error))
      }

      return Ok(data as TableRow<T, DB>)
    } catch (error) {
      return Err<TableRow<T, DB>>(toError(error))
    }
  })

/**
 * Soft deletes multiple entities by setting the deleted timestamp.
 * @template T - The table name
 * @template DB - The database schema type
 * @param client - The Supabase client instance
 * @param table - The table to soft delete from
 * @param where - Conditions to filter by
 * @param is - IS conditions to filter by
 * @param wherein - WHERE IN conditions to filter by
 * @param schema - Database schema to query (defaults to "public")
 * @returns A promise resolving to the soft deleted entities
 */
export const softDeleteEntities = <T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  table: T,
  where: EntityWhereConditions<TableRow<T, DB>>,
  is?: IsConditionsLocal<TableRow<T, DB>>,
  wherein?: Partial<Record<keyof TableRow<T, DB>, unknown[]>>,
  schema?: string,
): FPromise<TaskOutcome<List<TableRow<T, DB>>>> =>
  wrapAsync(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tableQuery = schema ? client.schema(schema).from(table) : client.from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseQuery = (tableQuery as any).update({ deleted: new Date().toISOString() } as never).match(where)

      const queryWithIn = wherein
        ? List(Object.entries(wherein)).foldLeft(baseQuery)((query, [column, values]) =>
            query.in(column, values as never),
          )
        : baseQuery

      const queryWithIs = is
        ? List(Object.entries(is)).foldLeft(queryWithIn)((query, [column, value]) =>
            query.is(column as keyof TableRow<T, DB> & string, value as boolean | null),
          )
        : queryWithIn

      const { data, error } = await queryWithIs.select()

      if (error) {
        return Err<List<TableRow<T, DB>>>(toError(error))
      }

      return Ok(List(data as TableRow<T, DB>[]))
    } catch (error) {
      return Err<List<TableRow<T, DB>>>(toError(error))
    }
  })

/**
 * Creates a new Query for the specified table with initial conditions.
 * This is the new Query-based API that supports OR chaining and functional operations.
 *
 * @template T - The table name
 * @template DB - The database schema type
 * @param client - The Supabase client instance
 * @param table - The table to query
 * @param where - Initial WHERE conditions to filter by
 * @param is - Initial IS conditions to filter by
 * @param wherein - Initial WHERE IN conditions to filter by
 * @param order - Optional ordering parameters
 * @param schema - Database schema to query (defaults to "public")
 * @returns A Query instance that supports chaining and lazy evaluation
 *
 * @example
 * // Simple query
 * const user = await query(client, "users", { id: "123" }).one()
 *
 * @example
 * // Query with OR logic
 * const users = await query(client, "users", { role: "admin" })
 *   .or({ role: "moderator" })
 *   .many()
 *
 * @example
 * // Query with functional operations
 * const names = await query(client, "users", { active: true })
 *   .map(user => user.name)
 *   .filter(name => name.startsWith('A'))
 *   .many()
 *
 * @example
 * // Query with custom schema
 * const items = await query(client, "items", { active: true }, undefined, undefined, undefined, "inventory").many()
 */
export const query = <T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  table: T,
  where: WhereConditions<TableRow<T, DB>> = {},
  is?: IsConditionsLocal<TableRow<T, DB>>,
  wherein?: Partial<Record<keyof TableRow<T, DB>, unknown[]>>,
  order?: [keyof TableRow<T, DB> & string, { ascending?: boolean; nullsFirst?: boolean }],
  schema?: string,
): Query<TableRow<T, DB>> => {
  return createQuery<T, DB>(client, table, where, is, wherein, order, undefined, schema)
}
