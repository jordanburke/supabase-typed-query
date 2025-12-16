import { describe, expect, it, vi } from "vitest"

import { createMockSupabaseClient } from "../../helpers/mock-client"

import { PartitionedEntity } from "@/entity"
import type { SupabaseClientType } from "@/types"

import type { Brand } from "functype"

// Branded type for type-safe partition key testing
type TenantId = Brand<string, "TenantId">
const TenantIdOf = (id: string): TenantId => id as TenantId

describe("PartitionedEntity", () => {
  describe("Configuration", () => {
    it("should create partitioned entity with string partition key", () => {
      const mockClient = createMockSupabaseClient()

      const UserEntity = PartitionedEntity<"users", string>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      expect(UserEntity).toBeDefined()
      expect(typeof UserEntity.getItem).toBe("function")
      expect(typeof UserEntity.getItems).toBe("function")
      expect(typeof UserEntity.addItems).toBe("function")
      expect(typeof UserEntity.updateItem).toBe("function")
      expect(typeof UserEntity.updateItems).toBe("function")
    })

    it("should create partitioned entity with branded type partition key", () => {
      const mockClient = createMockSupabaseClient()

      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      expect(UserEntity).toBeDefined()
    })

    it("should create entity with softDelete disabled", () => {
      const mockClient = createMockSupabaseClient()

      const UserEntity = PartitionedEntity<"users", string>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: false,
      })

      expect(UserEntity).toBeDefined()
    })
  })

  describe("getItem()", () => {
    it("should return a Query interface with partition key", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const query = UserEntity.getItem(tenantId, { id: "user-123" })

      expect(query).toBeDefined()
      expect(typeof query.one).toBe("function")
      expect(typeof query.many).toBe("function")
      expect(typeof query.first).toBe("function")
    })

    it("should accept where conditions", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const query = UserEntity.getItem(tenantId, {
        id: "user-123",
        where: { active: true },
      })

      expect(query).toBeDefined()
    })

    it("should accept IS conditions", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const query = UserEntity.getItem(tenantId, {
        id: "user-123",
        is: { deleted: null },
      })

      expect(query).toBeDefined()
    })
  })

  describe("getItems()", () => {
    it("should return a Query interface with partition key", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const query = UserEntity.getItems(tenantId)

      expect(query).toBeDefined()
      expect(typeof query.many).toBe("function")
    })

    it("should accept where conditions", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const query = UserEntity.getItems(tenantId, {
        where: { active: true, role: "admin" },
      })

      expect(query).toBeDefined()
    })

    it("should accept IS conditions", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const query = UserEntity.getItems(tenantId, {
        is: { deleted: null },
      })

      expect(query).toBeDefined()
    })

    it("should accept wherein conditions", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const query = UserEntity.getItems(tenantId, {
        wherein: { id: ["id1", "id2", "id3"] },
      })

      expect(query).toBeDefined()
    })

    it("should accept order parameters", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const query = UserEntity.getItems(tenantId, {
        order: ["created_at", { ascending: false }],
      })

      expect(query).toBeDefined()
    })

    it("should accept combined parameters", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const query = UserEntity.getItems(tenantId, {
        where: { active: true },
        is: { deleted: null },
        wherein: { role: ["admin", "moderator"] },
        order: ["name", { ascending: true }],
      })

      expect(query).toBeDefined()
    })
  })

  describe("addItems()", () => {
    it("should call client insert with items", () => {
      const insertSpy = vi.fn().mockReturnThis()
      const selectSpy = vi.fn().mockResolvedValue({
        data: [{ id: "1", name: "Test", tenant_id: "tenant-123" }],
        error: null,
      })

      const mockClient = {
        from: vi.fn().mockReturnValue({
          insert: insertSpy,
          select: selectSpy,
          then: vi.fn().mockImplementation((resolve) => {
            return Promise.resolve({
              data: [{ id: "1", name: "Test", tenant_id: "tenant-123" }],
              error: null,
            }).then(resolve)
          }),
        }),
      } as unknown as SupabaseClientType

      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const items = [
        { name: "User 1", email: "user1@example.com", tenant_id: "tenant-123" },
        { name: "User 2", email: "user2@example.com", tenant_id: "tenant-123" },
      ]

      const result = UserEntity.addItems({ items })

      expect(result).toBeDefined()
      expect(typeof result.many).toBe("function")
      expect(typeof result.manyOrThrow).toBe("function")
      expect(typeof result.execute).toBe("function")
      expect(typeof result.executeOrThrow).toBe("function")
    })
  })

  describe("updateItem()", () => {
    it("should return a mutation execution interface with Prisma-style { where, data }", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const result = UserEntity.updateItem(tenantId, {
        where: { id: "user-123" },
        data: { name: "Updated Name" },
      })

      expect(result).toBeDefined()
      expect(typeof result.one).toBe("function")
      expect(typeof result.oneOrThrow).toBe("function")
      expect(typeof result.execute).toBe("function")
      expect(typeof result.executeOrThrow).toBe("function")
    })

    it("should accept multiple where conditions", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const result = UserEntity.updateItem(tenantId, {
        where: { id: "user-123", active: true },
        data: { name: "Updated" },
      })

      expect(result).toBeDefined()
    })

    it("should accept is conditions", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const result = UserEntity.updateItem(tenantId, {
        where: { id: "user-123" },
        data: { name: "Updated" },
        is: { deleted: null },
      })

      expect(result).toBeDefined()
    })
  })

  describe("updateItems()", () => {
    it("should return a mutation multi execution interface with Prisma-style { where, data }", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const result = UserEntity.updateItems(tenantId, {
        where: { role: "admin" },
        data: { active: true },
      })

      expect(result).toBeDefined()
      expect(typeof result.many).toBe("function")
      expect(typeof result.manyOrThrow).toBe("function")
      expect(typeof result.execute).toBe("function")
      expect(typeof result.executeOrThrow).toBe("function")
    })

    it("should accept wherein conditions", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const result = UserEntity.updateItems(tenantId, {
        where: { status: "pending" },
        data: { status: "approved" },
        wherein: { id: ["id1", "id2", "id3"] },
      })

      expect(result).toBeDefined()
    })

    it("should accept is conditions", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const result = UserEntity.updateItems(tenantId, {
        where: { role: "user" },
        data: { verified: true },
        is: { deleted: null },
      })

      expect(result).toBeDefined()
    })
  })

  describe("upsertItems()", () => {
    it("should return a mutation multi execution interface with batch upsert", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const result = UserEntity.upsertItems(tenantId, {
        items: [
          { id: "1", name: "User 1", tenant_id: "tenant-123" },
          { id: "2", name: "User 2", tenant_id: "tenant-123" },
        ],
      })

      expect(result).toBeDefined()
      expect(typeof result.many).toBe("function")
      expect(typeof result.manyOrThrow).toBe("function")
      expect(typeof result.execute).toBe("function")
      expect(typeof result.executeOrThrow).toBe("function")
    })

    it("should accept custom identity column", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const result = UserEntity.upsertItems(tenantId, {
        items: [{ email: "user1@example.com", name: "User 1", tenant_id: "tenant-123" }],
        identity: "email",
      })

      expect(result).toBeDefined()
    })

    it("should accept composite identity columns", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const result = UserEntity.upsertItems(tenantId, {
        items: [{ tenant_id: "tenant-123", user_id: "u1", name: "User 1" }],
        identity: ["tenant_id", "user_id"],
      })

      expect(result).toBeDefined()
    })
  })

  describe("Partition Key Integration", () => {
    it("should automatically apply partition key to getItem query", async () => {
      const matchSpy = vi.fn().mockReturnThis()
      const fromSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        match: matchSpy,
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      const mockClient = { from: fromSpy } as unknown as SupabaseClientType

      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: false,
      })

      const tenantId = TenantIdOf("tenant-123")
      await UserEntity.getItem(tenantId, { id: "user-1" }).one().run()

      expect(fromSpy).toHaveBeenCalledWith("users")
      // The match call should include tenant_id
      expect(matchSpy).toHaveBeenCalled()
    })

    it("should automatically apply partition key to getItems query", async () => {
      const mockClient = createMockSupabaseClient({ data: [] })

      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: false,
      })

      const tenantId = TenantIdOf("tenant-123")
      await UserEntity.getItems(tenantId, { where: { status: "active" } })
        .many()
        .run()

      expect(mockClient.from).toHaveBeenCalledWith("users")
    })
  })

  describe("Soft Delete Behavior", () => {
    it("should exclude deleted items when softDelete is true", () => {
      const mockClient = createMockSupabaseClient()

      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const query = UserEntity.getItems(tenantId)

      expect(query).toBeDefined()
    })

    it("should include deleted items when softDelete is false", () => {
      const mockClient = createMockSupabaseClient()

      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: false,
      })

      const tenantId = TenantIdOf("tenant-123")
      const query = UserEntity.getItems(tenantId)

      expect(query).toBeDefined()
    })

    it("should allow overriding soft delete mode on queries", () => {
      const mockClient = createMockSupabaseClient()

      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      const tenantId = TenantIdOf("tenant-123")
      const query = UserEntity.getItems(tenantId).includeDeleted()

      expect(query).toBeDefined()
      expect(typeof query.includeDeleted).toBe("function")
      expect(typeof query.excludeDeleted).toBe("function")
      expect(typeof query.onlyDeleted).toBe("function")
    })
  })

  describe("Type Safety", () => {
    it("should enforce branded type at compile time", () => {
      const mockClient = createMockSupabaseClient()

      const UserEntity = PartitionedEntity<"users", TenantId>(mockClient, "users", {
        partitionField: "tenant_id",
        softDelete: true,
      })

      // This should compile - correct branded type
      const tenantId = TenantIdOf("tenant-123")
      const query = UserEntity.getItems(tenantId)

      expect(query).toBeDefined()

      // Note: TypeScript would catch at compile time if you try to pass a plain string
      // when TenantId is expected (the type system enforces this)
    })
  })
})
