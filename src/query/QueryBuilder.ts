import type { Database, DatabaseSchema, SupabaseClientType, TableNames, TableRow } from "@/types"
import { toError } from "@/utils/errors"

import type { Brand, IOTask as Task } from "functype"
import { IO, List, Option } from "functype"

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

    if (where) {
      // Extract top-level operators from where object
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
      for (const [key, value] of Object.entries(rest)) {
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
      }
    }

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
  const applyOrConditions = (query: any, conditions: QueryCondition<TableRow<T, DB>>[]): any => {
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

    // Separate common conditions from varying conditions
    const commonConditions = new Map<string, unknown>()
    const varyingConditions: QueryCondition<TableRow<T, DB>>[] = []

    // Find conditions that are common across all OR branches
    const firstCond = conditions[0]
    if (conditions.length > 0 && firstCond) {
      // Check each key-value pair in the first condition
      Object.entries(firstCond.where).forEach(([key, value]) => {
        // If this key-value pair exists in ALL conditions, it's common
        const isCommonCondition = conditions.every(
          (condition) => (condition.where as Record<string, unknown>)[key] === value,
        )

        if (isCommonCondition) {
          commonConditions.set(key, value)
        }
      })

      // Create new conditions with common parts removed
      varyingConditions.push(
        ...conditions.map((condition) => {
          const newWhere = { ...condition.where } as Record<string, unknown>
          commonConditions.forEach((_, key) => {
            delete newWhere[key]
          })
          return {
            where: newWhere as WhereConditions<TableRow<T, DB>>,
            is: condition.is,
            wherein: condition.wherein,
            not: condition.not,
          }
        }),
      )
    }

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
        const parts: string[] = []

        // Add WHERE conditions (only the varying ones)
        Object.entries(condition.where).forEach(([key, value]) => {
          if (value === null) {
            parts.push(`${key}.is.null`)
          } else {
            parts.push(`${key}.eq."${value}"`)
          }
        })

        // Add IS conditions
        if (condition.is) {
          Object.entries(condition.is).forEach(([key, value]) => {
            if (value === null) {
              parts.push(`${key}.is.null`)
            } else {
              parts.push(`${key}.is.${value}`)
            }
          })
        }

        // Add WHERE IN conditions
        if (condition.wherein) {
          Object.entries(condition.wherein).forEach(([key, values]) => {
            if (values && Array.isArray(values) && values.length > 0) {
              const valueList = values.map((v: unknown) => `"${v}"`).join(",")
              parts.push(`${key}.in.(${valueList})`)
            }
          })
        }

        // Add comparison operators
        if (condition.gt) {
          Object.entries(condition.gt).forEach(([key, value]) => {
            parts.push(`${key}.gt.${value}`)
          })
        }
        if (condition.gte) {
          Object.entries(condition.gte).forEach(([key, value]) => {
            parts.push(`${key}.gte.${value}`)
          })
        }
        if (condition.lt) {
          Object.entries(condition.lt).forEach(([key, value]) => {
            parts.push(`${key}.lt.${value}`)
          })
        }
        if (condition.lte) {
          Object.entries(condition.lte).forEach(([key, value]) => {
            parts.push(`${key}.lte.${value}`)
          })
        }
        if (condition.neq) {
          Object.entries(condition.neq).forEach(([key, value]) => {
            if (value === null) {
              log.warn(`neq: null is deprecated. Use not: { is: { ${key}: null } } for IS NOT NULL`)
              parts.push(`${key}.not.is.null`)
            } else {
              parts.push(`${key}.neq."${value}"`)
            }
          })
        }

        // Add pattern matching
        if (condition.like) {
          Object.entries(condition.like).forEach(([key, pattern]) => {
            parts.push(`${key}.like."${pattern}"`)
          })
        }
        if (condition.ilike) {
          Object.entries(condition.ilike).forEach(([key, pattern]) => {
            parts.push(`${key}.ilike."${pattern}"`)
          })
        }

        // Add NOT conditions (IS NOT NULL, NOT IN)
        if (condition.not) {
          if (condition.not.is) {
            Object.entries(condition.not.is).forEach(([key, value]) => {
              if (value === null) {
                parts.push(`${key}.not.is.null`)
              } else {
                parts.push(`${key}.not.is.${value}`)
              }
            })
          }
          if (condition.not.in) {
            Object.entries(condition.not.in).forEach(([key, values]) => {
              if (values && Array.isArray(values) && values.length > 0) {
                const valueList = values.map((v: unknown) => `"${v}"`).join(",")
                parts.push(`${key}.not.in.(${valueList})`)
              }
            })
          }
        }

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
     */
    one: (): Task<Error, Option<Row>> => {
      return IO.tryAsync<Option<Row>, Error>(async () => {
        const query = buildSupabaseQuery()
        const { data, error } = await query.single()
        if (error) throw toError(error)
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
        const rawResults = data as Row[]
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
        .map((list) => (list.isEmpty ? Option.none<Row>() : Option(list.head)))
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

    one: (): Task<Error, Option<U>> => {
      return sourceQuery.one().map((maybeItem) =>
        maybeItem.fold(
          () => Option.none<U>(),
          (item) => Option(mapFn(item)),
        ),
      )
    },

    many: (): Task<Error, List<U>> => {
      return sourceQuery.many().map((items) => items.map(mapFn))
    },

    first: (): Task<Error, Option<U>> => {
      return sourceQuery.first().map((maybeItem) =>
        maybeItem.fold(
          () => Option.none<U>(),
          (item) => Option(mapFn(item)),
        ),
      )
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
  wherein?: Partial<Record<keyof TableRow<T, DB>, unknown[]>>,
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
    in?: Partial<Record<keyof TableRow<T, DB>, unknown[]>>
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
