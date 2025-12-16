/**
 * RPC (Remote Procedure Call) support for Supabase stored procedures/functions
 *
 * Provides type-safe invocation of PostgreSQL functions defined in the database.
 *
 * @example
 * ```typescript
 * // Call a function that returns a single value
 * const stats = await rpc(client, "get_user_stats", { user_id: "123" }).one()
 *
 * // Call a function that returns multiple rows
 * const results = await rpc(client, "search_products", { query: "laptop" }).many()
 *
 * // With custom schema
 * const data = await rpc(client, "analytics_query", { period: "week" }, { schema: "analytics" }).many()
 * ```
 */

import type {
  Database,
  DatabaseSchema,
  FunctionArgs,
  FunctionNames,
  FunctionReturns,
  SchemaNames,
  SupabaseClientType,
} from "@/types"
import { toError } from "@/utils/errors"

import type { IOTask as Task } from "functype"
import { IO, List, Option } from "functype"

// =============================================================================
// RPC Execution Types
// =============================================================================

/**
 * Options for RPC execution
 */
export type RpcOptions = {
  /** Database schema to query (defaults to "public") */
  schema?: string
  /** Count option for the query */
  count?: "exact" | "planned" | "estimated"
}

/**
 * Single execution interface for RPC calls
 */
export type RpcSingleExecution<T> = {
  /**
   * Execute and return Task<Error, Option<T>>
   * Returns None if no result, Some(value) if result exists
   * Call .run() or .runOrThrow() to execute
   */
  one: () => Task<Error, Option<T>>

  /**
   * Execute and return T directly, throwing on error or no result
   */
  oneOrThrow: () => Promise<T>
}

/**
 * Multi execution interface for RPC calls
 */
export type RpcMultiExecution<T> = {
  /**
   * Execute and return Task<Error, List<T>>
   * Returns empty List if no results
   * Call .run() or .runOrThrow() to execute
   */
  many: () => Task<Error, List<T>>

  /**
   * Execute and return List<T> directly, throwing on error
   */
  manyOrThrow: () => Promise<List<T>>
}

/**
 * Combined RPC query execution interface
 * Provides both single and multi-result execution methods
 */
export type RpcExecution<T> = RpcSingleExecution<T> & RpcMultiExecution<T>

// =============================================================================
// RPC Implementation
// =============================================================================

/**
 * Creates an RPC query for invoking a PostgreSQL function.
 *
 * This function provides type-safe invocation of stored procedures/functions
 * defined in your Supabase database. Return types are inferred from your
 * generated Database types.
 *
 * @template F - The function name (must exist in database schema)
 * @template DB - The database schema type
 * @template S - The schema name (defaults to "public")
 * @param client - The Supabase client instance
 * @param functionName - The name of the PostgreSQL function to call
 * @param args - Arguments to pass to the function (type-safe based on function definition)
 * @param options - Optional configuration (schema, count)
 * @returns An RpcExecution object with one(), oneOrThrow(), many(), manyOrThrow() methods
 *
 * @example
 * ```typescript
 * // Function returning a single object
 * const userStats = await rpc(client, "get_user_stats", { user_id: "123" }).one()
 * if (userStats.isOk()) {
 *   const stats = userStats.orThrow()
 *   if (stats.isSome()) {
 *     console.log(stats.get())
 *   }
 * }
 *
 * // Function returning multiple rows
 * const products = await rpc(client, "search_products", { query: "laptop", limit: 10 }).many()
 * products.forEach(p => console.log(p.name))
 *
 * // Using OrThrow variants
 * const stats = await rpc(client, "get_user_stats", { user_id: "123" }).oneOrThrow()
 * const results = await rpc(client, "search_all").manyOrThrow()
 *
 * // Using custom schema
 * const result = await rpc<"cleanup_data", Database, "agent_gate">(client, "cleanup_data").one()
 * ```
 */
export const rpc = <
  F extends FunctionNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(
  client: SupabaseClientType<DB>,
  functionName: F,
  args?: FunctionArgs<F, DB, S>,
  options?: RpcOptions,
): RpcExecution<FunctionReturns<F, DB, S>> => {
  type ReturnType = FunctionReturns<F, DB, S>

  const executeRpc = (): Promise<{ data: unknown; error: unknown }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any).rpc(functionName, args ?? {}, {
      count: options?.count,
    })
  }

  const one = (): Task<Error, Option<ReturnType>> =>
    IO.tryAsync<Option<ReturnType>, Error>(async () => {
      const { data, error } = await executeRpc()
      if (error) throw toError(error)

      // Handle null/undefined data
      if (data === null || data === undefined) {
        return Option.none<ReturnType>()
      }

      // Handle array data - return first element
      if (Array.isArray(data)) {
        if (data.length === 0) {
          return Option.none<ReturnType>()
        }
        return Option(data[0] as ReturnType)
      }

      return Option(data as ReturnType)
    }, toError)

  const oneOrThrow = async (): Promise<ReturnType> => {
    const option = await one().runOrThrow()
    return option.fold(
      () => {
        throw new Error("RPC call returned no result")
      },
      (value) => value,
    )
  }

  const many = (): Task<Error, List<ReturnType>> =>
    IO.tryAsync<List<ReturnType>, Error>(async () => {
      const { data, error } = await executeRpc()
      if (error) throw toError(error)

      // Handle null/undefined data
      if (data === null || data === undefined) {
        return List<ReturnType>([])
      }

      // Handle array data
      if (Array.isArray(data)) {
        return List(data as ReturnType[])
      }

      // Single value - wrap in list
      return List([data as ReturnType])
    }, toError)

  const manyOrThrow = async (): Promise<List<ReturnType>> => {
    return many().runOrThrow()
  }

  return {
    one,
    oneOrThrow,
    many,
    manyOrThrow,
  }
}
