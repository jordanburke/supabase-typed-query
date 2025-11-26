/**
 * Shared internal functions for Entity and PartitionedEntity (DRY)
 */

import { addEntities, updateEntities, updateEntity } from "@/query"
import type { WhereConditions } from "@/query/Query"
import { createQuery } from "@/query/QueryBuilder"
import type { SupabaseClientType, TableNames, TableRow, TableUpdate } from "@/types"

import type { FPromise, List, TaskOutcome } from "functype"

import type {
  GetItemParams,
  GetItemsParams,
  IsParams,
  MutationMultiExecution,
  MutationSingleExecution,
  PartitionKey,
  TypedRecord,
  UpdateItemParams,
  UpdateItemsParams,
  WhereinParams,
} from "./types"
import { MultiMutationQuery, SingleMutationQuery } from "./types"

// =============================================================================
// Soft Delete Mode Types
// =============================================================================

export type SoftDeleteMode = "exclude" | "include"

export function getSoftDeleteMode(softDelete: boolean): SoftDeleteMode {
  return softDelete ? "exclude" : "include"
}

// =============================================================================
// Where Condition Builders
// =============================================================================

/**
 * Builds where conditions with partition key merged in
 */
export function buildWhereWithPartition<T extends object>(
  partitionField: string,
  partitionKey: PartitionKey,
  where?: WhereConditions<T>,
): WhereConditions<T> {
  const partitionCondition = { [partitionField]: partitionKey as string }
  return { ...partitionCondition, ...where } as WhereConditions<T>
}

/**
 * Builds where conditions with partition key and id
 */
export function buildWhereWithPartitionAndId<T extends object>(
  partitionField: string,
  partitionKey: PartitionKey,
  id: string,
  where?: WhereConditions<T>,
): WhereConditions<T> {
  const partitionCondition = { [partitionField]: partitionKey as string }
  return { ...partitionCondition, ...where, id } as WhereConditions<T>
}

// =============================================================================
// Query Creation Functions
// =============================================================================

/**
 * Creates a getItem query (single item by id)
 */
export function createGetItemQuery<T extends TableNames>(
  client: SupabaseClientType,
  name: T,
  whereConditions: WhereConditions<TableRow<T>>,
  is: TypedRecord<TableRow<T>, null | boolean> | undefined,
  softDeleteMode: SoftDeleteMode,
) {
  return createQuery(client, name, whereConditions, is, undefined, undefined, {
    mode: softDeleteMode,
    appliedByDefault: true,
  })
}

/**
 * Creates a getItems query (multiple items)
 */
export function createGetItemsQuery<T extends TableNames>(
  client: SupabaseClientType,
  name: T,
  whereConditions: WhereConditions<TableRow<T>>,
  is: TypedRecord<TableRow<T>, null | boolean> | undefined,
  wherein: TypedRecord<TableRow<T>, unknown[]> | undefined,
  order: GetItemsParams<TableRow<T>>["order"],
  softDeleteMode: SoftDeleteMode,
) {
  return createQuery(client, name, whereConditions, is, wherein, order, {
    mode: softDeleteMode,
    appliedByDefault: true,
  })
}

// =============================================================================
// Mutation Functions
// =============================================================================

/**
 * Creates an addItems mutation
 */
export function createAddItemsMutation<T extends TableNames>(
  client: SupabaseClientType,
  name: T,
  items: TableRow<T>[],
): MutationMultiExecution<TableRow<T>> {
  return MultiMutationQuery(addEntities(client, name, items) as FPromise<TaskOutcome<List<TableRow<T>>>>)
}

/**
 * Creates an updateItem mutation
 */
export function createUpdateItemMutation<T extends TableNames>(
  client: SupabaseClientType,
  name: T,
  item: TableUpdate<T>,
  whereConditions: WhereConditions<TableRow<T>>,
  is: IsParams<TableRow<T>>["is"],
  wherein: WhereinParams<TableRow<T>>["wherein"],
): MutationSingleExecution<TableRow<T>> {
  return SingleMutationQuery(
    updateEntity(client, name, item, whereConditions, is, wherein) as FPromise<TaskOutcome<TableRow<T>>>,
  )
}

/**
 * Creates an updateItems mutation (Prisma-style: update all matching rows with same data)
 */
export function createUpdateItemsMutation<T extends TableNames>(
  client: SupabaseClientType,
  name: T,
  data: TableUpdate<T>,
  where: WhereConditions<TableRow<T>>,
  is: IsParams<TableRow<T>>["is"],
  wherein: WhereinParams<TableRow<T>>["wherein"],
): MutationMultiExecution<TableRow<T>> {
  // Use updateEntities with single-item array - updates all matching rows with same data
  return MultiMutationQuery(
    updateEntities(client, name, [data], undefined, where, is, wherein) as FPromise<TaskOutcome<List<TableRow<T>>>>,
  )
}

// =============================================================================
// Entity Method Factories (for maximum DRY)
// =============================================================================

/**
 * Creates getItem method for Entity (no partition)
 */
export function makeGetItem<T extends TableNames>(client: SupabaseClientType, name: T, softDeleteMode: SoftDeleteMode) {
  return function getItem({ id, where, is }: GetItemParams<TableRow<T>>) {
    const whereConditions = { ...where, id } as WhereConditions<TableRow<T>>
    return createGetItemQuery(client, name, whereConditions, is, softDeleteMode)
  }
}

/**
 * Creates getItems method for Entity (no partition)
 */
export function makeGetItems<T extends TableNames>(
  client: SupabaseClientType,
  name: T,
  softDeleteMode: SoftDeleteMode,
) {
  return function getItems({ where, is, wherein, order }: GetItemsParams<TableRow<T>> = {}) {
    return createGetItemsQuery(client, name, where as WhereConditions<TableRow<T>>, is, wherein, order, softDeleteMode)
  }
}

/**
 * Creates getItem method for PartitionedEntity
 */
export function makePartitionedGetItem<T extends TableNames, K extends PartitionKey>(
  client: SupabaseClientType,
  name: T,
  partitionField: string,
  softDeleteMode: SoftDeleteMode,
) {
  return function getItem(partitionKey: K, { id, where, is }: GetItemParams<TableRow<T>>) {
    const whereConditions = buildWhereWithPartitionAndId(partitionField, partitionKey, id, where)
    return createGetItemQuery(client, name, whereConditions as WhereConditions<TableRow<T>>, is, softDeleteMode)
  }
}

/**
 * Creates getItems method for PartitionedEntity
 */
export function makePartitionedGetItems<T extends TableNames, K extends PartitionKey>(
  client: SupabaseClientType,
  name: T,
  partitionField: string,
  softDeleteMode: SoftDeleteMode,
) {
  return function getItems(partitionKey: K, { where, is, wherein, order }: GetItemsParams<TableRow<T>> = {}) {
    const whereConditions = buildWhereWithPartition(partitionField, partitionKey, where)
    return createGetItemsQuery(
      client,
      name,
      whereConditions as WhereConditions<TableRow<T>>,
      is,
      wherein,
      order,
      softDeleteMode,
    )
  }
}

/**
 * Creates updateItem method for Entity (no partition) - Prisma-style { where, data }
 */
export function makeUpdateItem<T extends TableNames>(client: SupabaseClientType, name: T) {
  return function updateItem({ where, data, is, wherein }: UpdateItemParams<T, TableRow<T>>) {
    return createUpdateItemMutation(client, name, data, where as WhereConditions<TableRow<T>>, is, wherein)
  }
}

/**
 * Creates updateItem method for PartitionedEntity - Prisma-style { where, data }
 */
export function makePartitionedUpdateItem<T extends TableNames, K extends PartitionKey>(
  client: SupabaseClientType,
  name: T,
  partitionField: string,
) {
  return function updateItem(partitionKey: K, { where, data, is, wherein }: UpdateItemParams<T, TableRow<T>>) {
    const whereConditions = buildWhereWithPartition(partitionField, partitionKey, where)
    return createUpdateItemMutation(client, name, data, whereConditions as WhereConditions<TableRow<T>>, is, wherein)
  }
}

/**
 * Creates updateItems method for Entity (no partition) - Prisma-style { where, data }
 */
export function makeUpdateItems<T extends TableNames>(client: SupabaseClientType, name: T) {
  return function updateItems({ where, data, is, wherein }: UpdateItemsParams<T, TableRow<T>>) {
    return createUpdateItemsMutation(client, name, data, where as WhereConditions<TableRow<T>>, is, wherein)
  }
}

/**
 * Creates updateItems method for PartitionedEntity - Prisma-style { where, data }
 */
export function makePartitionedUpdateItems<T extends TableNames, K extends PartitionKey>(
  client: SupabaseClientType,
  name: T,
  partitionField: string,
) {
  return function updateItems(partitionKey: K, { where, data, is, wherein }: UpdateItemsParams<T, TableRow<T>>) {
    const whereConditions = buildWhereWithPartition(partitionField, partitionKey, where)
    return createUpdateItemsMutation(client, name, data, whereConditions as WhereConditions<TableRow<T>>, is, wherein)
  }
}

/**
 * Creates addItems method (same for both Entity and PartitionedEntity)
 */
export function makeAddItems<T extends TableNames>(client: SupabaseClientType, name: T) {
  return function addItems({ items }: { items: TableRow<T>[] }) {
    return createAddItemsMutation(client, name, items)
  }
}
