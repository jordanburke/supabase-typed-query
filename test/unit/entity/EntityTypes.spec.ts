import { describe, expect, it } from "vitest"

import type {
  EntityConfig,
  EntityType,
  IdParam,
  IEntity,
  IPartitionedEntity,
  PartitionedEntityConfig,
  PartitionKey,
  TypedRecord,
  WhereParams,
} from "@/entity"
import type { EntityWhereConditions, WhereConditions } from "@/query/Query"

import type { Brand } from "functype"

describe("Entity Types", () => {
  it("should define proper entity type structure", () => {
    // EntityType expects a TableNames type (string literal)
    type TestTable = "test_table"

    const entityType: EntityType<TestTable> = {
      getItem: expect.any(Function) as never,
      getItems: expect.any(Function) as never,
      addItems: expect.any(Function) as never,
      updateItem: expect.any(Function) as never,
      updateItems: expect.any(Function) as never,
      upsertItems: expect.any(Function) as never,
      deleteItem: expect.any(Function) as never,
      deleteItems: expect.any(Function) as never,
    }

    expect(entityType).toBeDefined()
  })

  it("should type check IdParam", () => {
    // IdParam is not generic
    const idParam: IdParam = {
      id: "test-id",
    }

    expect(idParam).toBeDefined()
    expect(idParam.id).toBe("test-id")
  })

  it("should type check WhereParams", () => {
    type TestTable = {
      id: number
      name: string
      active: boolean
    }

    const whereParams: WhereParams<TestTable> = {
      where: {
        active: true,
        name: "test",
      },
    }

    expect(whereParams).toBeDefined()
    expect(whereParams.where?.active).toBe(true)
    expect(whereParams.where?.name).toBe("test")
  })

  it("should handle TypedRecord type", () => {
    type TestObject = { id: string; value: number }
    // TypedRecord takes two generic parameters: T and V
    type TestRecord = TypedRecord<TestObject, string | number>

    const record: TestRecord = {
      id: "test",
      value: 42,
    }

    expect(record).toBeDefined()
    expect(record.id).toBe("test")
    expect(record.value).toBe(42)
  })

  it("should type check EntityConfig", () => {
    const configExclude: EntityConfig = {
      softDelete: true,
    }

    const configInclude: EntityConfig = {
      softDelete: false,
    }

    expect(configExclude).toBeDefined()
    expect(configInclude).toBeDefined()
    expect(configExclude.softDelete).toBe(true)
    expect(configInclude.softDelete).toBe(false)
  })

  it("should type check PartitionedEntityConfig", () => {
    const config: PartitionedEntityConfig = {
      partitionField: "tenant_id",
      softDelete: true,
    }

    expect(config).toBeDefined()
    expect(config.partitionField).toBe("tenant_id")
    expect(config.softDelete).toBe(true)
  })

  it("should type check PartitionKey with branded types", () => {
    // PartitionKey can be a string
    const stringKey: PartitionKey = "tenant-123"
    expect(stringKey).toBe("tenant-123")

    // PartitionKey can also be a branded type
    type TenantId = Brand<string, "TenantId">
    const brandedKey: PartitionKey = "tenant-456" as TenantId
    expect(brandedKey).toBe("tenant-456")
  })

  it("should type check IPartitionedEntity interface", () => {
    type TestTable = "test_table"
    type TenantId = Brand<string, "TenantId">

    // IPartitionedEntity should have all required methods with partition key
    const mockFn = (() => {}) as never

    const partitionedEntity: IPartitionedEntity<TestTable, TenantId> = {
      getItem: mockFn,
      getItems: mockFn,
      addItems: mockFn,
      updateItem: mockFn,
      updateItems: mockFn,
      upsertItems: mockFn,
      deleteItem: mockFn,
      deleteItems: mockFn,
    }

    expect(partitionedEntity).toBeDefined()
    expect(partitionedEntity.getItem).toBeDefined()
    expect(partitionedEntity.getItems).toBeDefined()
  })

  it("should type check IEntity interface", () => {
    type TestTable = "test_table"

    // IEntity should have all required methods - just test type compatibility
    const mockFn = (() => {}) as never

    const entityInterface: IEntity<TestTable> = {
      getItem: mockFn,
      getItems: mockFn,
      addItems: mockFn,
      updateItem: mockFn,
      updateItems: mockFn,
      upsertItems: mockFn,
      deleteItem: mockFn,
      deleteItems: mockFn,
    }

    expect(entityInterface).toBeDefined()
    expect(entityInterface.getItem).toBeDefined()
    expect(entityInterface.getItems).toBeDefined()
  })

  it("should differentiate EntityWhereConditions from WhereConditions", () => {
    type TestRow = {
      id: string
      name: string
      used_at: string | null
      count: number
    }

    // EntityWhereConditions only allows direct values (no nested operators)
    const entityWhere: EntityWhereConditions<TestRow> = {
      id: "123",
      name: "test",
      used_at: null, // Direct null is allowed
      count: 42,
    }

    // WhereConditions allows nested operators (for Query API)
    const queryWhere: WhereConditions<TestRow> = {
      id: "123",
      name: { like: "%test%" }, // Nested operators allowed
      used_at: { is: null }, // Nested is operator allowed
      count: { gt: 10 }, // Nested comparison allowed
    }

    expect(entityWhere).toBeDefined()
    expect(queryWhere).toBeDefined()

    // EntityWhereConditions is a subset of WhereConditions
    // So entityWhere can be assigned to WhereConditions
    const assignable: WhereConditions<TestRow> = entityWhere
    expect(assignable).toBeDefined()

    // This test documents the intended behavior:
    // - Entity API uses EntityWhereConditions (no nested operators)
    // - Query API uses WhereConditions (nested operators allowed)
    // - Use separate `is`, `wherein`, etc. params for Entity API
  })

  it("should allow null values in EntityWhereConditions", () => {
    type TestRow = {
      id: string
      optional_field: string | null
    }

    // Direct null assignment is valid for nullable fields
    const where: EntityWhereConditions<TestRow> = {
      id: "123",
      optional_field: null,
    }

    expect(where.optional_field).toBeNull()
  })
})
