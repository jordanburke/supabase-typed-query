/**
 * supabase-typed-query
 * Type-safe query builder and entity patterns for Supabase
 */

// Core types
export type {
  Database,
  DatabaseSchema,
  EmptyObject,
  FunctionArgs,
  FunctionNames,
  FunctionReturns,
  QueryBuilder,
  RpcQueryBuilder,
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
  RpcExecution,
  RpcMultiExecution,
  RpcOptions,
  RpcSingleExecution,
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
  rpc,
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
export type { IOTask as Task } from "functype"
export { IO, List, Option } from "functype"

// Error utilities
export type { SupabaseErrorObject } from "./utils/errors"
export { SupabaseError, toError } from "./utils/errors"
