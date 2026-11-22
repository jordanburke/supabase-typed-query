import type { Brand, IOTask as Task } from "functype"
import { IO, List, Option } from "functype"

import type { Database, DatabaseSchema, SupabaseClientType, TableNames, TableRow } from "@/types"
import { toError } from "@/utils/errors"

import type { IsConditions, MappedQuery, Query, QueryBuilderConfig, QueryCondition, WhereConditions } from "./Query"

// Simple console logging for open source version
// Suppress logs during tests to avoid stderr noise in test output
const log = {
  error: (msg: string) => process.env.NODE_ENV !== "test" && console.error(`[supabase-typed-query] ${msg}`),
  warn: (msg: string) => process.env.NODE_ENV !== "test" && console.warn(`[supabase-typed-query] ${msg}`),
  info: (msg: string) => process.env.NODE_ENV !== "test" && console.info(`[supabase-typed-query] ${msg}`),
}

// Tables that don't have a deleted field (like version tracking tables)
// Tables that don't have a deleted field - consumers can override this
const TABLES_WITHOUT_DELETED = new Set<string>([])

/**
 * Functional QueryBuilder implementation using closures instead of classes
 */
export const QueryBuilder = <T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  config: QueryBuilderConfig<TableRow<T, DB>>,
): Query<TableRow<T, DB>> => {
  /**
   * Build the Supabase query from accumulated conditions
   */
  const buildSupabaseQuery = () => {
    const { table, conditions, order, limit, offset, schema } = config

    // Start with base query - use schema if provided, otherwise default to public
    const baseQuery = schema ? client.schema(schema).from(table) : client.from(table)

    // Handle multiple conditions with OR logic
    const firstCondition = conditions[0]
    const queryWithConditions =
      conditions.length === 1 && firstCondition
        ? applyCondition(baseQuery, firstCondition)
        : applyOrConditions(baseQuery, conditions)

    // Apply ordering if specified
    const queryWithOrder = order ? queryWithConditions.order(order[0], order[1]) : queryWithConditions

    // Apply pagination
    const finalQuery = (() => {
      if (limit && offset !== undefined) {
        // Use range for offset + limit
        return queryWithOrder.range(offset, offset + limit - 1)
      } else if (limit) {
        // Just limit
        return queryWithOrder.limit(limit)
      } else if (offset !== undefined) {
        // Just offset (need to use a large upper bound)
        return queryWithOrder.range(offset, Number.MAX_SAFE_INTEGER)
      }
      return queryWithOrder
    })()

    return finalQuery
  }

  /**
   * Apply a single condition to the query
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyCondition = (query: any, condition: QueryCondition<TableRow<T, DB>>): any => {
    const { where, is, wherein, gt, gte, lt, lte, neq, like, ilike, not } = condition

    // Process WHERE conditions, extracting operators from the where object
    const processedWhere: Record<string, unknown> = {}
    const extractedOperators: {
      gt?: Record<string, unknown>
      gte?: Record<string, unknown>
      lt?: Record<string, unknown>
      lte?: Record<string, unknown>
      neq?: Record<string, unknown>
      like?: Record<string, string>
      ilike?: Record<string, string>
    } = {}

    // Extract top-level operators from where object (where is always present on QueryCondition)
    const {
      gt: whereGt,
      gte: whereGte,
      lt: whereLt,
      lte: whereLte,
      neq: whereNeq,
      like: whereLike,
      ilike: whereIlike,
      ...rest
    } = where as Record<string, unknown>

    // Store extracted operators
    if (whereGt) extractedOperators.gt = whereGt as Record<string, unknown>
    if (whereGte) extractedOperators.gte = whereGte as Record<string, unknown>
    if (whereLt) extractedOperators.lt = whereLt as Record<string, unknown>
    if (whereLte) extractedOperators.lte = whereLte as Record<string, unknown>
    if (whereNeq) extractedOperators.neq = whereNeq as Record<string, unknown>
    if (whereLike) extractedOperators.like = whereLike as Record<string, string>
    if (whereIlike) extractedOperators.ilike = whereIlike as Record<string, string>

    // Process remaining fields
    Object.entries(rest).forEach(([key, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        // Check if it's an operator object
        const ops = value as Record<string, unknown>
        if (ops.gte !== undefined) {
          extractedOperators.gte = {
            ...extractedOperators.gte,
            [key]: ops.gte,
          }
        }
        if (ops.gt !== undefined) {
          extractedOperators.gt = { ...extractedOperators.gt, [key]: ops.gt }
        }
        if (ops.lte !== undefined) {
          extractedOperators.lte = {
            ...extractedOperators.lte,
            [key]: ops.lte,
          }
        }
        if (ops.lt !== undefined) {
          extractedOperators.lt = { ...extractedOperators.lt, [key]: ops.lt }
        }
        if (ops.neq !== undefined) {
          extractedOperators.neq = {
            ...extractedOperators.neq,
            [key]: ops.neq,
          }
        }
        if (ops.like !== undefined) {
          extractedOperators.like = {
            ...extractedOperators.like,
            [key]: ops.like as string,
          }
        }
        if (ops.ilike !== undefined) {
          extractedOperators.ilike = {
            ...extractedOperators.ilike,
            [key]: ops.ilike as string,
          }
        }
        if (ops.in !== undefined) {
          // Handle IN operator
          if (!wherein) {
            const cond = condition as unknown as Record<string, unknown>
            cond.wherein = {}
          }
          const whereinObj = condition.wherein as Record<string, unknown>
          whereinObj[key] = ops.in
        }
        if (ops.is !== undefined) {
          // Handle IS operator
          if (!is) {
            const cond = condition as unknown as Record<string, unknown>
            cond.is = {}
          }
          const isObj = condition.is as Record<string, unknown>
          isObj[key] = ops.is
        }
        // If no operators found, treat as regular value
        if (!ops.gte && !ops.gt && !ops.lte && !ops.lt && !ops.neq && !ops.like && !ops.ilike && !ops.in && !ops.is) {
          processedWhere[key] = value
        }
      } else {
        // Regular value
        processedWhere[key] = value
      }
    })

    // Merge extracted operators with explicitly passed operators
    const mergedGt = { ...gt, ...extractedOperators.gt }
    const mergedGte = { ...gte, ...extractedOperators.gte }
    const mergedLt = { ...lt, ...extractedOperators.lt }
    const mergedLte = { ...lte, ...extractedOperators.lte }
    const mergedNeq = { ...neq, ...extractedOperators.neq }
    const mergedLike = { ...like, ...extractedOperators.like }
    const mergedIlike = { ...ilike, ...extractedOperators.ilike }

    // Apply WHERE conditions
    const baseQuery = query.select("*").match(processedWhere)

    // Apply soft delete filter based on softDeleteMode
    const queryWithSoftDelete = (() => {
      if (TABLES_WITHOUT_DELETED.has(config.table)) {
        return baseQuery
      }
      if (config.softDeleteMode === "exclude") {
        return baseQuery.is("deleted", null)
      }
      if (config.softDeleteMode === "only") {
        return baseQuery.not("deleted", "is", null)
      }
      // Default: "include" - no filter
      return baseQuery
    })()

    // Apply WHERE IN conditions
    const queryWithWhereIn = wherein
      ? List(Object.entries(wherein)).foldLeft(queryWithSoftDelete)((q, [column, values]) =>
          q.in(column, values as never),
        )
      : queryWithSoftDelete

    // Apply IS conditions
    const queryWithIs = is
      ? List(Object.entries(is)).foldLeft(queryWithWhereIn)((q, [column, value]) =>
          q.is(column as keyof TableRow<T, DB> & string, value as boolean | null),
        )
      : queryWithWhereIn

    // Apply comparison operators using merged values
    const queryWithGt =
      Object.keys(mergedGt).length > 0
        ? Object.entries(mergedGt).reduce((q, [key, value]) => q.gt(key, value), queryWithIs)
        : queryWithIs

    const queryWithGte =
      Object.keys(mergedGte).length > 0
        ? Object.entries(mergedGte).reduce((q, [key, value]) => q.gte(key, value), queryWithGt)
        : queryWithGt

    const queryWithLt =
      Object.keys(mergedLt).length > 0
        ? Object.entries(mergedLt).reduce((q, [key, value]) => q.lt(key, value), queryWithGte)
        : queryWithGte

    const queryWithLte =
      Object.keys(mergedLte).length > 0
        ? Object.entries(mergedLte).reduce((q, [key, value]) => q.lte(key, value), queryWithLt)
        : queryWithLt

    const queryWithNeq =
      Object.keys(mergedNeq).length > 0
        ? Object.entries(mergedNeq).reduce((q, [key, value]) => {
            if (value === null) {
              log.warn(`neq: null is deprecated. Use not: { is: { ${key}: null } } for IS NOT NULL`)
              return q.not(key, "is", null)
            }
            return q.neq(key, value)
          }, queryWithLte)
        : queryWithLte

    // Apply pattern matching using merged values
    const queryWithLike =
      Object.keys(mergedLike).length > 0
        ? Object.entries(mergedLike).reduce((q, [key, pattern]) => q.like(key, pattern as string), queryWithNeq)
        : queryWithNeq

    const queryWithIlike =
      Object.keys(mergedIlike).length > 0
        ? Object.entries(mergedIlike).reduce((q, [key, pattern]) => q.ilike(key, pattern as string), queryWithLike)
        : queryWithLike

    // Apply NOT conditions (IS NOT NULL, NOT IN, etc.)
    const queryWithNotIs = not?.is
      ? Object.entries(not.is).reduce((q, [key, value]) => q.not(key, "is", value), queryWithIlike)
      : queryWithIlike

    const queryWithNot = not?.in
      ? Object.entries(not.in).reduce((q, [key, values]) => q.not(key, "in", values as never), queryWithNotIs)
      : queryWithNotIs

    return queryWithNot
  }

  /**
   * Apply multiple conditions with OR logic
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyOrConditions = (query: any, conditions: ReadonlyArray<QueryCondition<TableRow<T, DB>>>): any => {
    // Start with select
    const selectQuery = query.select("*")

    // Apply soft delete filter based on softDeleteMode
    const baseQuery = (() => {
      if (TABLES_WITHOUT_DELETED.has(config.table)) {
        return selectQuery
      }
      if (config.softDeleteMode === "exclude") {
        return selectQuery.is("deleted", null)
      }
      if (config.softDeleteMode === "only") {
        return selectQuery.not("deleted", "is", null)
      }
      // Default: "include" - no filter
      return selectQuery
    })()

    // Conditions common to every OR branch are applied once, outside the OR
    const firstCond = conditions[0]
    const commonConditions = new Map<string, unknown>(
      firstCond
        ? Object.entries(firstCond.where).filter(([key, value]) =>
            conditions.every((condition) => (condition.where as Record<string, unknown>)[key] === value),
          )
        : [],
    )

    // Each branch with the common parts removed
    const varyingConditions: ReadonlyArray<QueryCondition<TableRow<T, DB>>> = conditions.map((condition) => {
      const newWhere = Object.fromEntries(
        Object.entries(condition.where as Record<string, unknown>).filter(([key]) => !commonConditions.has(key)),
      )
      return {
        where: newWhere as WhereConditions<TableRow<T, DB>>,
        is: condition.is,
        wherein: condition.wherein,
        not: condition.not,
      }
    })

    // Apply common conditions first
    const queryWithCommon = Array.from(commonConditions.entries()).reduce((query, [key, value]) => {
      if (value === null) {
        return query.is(key, null)
      } else {
        return query.eq(key, value)
      }
    }, baseQuery)

    // If no varying conditions remain, we're done
    if (varyingConditions.every((condition) => Object.keys(condition.where).length === 0)) {
      return queryWithCommon
    }

    // Build OR conditions from the varying parts only
    const orConditions = varyingConditions
      .map((condition) => {
        // Values are serialized to PostgREST filter strings here, so treat them as unknown: a
        // column value can legitimately be null (IS NULL) at this boundary.
        const entries = (record: object | undefined): ReadonlyArray<[string, unknown]> =>
          record ? Object.entries(record) : []
        const inList = (values: unknown): string | undefined =>
          Array.isArray(values) && values.length > 0 ? values.map((v: unknown) => `"${v}"`).join(",") : undefined

        const parts: ReadonlyArray<string> = [
          // WHERE conditions (only the varying ones)
          ...entries(condition.where).map(([key, value]) =>
            value === null ? `${key}.is.null` : `${key}.eq."${value}"`,
          ),
          // IS conditions
          ...entries(condition.is).map(([key, value]) => (value === null ? `${key}.is.null` : `${key}.is.${value}`)),
          // WHERE IN conditions
          ...entries(condition.wherein).flatMap(([key, values]) => {
            const valueList = inList(values)
            return valueList === undefined ? [] : [`${key}.in.(${valueList})`]
          }),
          // Comparison operators
          ...entries(condition.gt).map(([key, value]) => `${key}.gt.${value}`),
          ...entries(condition.gte).map(([key, value]) => `${key}.gte.${value}`),
          ...entries(condition.lt).map(([key, value]) => `${key}.lt.${value}`),
          ...entries(condition.lte).map(([key, value]) => `${key}.lte.${value}`),
          ...entries(condition.neq).map(([key, value]) => {
            if (value !== null) return `${key}.neq."${value}"`
            log.warn(`neq: null is deprecated. Use not: { is: { ${key}: null } } for IS NOT NULL`)
            return `${key}.not.is.null`
          }),
          // Pattern matching
          ...entries(condition.like).map(([key, pattern]) => `${key}.like."${pattern}"`),
          ...entries(condition.ilike).map(([key, pattern]) => `${key}.ilike."${pattern}"`),
          // NOT conditions (IS NOT NULL, NOT IN)
          ...entries(condition.not?.is).map(([key, value]) =>
            value === null ? `${key}.not.is.null` : `${key}.not.is.${value}`,
          ),
          ...entries(condition.not?.in).flatMap(([key, values]) => {
            const valueList = inList(values)
            return valueList === undefined ? [] : [`${key}.not.in.(${valueList})`]
          }),
        ]

        return parts.join(",")
      })
      .filter((condition) => condition.length > 0)

    // Apply OR conditions if any remain

    const finalQuery = orConditions.length > 0 ? queryWithCommon.or(orConditions.join(",")) : queryWithCommon

    return finalQuery
  }

  type Row = TableRow<T, DB>

  // Return the Query interface implementation
  return {
    /**
     * Add OR condition to the query
     */
    or: (where: WhereConditions<Row>, is?: IsConditions<Row>): Query<Row> => {
      const newConditions = [...config.conditions, { where, is }]
      return QueryBuilder<T, DB>(client, {
        ...config,
        conditions: newConditions,
      })
    },

    /**
     * Filter by branded ID with type safety
     */
    whereId: <ID extends Brand<string, string>>(id: ID): Query<Row> => {
      const newConditions = [
        ...config.conditions,
        {
          where: { id: id as unknown } as unknown as WhereConditions<Row>,
        },
      ]
      return QueryBuilder<T, DB>(client, {
        ...config,
        conditions: newConditions,
      })
    },

    /**
     * Add OR condition with branded ID
     */
    orWhereId: <ID extends Brand<string, string>>(id: ID): Query<Row> => {
      return QueryBuilder<T, DB>(client, config).or({
        id: id as unknown,
      } as unknown as WhereConditions<Row>)
    },

    /**
     * Apply mapping function to query results
     */
    map: <U>(fn: (item: Row) => U): MappedQuery<U> => {
      return createMappedQuery<T, DB, U>(QueryBuilder<T, DB>(client, config), fn)
    },

    /**
     * Apply filter function to query results
     */
    filter: (predicate: (item: Row) => boolean): Query<Row> => {
      return QueryBuilder<T, DB>(client, {
        ...config,
        filterFn: config.filterFn ? (item: Row) => config.filterFn!(item) && predicate(item) : predicate,
      })
    },

    /**
     * Limit the number of results
     */
    limit: (count: number): Query<Row> => {
      return QueryBuilder<T, DB>(client, {
        ...config,
        limit: count,
      })
    },

    /**
     * Offset the results for pagination
     */
    offset: (count: number): Query<Row> => {
      return QueryBuilder<T, DB>(client, {
        ...config,
        offset: count,
      })
    },

    /**
     * Include all records (no soft delete filter)
     */
    includeDeleted: (): Query<Row> => {
      if (config.softDeleteAppliedByDefault && config.softDeleteMode === "include") {
        log.warn(`[${config.table}] includeDeleted() called but already including deleted by default`)
      }
      return QueryBuilder<T, DB>(client, {
        ...config,
        softDeleteMode: "include",
        softDeleteAppliedByDefault: false,
      })
    },

    /**
     * Exclude soft-deleted records (apply deleted IS NULL filter)
     */
    excludeDeleted: (): Query<Row> => {
      if (config.softDeleteAppliedByDefault && config.softDeleteMode === "exclude") {
        log.warn(`[${config.table}] excludeDeleted() called but already excluding deleted by default`)
      }
      return QueryBuilder<T, DB>(client, {
        ...config,
        softDeleteMode: "exclude",
        softDeleteAppliedByDefault: false,
      })
    },

    /**
     * Query only soft-deleted records (apply deleted IS NOT NULL filter)
     */
    onlyDeleted: (): Query<Row> => {
      return QueryBuilder<T, DB>(client, {
        ...config,
        softDeleteMode: "only",
        softDeleteAppliedByDefault: false,
      })
    },

    /**
     * Execute query expecting exactly one result
     * Returns Option.none() for "not found" - this is expected behavior, not an error
     */
    one: (): Task<Error, Option<Row>> => {
      return IO.tryAsync<Option<Row>, Error>(async () => {
        const query = buildSupabaseQuery()
        const { data, error } = await query.single()

        // For .one(), "no rows found" (PGRST116) is not an error - it's just None
        if (error) {
          const isNotFoundError = error.code === "PGRST116" && error.details?.includes("0 rows")
          if (isNotFoundError) {
            return Option.none<Row>()
          }
          // Only actual errors get thrown (and logged by tapError)
          throw toError(error)
        }

        const result = data as Row
        const passes = config.filterFn ? config.filterFn(result) : true
        return passes ? Option(result) : Option.none<Row>()
      }, toError).tapError((err) => log.error(`Error getting ${config.table} item: ${err}`))
    },

    /**
     * Execute query expecting zero or more results
     */
    many: (): Task<Error, List<Row>> => {
      return IO.tryAsync<List<Row>, Error>(async () => {
        const query = buildSupabaseQuery()
        const { data, error } = await query
        if (error) throw toError(error)
        const rawResults = data as ReadonlyArray<Row>
        const results = config.filterFn ? rawResults.filter(config.filterFn) : rawResults
        return List(results)
      }, toError).tapError((err) => log.error(`Error getting ${config.table} items: ${err}`))
    },

    /**
     * Execute query expecting first result from potentially multiple
     */
    first: (): Task<Error, Option<Row>> => {
      return QueryBuilder<T, DB>(client, config)
        .many()
        .map((list) => list.headOption())
    },

    /**
     * Execute query expecting exactly one result, throw if error or not found
     */
    oneOrThrow: async (): Promise<Row> => {
      const option = await QueryBuilder<T, DB>(client, config).one().runOrThrow()
      return option.orThrow(new Error(`No record found in ${config.table}`))
    },

    /**
     * Execute query expecting zero or more results, throw if error
     */
    manyOrThrow: async (): Promise<List<Row>> => {
      return QueryBuilder<T, DB>(client, config).many().runOrThrow()
    },

    /**
     * Execute query expecting first result, throw if error or empty
     */
    firstOrThrow: async (): Promise<Row> => {
      const option = await QueryBuilder<T, DB>(client, config).first().runOrThrow()
      return option.orThrow(new Error(`No records found in ${config.table}`))
    },
  }
}

/**
 * Functional MappedQuery implementation
 */
const createMappedQuery = <T extends TableNames<DB>, DB extends DatabaseSchema = Database, U = unknown>(
  sourceQuery: Query<TableRow<T, DB>>,
  mapFn: (item: TableRow<T, DB>) => U,
): MappedQuery<U> => {
  type Row = TableRow<T, DB>
  return {
    map: <V>(fn: (item: U) => V): MappedQuery<V> => {
      return createMappedQuery<T, DB, V>(sourceQuery, (item: Row) => fn(mapFn(item)))
    },

    filter: (predicate: (item: U) => boolean): MappedQuery<U> => {
      const filteredQuery = sourceQuery.filter((item: Row) => predicate(mapFn(item)))
      return createMappedQuery<T, DB, U>(filteredQuery, mapFn)
    },

    // The mapper is the caller's code: run it as a typed step, so a throw in it is a Left from
    // run(), as on functype 1. Inside a plain IO.map, functype 2 makes it a defect that rejects run().
    one: (): Task<Error, Option<U>> => {
      return sourceQuery.one().flatMap((maybeItem) => IO.tryCatch(() => maybeItem.map(mapFn), toError))
    },

    many: (): Task<Error, List<U>> => {
      return sourceQuery.many().flatMap((items) => IO.tryCatch(() => items.map(mapFn), toError))
    },

    first: (): Task<Error, Option<U>> => {
      return sourceQuery.first().flatMap((maybeItem) => IO.tryCatch(() => maybeItem.map(mapFn), toError))
    },

    /**
     * Execute mapped query expecting exactly one result, throw if error or not found
     */
    oneOrThrow: async (): Promise<U> => {
      const option = await createMappedQuery(sourceQuery, mapFn).one().runOrThrow()
      return option.orThrow(new Error(`No record found`))
    },

    /**
     * Execute mapped query expecting zero or more results, throw if error
     */
    manyOrThrow: async (): Promise<List<U>> => {
      return createMappedQuery(sourceQuery, mapFn).many().runOrThrow()
    },

    /**
     * Execute mapped query expecting first result, throw if error or empty
     */
    firstOrThrow: async (): Promise<U> => {
      const option = await createMappedQuery(sourceQuery, mapFn).first().runOrThrow()
      return option.orThrow(new Error(`No records found`))
    },
  }
}

/**
 * Factory function to create new functional QueryBuilder instances
 */
export const createQuery = <T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  table: T,
  where: WhereConditions<TableRow<T, DB>> = {},
  is?: IsConditions<TableRow<T, DB>>,
  wherein?: Partial<Record<keyof TableRow<T, DB>, ReadonlyArray<unknown>>>,
  order?: [keyof TableRow<T, DB> & string, { ascending?: boolean; nullsFirst?: boolean }],
  softDeleteConfig?: { mode?: "include" | "exclude" | "only"; appliedByDefault?: boolean },
  schema?: string,
  comparison?: {
    gte?: Partial<Record<keyof TableRow<T, DB>, number | string | Date>>
    gt?: Partial<Record<keyof TableRow<T, DB>, number | string | Date>>
    lte?: Partial<Record<keyof TableRow<T, DB>, number | string | Date>>
    lt?: Partial<Record<keyof TableRow<T, DB>, number | string | Date>>
    neq?: Partial<Record<keyof TableRow<T, DB>, unknown>>
    like?: Partial<Record<keyof TableRow<T, DB>, string>>
    ilike?: Partial<Record<keyof TableRow<T, DB>, string>>
  },
  not?: {
    is?: Partial<Record<keyof TableRow<T, DB>, null | boolean>>
    in?: Partial<Record<keyof TableRow<T, DB>, ReadonlyArray<unknown>>>
  },
): Query<TableRow<T, DB>> => {
  const config: QueryBuilderConfig<TableRow<T, DB>> = {
    table,
    conditions: [{ where, is, wherein, ...comparison, not }],
    order,
    softDeleteMode: softDeleteConfig?.mode,
    softDeleteAppliedByDefault: softDeleteConfig?.appliedByDefault,
    schema,
  }
  return QueryBuilder<T, DB>(client, config)
}
