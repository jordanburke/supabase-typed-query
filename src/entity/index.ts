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
  IsParams,
  MutationMultiExecution,
  MutationSingleExecution,
  OrderParams,
  TypedRecord,
  UpdateItemParams,
  UpdateItemsParams,
  UpsertItemsParams,
  WhereinParams,
  WhereParams,
} from "./Entity"
export { Entity, MultiMutationQuery, SingleMutationQuery } from "./Entity"

// PartitionedEntity exports
export { PartitionedEntity } from "./PartitionedEntity"
export type { IPartitionedEntity, PartitionedEntityConfig, PartitionKey } from "./types"
