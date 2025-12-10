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
import type { EntityWhereConditions, Query, WhereConditions } from "@/query/Query"
import { createQuery } from "@/query/QueryBuilder"
import type {
  Database,
  DatabaseSchema,
  SchemaNames,
  SupabaseClientType,
  TableNames,
  TableRow,
  TableUpdate,
} from "@/types"

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
export function createGetItemQuery<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(
  client: SupabaseClientType<DB>,
  name: T,
  whereConditions: WhereConditions<TableRow<T, DB, S>>,
  is: TypedRecord<TableRow<T, DB, S>, null | boolean> | undefined,
  softDeleteMode: SoftDeleteMode,
  schema?: string,
): Query<TableRow<T, DB, S>> {
  return createQuery(
    client,
    name,
    whereConditions as WhereConditions<TableRow<T, DB>>,
    is as TypedRecord<TableRow<T, DB>, null | boolean> | undefined,
    undefined,
    undefined,
    {
      mode: softDeleteMode,
      appliedByDefault: true,
    },
    schema,
  ) as unknown as Query<TableRow<T, DB, S>>
}

/**
 * Creates a getItems query (multiple items)
 */
export function createGetItemsQuery<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(
  client: SupabaseClientType<DB>,
  name: T,
  whereConditions: WhereConditions<TableRow<T, DB, S>>,
  is: TypedRecord<TableRow<T, DB, S>, null | boolean> | undefined,
  wherein: TypedRecord<TableRow<T, DB, S>, unknown[]> | undefined,
  order: GetItemsParams<TableRow<T, DB, S>>["order"],
  softDeleteMode: SoftDeleteMode,
  schema?: string,
  comparison?: {
    gte?: TypedRecord<TableRow<T, DB, S>, number | string | Date>
    gt?: TypedRecord<TableRow<T, DB, S>, number | string | Date>
    lte?: TypedRecord<TableRow<T, DB, S>, number | string | Date>
    lt?: TypedRecord<TableRow<T, DB, S>, number | string | Date>
    neq?: TypedRecord<TableRow<T, DB, S>, unknown>
    like?: TypedRecord<TableRow<T, DB, S>, string>
    ilike?: TypedRecord<TableRow<T, DB, S>, string>
  },
  not?: {
    is?: TypedRecord<TableRow<T, DB, S>, null | boolean>
    in?: TypedRecord<TableRow<T, DB, S>, unknown[]>
  },
): Query<TableRow<T, DB, S>> {
  return createQuery(
    client,
    name,
    whereConditions as WhereConditions<TableRow<T, DB>>,
    is as TypedRecord<TableRow<T, DB>, null | boolean> | undefined,
    wherein as TypedRecord<TableRow<T, DB>, unknown[]> | undefined,
    order as GetItemsParams<TableRow<T, DB>>["order"],
    {
      mode: softDeleteMode,
      appliedByDefault: true,
    },
    schema,
    comparison as {
      gte?: TypedRecord<TableRow<T, DB>, number | string | Date>
      gt?: TypedRecord<TableRow<T, DB>, number | string | Date>
      lte?: TypedRecord<TableRow<T, DB>, number | string | Date>
      lt?: TypedRecord<TableRow<T, DB>, number | string | Date>
      neq?: TypedRecord<TableRow<T, DB>, unknown>
      like?: TypedRecord<TableRow<T, DB>, string>
      ilike?: TypedRecord<TableRow<T, DB>, string>
    },
    not as {
      is?: TypedRecord<TableRow<T, DB>, null | boolean>
      in?: TypedRecord<TableRow<T, DB>, unknown[]>
    },
  ) as unknown as Query<TableRow<T, DB, S>>
}

// =============================================================================
// Mutation Functions
// =============================================================================

/**
 * Creates an addItems mutation
 */
export function createAddItemsMutation<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(
  client: SupabaseClientType<DB>,
  name: T,
  items: TableRow<T, DB, S>[],
  schema?: string,
): MutationMultiExecution<TableRow<T, DB, S>> {
  return MultiMutationQuery(
    addEntities<T, DB>(client, name, items as TableRow<T, DB>[], schema) as FPromise<
      TaskOutcome<List<TableRow<T, DB, S>>>
    >,
  )
}

/**
 * Creates an updateItem mutation
 */
export function createUpdateItemMutation<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(
  client: SupabaseClientType<DB>,
  name: T,
  item: TableUpdate<T, DB, S>,
  whereConditions: WhereConditions<TableRow<T, DB, S>>,
  is: IsParams<TableRow<T, DB, S>>["is"],
  wherein: WhereinParams<TableRow<T, DB, S>>["wherein"],
  schema?: string,
): MutationSingleExecution<TableRow<T, DB, S>> {
  return SingleMutationQuery(
    updateEntity<T, DB>(
      client,
      name,
      item as TableUpdate<T, DB>,
      whereConditions as WhereConditions<TableRow<T, DB>>,
      is as IsParams<TableRow<T, DB>>["is"],
      wherein as WhereinParams<TableRow<T, DB>>["wherein"],
      schema,
    ) as FPromise<TaskOutcome<TableRow<T, DB, S>>>,
  )
}

/**
 * Creates an updateItems mutation (Prisma-style: update all matching rows with same data)
 */
export function createUpdateItemsMutation<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(
  client: SupabaseClientType<DB>,
  name: T,
  data: TableUpdate<T, DB, S>,
  where: WhereConditions<TableRow<T, DB, S>>,
  is: IsParams<TableRow<T, DB, S>>["is"],
  wherein: WhereinParams<TableRow<T, DB, S>>["wherein"],
  schema?: string,
): MutationMultiExecution<TableRow<T, DB, S>> {
  // Use upsertEntities with single-item array - updates all matching rows with same data
  return MultiMutationQuery(
    upsertEntities<T, DB>(
      client,
      name,
      [data] as TableUpdate<T, DB>[],
      undefined,
      where as WhereConditions<TableRow<T, DB>>,
      is as IsParams<TableRow<T, DB>>["is"],
      wherein as WhereinParams<TableRow<T, DB>>["wherein"],
      schema,
    ) as FPromise<TaskOutcome<List<TableRow<T, DB, S>>>>,
  )
}

/**
 * Creates an upsertItems mutation (batch upsert: each item gets its own data)
 */
export function createUpsertItemsMutation<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(
  client: SupabaseClientType<DB>,
  name: T,
  items: TableUpdate<T, DB, S>[],
  identity: (keyof TableRow<T, DB, S> & string) | (keyof TableRow<T, DB, S> & string)[],
  schema?: string,
): MutationMultiExecution<TableRow<T, DB, S>> {
  return MultiMutationQuery(
    upsertEntities<T, DB>(
      client,
      name,
      items as TableUpdate<T, DB>[],
      identity as (keyof TableRow<T, DB> & string) | (keyof TableRow<T, DB> & string)[],
      undefined,
      undefined,
      undefined,
      schema,
    ) as FPromise<TaskOutcome<List<TableRow<T, DB, S>>>>,
  )
}

// =============================================================================
// Entity Method Factories (for maximum DRY)
// =============================================================================

/**
 * Creates getItem method for Entity (no partition)
 */
export function makeGetItem<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(client: SupabaseClientType<DB>, name: T, softDeleteMode: SoftDeleteMode, schema?: string) {
  return function getItem({ id, where, is }: GetItemParams<TableRow<T, DB, S>>) {
    const whereConditions = { ...where, id } as WhereConditions<TableRow<T, DB, S>>
    return createGetItemQuery<T, DB, S>(client, name, whereConditions, is, softDeleteMode, schema)
  }
}

/**
 * Creates getItems method for Entity (no partition)
 */
export function makeGetItems<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(client: SupabaseClientType<DB>, name: T, softDeleteMode: SoftDeleteMode, schema?: string) {
  return function getItems({
    where,
    is,
    wherein,
    order,
    gte,
    gt,
    lte,
    lt,
    neq,
    like,
    ilike,
    not,
  }: GetItemsParams<TableRow<T, DB, S>> = {}) {
    return createGetItemsQuery<T, DB, S>(
      client,
      name,
      where as WhereConditions<TableRow<T, DB, S>>,
      is,
      wherein,
      order,
      softDeleteMode,
      schema,
      { gte, gt, lte, lt, neq, like, ilike },
      not,
    )
  }
}

/**
 * Creates getItem method for PartitionedEntity
 */
export function makePartitionedGetItem<
  T extends TableNames<DB, S>,
  K extends PartitionKey,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(client: SupabaseClientType<DB>, name: T, partitionField: string, softDeleteMode: SoftDeleteMode, schema?: string) {
  return function getItem(partitionKey: K, { id, where, is }: GetItemParams<TableRow<T, DB, S>>) {
    const whereConditions = buildWhereWithPartitionAndId(partitionField, partitionKey, id, where)
    return createGetItemQuery<T, DB, S>(
      client,
      name,
      whereConditions as WhereConditions<TableRow<T, DB, S>>,
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
  T extends TableNames<DB, S>,
  K extends PartitionKey,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(client: SupabaseClientType<DB>, name: T, partitionField: string, softDeleteMode: SoftDeleteMode, schema?: string) {
  return function getItems(
    partitionKey: K,
    { where, is, wherein, order, gte, gt, lte, lt, neq, like, ilike, not }: GetItemsParams<TableRow<T, DB, S>> = {},
  ) {
    const whereConditions = buildWhereWithPartition(partitionField, partitionKey, where)
    return createGetItemsQuery<T, DB, S>(
      client,
      name,
      whereConditions as WhereConditions<TableRow<T, DB, S>>,
      is,
      wherein,
      order,
      softDeleteMode,
      schema,
      { gte, gt, lte, lt, neq, like, ilike },
      not,
    )
  }
}

/**
 * Creates updateItem method for Entity (no partition) - Prisma-style { where, data }
 */
export function makeUpdateItem<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(client: SupabaseClientType<DB>, name: T, schema?: string) {
  return function updateItem({ where, data, is, wherein }: UpdateItemParams<T, TableRow<T, DB, S>, DB, S>) {
    return createUpdateItemMutation<T, DB, S>(
      client,
      name,
      data,
      where as WhereConditions<TableRow<T, DB, S>>,
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
  T extends TableNames<DB, S>,
  K extends PartitionKey,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(client: SupabaseClientType<DB>, name: T, partitionField: string, schema?: string) {
  return function updateItem(
    partitionKey: K,
    { where, data, is, wherein }: UpdateItemParams<T, TableRow<T, DB, S>, DB, S>,
  ) {
    const whereConditions = buildWhereWithPartition(partitionField, partitionKey, where)
    return createUpdateItemMutation<T, DB, S>(
      client,
      name,
      data,
      whereConditions as WhereConditions<TableRow<T, DB, S>>,
      is,
      wherein,
      schema,
    )
  }
}

/**
 * Creates updateItems method for Entity (no partition) - Prisma-style { where, data }
 */
export function makeUpdateItems<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(client: SupabaseClientType<DB>, name: T, schema?: string) {
  return function updateItems({ where, data, is, wherein }: UpdateItemsParams<T, TableRow<T, DB, S>, DB, S>) {
    return createUpdateItemsMutation<T, DB, S>(
      client,
      name,
      data,
      where as WhereConditions<TableRow<T, DB, S>>,
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
  T extends TableNames<DB, S>,
  K extends PartitionKey,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(client: SupabaseClientType<DB>, name: T, partitionField: string, schema?: string) {
  return function updateItems(
    partitionKey: K,
    { where, data, is, wherein }: UpdateItemsParams<T, TableRow<T, DB, S>, DB, S>,
  ) {
    const whereConditions = buildWhereWithPartition(partitionField, partitionKey, where)
    return createUpdateItemsMutation<T, DB, S>(
      client,
      name,
      data,
      whereConditions as WhereConditions<TableRow<T, DB, S>>,
      is,
      wherein,
      schema,
    )
  }
}

/**
 * Creates addItems method (same for both Entity and PartitionedEntity)
 */
export function makeAddItems<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(client: SupabaseClientType<DB>, name: T, schema?: string) {
  return function addItems({ items }: { items: TableRow<T, DB, S>[] }) {
    return createAddItemsMutation<T, DB, S>(client, name, items, schema)
  }
}

/**
 * Creates upsertItems method for Entity (no partition) - batch upsert with identity
 */
export function makeUpsertItems<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(client: SupabaseClientType<DB>, name: T, schema?: string) {
  return function upsertItems({
    items,
    identity = "id" as keyof TableRow<T, DB, S> & string,
  }: UpsertItemsParams<T, TableRow<T, DB, S>, DB, S>) {
    return createUpsertItemsMutation<T, DB, S>(client, name, items, identity, schema)
  }
}

/**
 * Creates upsertItems method for PartitionedEntity - batch upsert with identity
 */
export function makePartitionedUpsertItems<
  T extends TableNames<DB, S>,
  K extends PartitionKey,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(client: SupabaseClientType<DB>, name: T, _partitionField: string, schema?: string) {
  return function upsertItems(
    _partitionKey: K,
    { items, identity = "id" as keyof TableRow<T, DB, S> & string }: UpsertItemsParams<T, TableRow<T, DB, S>, DB, S>,
  ) {
    // Note: partitionKey is passed but items should already contain the partition field value
    // This maintains API consistency with other partitioned methods
    return createUpsertItemsMutation<T, DB, S>(client, name, items, identity, schema)
  }
}

// =============================================================================
// Delete Mutation Functions
// =============================================================================

/**
 * Creates a deleteItem mutation - supports both soft and hard delete
 */
export function createDeleteItemMutation<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(
  client: SupabaseClientType<DB>,
  name: T,
  whereConditions: WhereConditions<TableRow<T, DB, S>>,
  is: IsParams<TableRow<T, DB, S>>["is"],
  wherein: WhereinParams<TableRow<T, DB, S>>["wherein"],
  softDelete: boolean,
  schema?: string,
): MutationSingleExecution<TableRow<T, DB, S>> {
  const operation = softDelete
    ? softDeleteEntity<T, DB>(
        client,
        name,
        whereConditions as WhereConditions<TableRow<T, DB>>,
        is as IsParams<TableRow<T, DB>>["is"],
        wherein as WhereinParams<TableRow<T, DB>>["wherein"],
        schema,
      )
    : deleteEntity<T, DB>(
        client,
        name,
        whereConditions as WhereConditions<TableRow<T, DB>>,
        is as IsParams<TableRow<T, DB>>["is"],
        wherein as WhereinParams<TableRow<T, DB>>["wherein"],
        schema,
      )
  return SingleMutationQuery(operation as FPromise<TaskOutcome<TableRow<T, DB, S>>>)
}

/**
 * Creates a deleteItems mutation - supports both soft and hard delete
 */
export function createDeleteItemsMutation<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(
  client: SupabaseClientType<DB>,
  name: T,
  whereConditions: WhereConditions<TableRow<T, DB, S>>,
  is: IsParams<TableRow<T, DB, S>>["is"],
  wherein: WhereinParams<TableRow<T, DB, S>>["wherein"],
  softDelete: boolean,
  schema?: string,
): MutationMultiExecution<TableRow<T, DB, S>> {
  const operation = softDelete
    ? softDeleteEntities<T, DB>(
        client,
        name,
        whereConditions as WhereConditions<TableRow<T, DB>>,
        is as IsParams<TableRow<T, DB>>["is"],
        wherein as WhereinParams<TableRow<T, DB>>["wherein"],
        schema,
      )
    : deleteEntities<T, DB>(
        client,
        name,
        whereConditions as WhereConditions<TableRow<T, DB>>,
        is as IsParams<TableRow<T, DB>>["is"],
        wherein as WhereinParams<TableRow<T, DB>>["wherein"],
        schema,
      )
  return MultiMutationQuery(operation as FPromise<TaskOutcome<List<TableRow<T, DB, S>>>>)
}

// =============================================================================
// Delete Method Factories
// =============================================================================

/**
 * Creates deleteItem method for Entity (no partition)
 * When softDelete is true, sets the deleted timestamp instead of hard deleting.
 */
export function makeDeleteItem<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(client: SupabaseClientType<DB>, name: T, softDelete: boolean, schema?: string) {
  return function deleteItem({ where, is, wherein }: DeleteItemParams<TableRow<T, DB, S>>) {
    return createDeleteItemMutation<T, DB, S>(
      client,
      name,
      where as WhereConditions<TableRow<T, DB, S>>,
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
export function makeDeleteItems<
  T extends TableNames<DB, S>,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(client: SupabaseClientType<DB>, name: T, softDelete: boolean, schema?: string) {
  return function deleteItems({ where, is, wherein }: DeleteItemsParams<TableRow<T, DB, S>>) {
    return createDeleteItemsMutation<T, DB, S>(
      client,
      name,
      where as WhereConditions<TableRow<T, DB, S>>,
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
  T extends TableNames<DB, S>,
  K extends PartitionKey,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(client: SupabaseClientType<DB>, name: T, partitionField: string, softDelete: boolean, schema?: string) {
  return function deleteItem(partitionKey: K, { where, is, wherein }: DeleteItemParams<TableRow<T, DB, S>>) {
    const whereConditions = buildWhereWithPartition(partitionField, partitionKey, where)
    return createDeleteItemMutation<T, DB, S>(
      client,
      name,
      whereConditions as WhereConditions<TableRow<T, DB, S>>,
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
  T extends TableNames<DB, S>,
  K extends PartitionKey,
  DB extends DatabaseSchema = Database,
  S extends SchemaNames<DB> = "public" & SchemaNames<DB>,
>(client: SupabaseClientType<DB>, name: T, partitionField: string, softDelete: boolean, schema?: string) {
  return function deleteItems(partitionKey: K, { where, is, wherein }: DeleteItemsParams<TableRow<T, DB, S>>) {
    const whereConditions = buildWhereWithPartition(partitionField, partitionKey, where)
    return createDeleteItemsMutation<T, DB, S>(
      client,
      name,
      whereConditions as WhereConditions<TableRow<T, DB, S>>,
      is,
      wherein,
      softDelete,
      schema,
    )
  }
}
