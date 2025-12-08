/**
 * Shared internal functions for Entity and PartitionedEntity (DRY)
 */

import {
  addEntities,
  deleteEntities,
  deleteEntity,
  softDeleteEntities,
  softDeleteEntity,
  updateEntity,
  upsertEntities,
} from "@/query"
import type { EntityWhereConditions, WhereConditions } from "@/query/Query"
import { createQuery } from "@/query/QueryBuilder"
import type { Database, DatabaseSchema, SupabaseClientType, TableNames, TableRow, TableUpdate } from "@/types"

import type { FPromise, List, TaskOutcome } from "functype"

import type {
  DeleteItemParams,
  DeleteItemsParams,
  GetItemParams,
  GetItemsParams,
  IsParams,
  MutationMultiExecution,
  MutationSingleExecution,
  PartitionKey,
  TypedRecord,
  UpdateItemParams,
  UpdateItemsParams,
  UpsertItemsParams,
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
  where?: EntityWhereConditions<T>,
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
  where?: EntityWhereConditions<T>,
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
export function createGetItemQuery<T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  name: T,
  whereConditions: WhereConditions<TableRow<T, DB>>,
  is: TypedRecord<TableRow<T, DB>, null | boolean> | undefined,
  softDeleteMode: SoftDeleteMode,
  schema?: string,
) {
  return createQuery<T, DB>(
    client,
    name,
    whereConditions,
    is,
    undefined,
    undefined,
    {
      mode: softDeleteMode,
      appliedByDefault: true,
    },
    schema,
  )
}

/**
 * Creates a getItems query (multiple items)
 */
export function createGetItemsQuery<T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  name: T,
  whereConditions: WhereConditions<TableRow<T, DB>>,
  is: TypedRecord<TableRow<T, DB>, null | boolean> | undefined,
  wherein: TypedRecord<TableRow<T, DB>, unknown[]> | undefined,
  order: GetItemsParams<TableRow<T, DB>>["order"],
  softDeleteMode: SoftDeleteMode,
  schema?: string,
) {
  return createQuery<T, DB>(
    client,
    name,
    whereConditions,
    is,
    wherein,
    order,
    {
      mode: softDeleteMode,
      appliedByDefault: true,
    },
    schema,
  )
}

// =============================================================================
// Mutation Functions
// =============================================================================

/**
 * Creates an addItems mutation
 */
export function createAddItemsMutation<T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  name: T,
  items: TableRow<T, DB>[],
  schema?: string,
): MutationMultiExecution<TableRow<T, DB>> {
  return MultiMutationQuery(
    addEntities<T, DB>(client, name, items, schema) as FPromise<TaskOutcome<List<TableRow<T, DB>>>>,
  )
}

/**
 * Creates an updateItem mutation
 */
export function createUpdateItemMutation<T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  name: T,
  item: TableUpdate<T, DB>,
  whereConditions: WhereConditions<TableRow<T, DB>>,
  is: IsParams<TableRow<T, DB>>["is"],
  wherein: WhereinParams<TableRow<T, DB>>["wherein"],
  schema?: string,
): MutationSingleExecution<TableRow<T, DB>> {
  return SingleMutationQuery(
    updateEntity<T, DB>(client, name, item, whereConditions, is, wherein, schema) as FPromise<
      TaskOutcome<TableRow<T, DB>>
    >,
  )
}

/**
 * Creates an updateItems mutation (Prisma-style: update all matching rows with same data)
 */
export function createUpdateItemsMutation<T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  name: T,
  data: TableUpdate<T, DB>,
  where: WhereConditions<TableRow<T, DB>>,
  is: IsParams<TableRow<T, DB>>["is"],
  wherein: WhereinParams<TableRow<T, DB>>["wherein"],
  schema?: string,
): MutationMultiExecution<TableRow<T, DB>> {
  // Use upsertEntities with single-item array - updates all matching rows with same data
  return MultiMutationQuery(
    upsertEntities<T, DB>(client, name, [data], undefined, where, is, wherein, schema) as FPromise<
      TaskOutcome<List<TableRow<T, DB>>>
    >,
  )
}

/**
 * Creates an upsertItems mutation (batch upsert: each item gets its own data)
 */
export function createUpsertItemsMutation<T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  name: T,
  items: TableUpdate<T, DB>[],
  identity: (keyof TableRow<T, DB> & string) | (keyof TableRow<T, DB> & string)[],
  schema?: string,
): MutationMultiExecution<TableRow<T, DB>> {
  return MultiMutationQuery(
    upsertEntities<T, DB>(client, name, items, identity, undefined, undefined, undefined, schema) as FPromise<
      TaskOutcome<List<TableRow<T, DB>>>
    >,
  )
}

// =============================================================================
// Entity Method Factories (for maximum DRY)
// =============================================================================

/**
 * Creates getItem method for Entity (no partition)
 */
export function makeGetItem<T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  name: T,
  softDeleteMode: SoftDeleteMode,
  schema?: string,
) {
  return function getItem({ id, where, is }: GetItemParams<TableRow<T, DB>>) {
    const whereConditions = { ...where, id } as WhereConditions<TableRow<T, DB>>
    return createGetItemQuery<T, DB>(client, name, whereConditions, is, softDeleteMode, schema)
  }
}

/**
 * Creates getItems method for Entity (no partition)
 */
export function makeGetItems<T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  name: T,
  softDeleteMode: SoftDeleteMode,
  schema?: string,
) {
  return function getItems({ where, is, wherein, order }: GetItemsParams<TableRow<T, DB>> = {}) {
    return createGetItemsQuery<T, DB>(
      client,
      name,
      where as WhereConditions<TableRow<T, DB>>,
      is,
      wherein,
      order,
      softDeleteMode,
      schema,
    )
  }
}

/**
 * Creates getItem method for PartitionedEntity
 */
export function makePartitionedGetItem<
  T extends TableNames<DB>,
  K extends PartitionKey,
  DB extends DatabaseSchema = Database,
>(client: SupabaseClientType<DB>, name: T, partitionField: string, softDeleteMode: SoftDeleteMode, schema?: string) {
  return function getItem(partitionKey: K, { id, where, is }: GetItemParams<TableRow<T, DB>>) {
    const whereConditions = buildWhereWithPartitionAndId(partitionField, partitionKey, id, where)
    return createGetItemQuery<T, DB>(
      client,
      name,
      whereConditions as WhereConditions<TableRow<T, DB>>,
      is,
      softDeleteMode,
      schema,
    )
  }
}

/**
 * Creates getItems method for PartitionedEntity
 */
export function makePartitionedGetItems<
  T extends TableNames<DB>,
  K extends PartitionKey,
  DB extends DatabaseSchema = Database,
>(client: SupabaseClientType<DB>, name: T, partitionField: string, softDeleteMode: SoftDeleteMode, schema?: string) {
  return function getItems(partitionKey: K, { where, is, wherein, order }: GetItemsParams<TableRow<T, DB>> = {}) {
    const whereConditions = buildWhereWithPartition(partitionField, partitionKey, where)
    return createGetItemsQuery<T, DB>(
      client,
      name,
      whereConditions as WhereConditions<TableRow<T, DB>>,
      is,
      wherein,
      order,
      softDeleteMode,
      schema,
    )
  }
}

/**
 * Creates updateItem method for Entity (no partition) - Prisma-style { where, data }
 */
export function makeUpdateItem<T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  name: T,
  schema?: string,
) {
  return function updateItem({ where, data, is, wherein }: UpdateItemParams<T, TableRow<T, DB>, DB>) {
    return createUpdateItemMutation<T, DB>(
      client,
      name,
      data,
      where as WhereConditions<TableRow<T, DB>>,
      is,
      wherein,
      schema,
    )
  }
}

/**
 * Creates updateItem method for PartitionedEntity - Prisma-style { where, data }
 */
export function makePartitionedUpdateItem<
  T extends TableNames<DB>,
  K extends PartitionKey,
  DB extends DatabaseSchema = Database,
>(client: SupabaseClientType<DB>, name: T, partitionField: string, schema?: string) {
  return function updateItem(partitionKey: K, { where, data, is, wherein }: UpdateItemParams<T, TableRow<T, DB>, DB>) {
    const whereConditions = buildWhereWithPartition(partitionField, partitionKey, where)
    return createUpdateItemMutation<T, DB>(
      client,
      name,
      data,
      whereConditions as WhereConditions<TableRow<T, DB>>,
      is,
      wherein,
      schema,
    )
  }
}

/**
 * Creates updateItems method for Entity (no partition) - Prisma-style { where, data }
 */
export function makeUpdateItems<T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  name: T,
  schema?: string,
) {
  return function updateItems({ where, data, is, wherein }: UpdateItemsParams<T, TableRow<T, DB>, DB>) {
    return createUpdateItemsMutation<T, DB>(
      client,
      name,
      data,
      where as WhereConditions<TableRow<T, DB>>,
      is,
      wherein,
      schema,
    )
  }
}

/**
 * Creates updateItems method for PartitionedEntity - Prisma-style { where, data }
 */
export function makePartitionedUpdateItems<
  T extends TableNames<DB>,
  K extends PartitionKey,
  DB extends DatabaseSchema = Database,
>(client: SupabaseClientType<DB>, name: T, partitionField: string, schema?: string) {
  return function updateItems(
    partitionKey: K,
    { where, data, is, wherein }: UpdateItemsParams<T, TableRow<T, DB>, DB>,
  ) {
    const whereConditions = buildWhereWithPartition(partitionField, partitionKey, where)
    return createUpdateItemsMutation<T, DB>(
      client,
      name,
      data,
      whereConditions as WhereConditions<TableRow<T, DB>>,
      is,
      wherein,
      schema,
    )
  }
}

/**
 * Creates addItems method (same for both Entity and PartitionedEntity)
 */
export function makeAddItems<T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  name: T,
  schema?: string,
) {
  return function addItems({ items }: { items: TableRow<T, DB>[] }) {
    return createAddItemsMutation<T, DB>(client, name, items, schema)
  }
}

/**
 * Creates upsertItems method for Entity (no partition) - batch upsert with identity
 */
export function makeUpsertItems<T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  name: T,
  schema?: string,
) {
  return function upsertItems({
    items,
    identity = "id" as keyof TableRow<T, DB> & string,
  }: UpsertItemsParams<T, TableRow<T, DB>, DB>) {
    return createUpsertItemsMutation<T, DB>(client, name, items, identity, schema)
  }
}

/**
 * Creates upsertItems method for PartitionedEntity - batch upsert with identity
 */
export function makePartitionedUpsertItems<
  T extends TableNames<DB>,
  K extends PartitionKey,
  DB extends DatabaseSchema = Database,
>(client: SupabaseClientType<DB>, name: T, _partitionField: string, schema?: string) {
  return function upsertItems(
    _partitionKey: K,
    { items, identity = "id" as keyof TableRow<T, DB> & string }: UpsertItemsParams<T, TableRow<T, DB>, DB>,
  ) {
    // Note: partitionKey is passed but items should already contain the partition field value
    // This maintains API consistency with other partitioned methods
    return createUpsertItemsMutation<T, DB>(client, name, items, identity, schema)
  }
}

// =============================================================================
// Delete Mutation Functions
// =============================================================================

/**
 * Creates a deleteItem mutation - supports both soft and hard delete
 */
export function createDeleteItemMutation<T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  name: T,
  whereConditions: WhereConditions<TableRow<T, DB>>,
  is: IsParams<TableRow<T, DB>>["is"],
  wherein: WhereinParams<TableRow<T, DB>>["wherein"],
  softDelete: boolean,
  schema?: string,
): MutationSingleExecution<TableRow<T, DB>> {
  const operation = softDelete
    ? softDeleteEntity<T, DB>(client, name, whereConditions, is, wherein, schema)
    : deleteEntity<T, DB>(client, name, whereConditions, is, wherein, schema)
  return SingleMutationQuery(operation as FPromise<TaskOutcome<TableRow<T, DB>>>)
}

/**
 * Creates a deleteItems mutation - supports both soft and hard delete
 */
export function createDeleteItemsMutation<T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  name: T,
  whereConditions: WhereConditions<TableRow<T, DB>>,
  is: IsParams<TableRow<T, DB>>["is"],
  wherein: WhereinParams<TableRow<T, DB>>["wherein"],
  softDelete: boolean,
  schema?: string,
): MutationMultiExecution<TableRow<T, DB>> {
  const operation = softDelete
    ? softDeleteEntities<T, DB>(client, name, whereConditions, is, wherein, schema)
    : deleteEntities<T, DB>(client, name, whereConditions, is, wherein, schema)
  return MultiMutationQuery(operation as FPromise<TaskOutcome<List<TableRow<T, DB>>>>)
}

// =============================================================================
// Delete Method Factories
// =============================================================================

/**
 * Creates deleteItem method for Entity (no partition)
 * When softDelete is true, sets the deleted timestamp instead of hard deleting.
 */
export function makeDeleteItem<T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  name: T,
  softDelete: boolean,
  schema?: string,
) {
  return function deleteItem({ where, is, wherein }: DeleteItemParams<TableRow<T, DB>>) {
    return createDeleteItemMutation<T, DB>(
      client,
      name,
      where as WhereConditions<TableRow<T, DB>>,
      is,
      wherein,
      softDelete,
      schema,
    )
  }
}

/**
 * Creates deleteItems method for Entity (no partition)
 * When softDelete is true, sets the deleted timestamp instead of hard deleting.
 */
export function makeDeleteItems<T extends TableNames<DB>, DB extends DatabaseSchema = Database>(
  client: SupabaseClientType<DB>,
  name: T,
  softDelete: boolean,
  schema?: string,
) {
  return function deleteItems({ where, is, wherein }: DeleteItemsParams<TableRow<T, DB>>) {
    return createDeleteItemsMutation<T, DB>(
      client,
      name,
      where as WhereConditions<TableRow<T, DB>>,
      is,
      wherein,
      softDelete,
      schema,
    )
  }
}

/**
 * Creates deleteItem method for PartitionedEntity
 * When softDelete is true, sets the deleted timestamp instead of hard deleting.
 */
export function makePartitionedDeleteItem<
  T extends TableNames<DB>,
  K extends PartitionKey,
  DB extends DatabaseSchema = Database,
>(client: SupabaseClientType<DB>, name: T, partitionField: string, softDelete: boolean, schema?: string) {
  return function deleteItem(partitionKey: K, { where, is, wherein }: DeleteItemParams<TableRow<T, DB>>) {
    const whereConditions = buildWhereWithPartition(partitionField, partitionKey, where)
    return createDeleteItemMutation<T, DB>(
      client,
      name,
      whereConditions as WhereConditions<TableRow<T, DB>>,
      is,
      wherein,
      softDelete,
      schema,
    )
  }
}

/**
 * Creates deleteItems method for PartitionedEntity
 * When softDelete is true, sets the deleted timestamp instead of hard deleting.
 */
export function makePartitionedDeleteItems<
  T extends TableNames<DB>,
  K extends PartitionKey,
  DB extends DatabaseSchema = Database,
>(client: SupabaseClientType<DB>, name: T, partitionField: string, softDelete: boolean, schema?: string) {
  return function deleteItems(partitionKey: K, { where, is, wherein }: DeleteItemsParams<TableRow<T, DB>>) {
    const whereConditions = buildWhereWithPartition(partitionField, partitionKey, where)
    return createDeleteItemsMutation<T, DB>(
      client,
      name,
      whereConditions as WhereConditions<TableRow<T, DB>>,
      is,
      wherein,
      softDelete,
      schema,
    )
  }
}
