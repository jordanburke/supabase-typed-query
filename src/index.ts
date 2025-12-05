/**
 * supabase-typed-query
 * Type-safe query builder and entity patterns for Supabase
 */

// Core types
export type {
  Database,
  DatabaseSchema,
  EmptyObject,
  QueryBuilder,
  SchemaNames,
  SupabaseClientType,
  TableInsert,
  TableNames,
  TableRow,
  TableUpdate,
  TypedDatabase,
  ValidSchema,
} from "./types"

// Query exports
export type {
  ComparisonOperators,
  EntityQuery,
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
} from "./query"
export {
  addEntities,
  deleteEntities,
  deleteEntity,
  getEntities,
  getEntity,
  isMappedQuery,
  isQuery,
  query,
  softDeleteEntities,
  softDeleteEntity,
  updateEntity,
  upsertEntities,
} from "./query"

// Entity exports
export type {
  AddItemsParams,
  DeleteItemParams,
  DeleteItemsParams,
  EntityConfig,
  EntityType,
  GetItemParams,
  GetItemsParams,
  IdParam,
  IEntity,
  IPartitionedEntity,
  IsParams,
  MutationMultiExecution,
  MutationSingleExecution,
  OrderParams,
  PartitionedEntityConfig,
  PartitionKey,
  TypedRecord,
  UpdateItemParams,
  UpdateItemsParams,
  UpsertItemsParams,
  WhereinParams,
  WhereParams,
} from "./entity"
export { Entity, MultiMutationQuery, PartitionedEntity, SingleMutationQuery } from "./entity"

// Re-export functype utilities that are commonly used with this library
export type { FPromise, TaskOutcome } from "functype"
export { Err, List, Ok, Option } from "functype"

// Error utilities
export type { SupabaseErrorObject } from "./utils/errors"
export { SupabaseError, toError } from "./utils/errors"
