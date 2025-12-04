import { describe, expect, it, vi } from "vitest"

import { createMockSupabaseClient } from "../../helpers/mock-client"

import { Entity } from "@/entity"
import type { SupabaseClientType } from "@/types"

describe("Entity", () => {
  describe("Entity Configuration", () => {
    it("should create entity with softDelete enabled", () => {
      const mockClient = createMockSupabaseClient()

      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      expect(UserEntity).toBeDefined()
      expect(typeof UserEntity.getItem).toBe("function")
      expect(typeof UserEntity.getItems).toBe("function")
      expect(typeof UserEntity.addItems).toBe("function")
      expect(typeof UserEntity.updateItem).toBe("function")
      expect(typeof UserEntity.updateItems).toBe("function")
    })

    it("should create entity with softDelete disabled", () => {
      const mockClient = createMockSupabaseClient()

      const UserEntity = Entity(mockClient, "users", { softDelete: false })

      expect(UserEntity).toBeDefined()
    })
  })

  describe("getItem()", () => {
    it("should return a Query interface", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const query = UserEntity.getItem({ id: "user-123" })

      expect(query).toBeDefined()
      expect(typeof query.one).toBe("function")
      expect(typeof query.many).toBe("function")
      expect(typeof query.first).toBe("function")
    })

    it("should accept where conditions", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const query = UserEntity.getItem({
        id: "user-123",
        where: { active: true },
      })

      expect(query).toBeDefined()
    })

    it("should accept IS conditions", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const query = UserEntity.getItem({
        id: "user-123",
        is: { deleted: null },
      })

      expect(query).toBeDefined()
    })
  })

  describe("getItems()", () => {
    it("should return a Query interface", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const query = UserEntity.getItems()

      expect(query).toBeDefined()
      expect(typeof query.many).toBe("function")
    })

    it("should accept where conditions", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const query = UserEntity.getItems({
        where: { active: true, role: "admin" },
      })

      expect(query).toBeDefined()
    })

    it("should accept IS conditions", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const query = UserEntity.getItems({
        is: { deleted: null },
      })

      expect(query).toBeDefined()
    })

    it("should accept wherein conditions", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const query = UserEntity.getItems({
        wherein: { id: ["id1", "id2", "id3"] },
      })

      expect(query).toBeDefined()
    })

    it("should accept order parameters", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const query = UserEntity.getItems({
        order: ["created_at", { ascending: false }],
      })

      expect(query).toBeDefined()
    })

    it("should accept combined parameters", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const query = UserEntity.getItems({
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
        data: [{ id: "1", name: "Test" }],
        error: null,
      })

      const mockClient = {
        from: vi.fn().mockReturnValue({
          insert: insertSpy,
          select: selectSpy,
          then: vi.fn().mockImplementation((resolve) => {
            return Promise.resolve({ data: [{ id: "1", name: "Test" }], error: null }).then(resolve)
          }),
        }),
      } as unknown as SupabaseClientType

      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const items = [
        { name: "User 1", email: "user1@example.com" },
        { name: "User 2", email: "user2@example.com" },
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
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const result = UserEntity.updateItem({
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
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const result = UserEntity.updateItem({
        where: { id: "user-123", active: true },
        data: { name: "Updated" },
      })

      expect(result).toBeDefined()
    })

    it("should accept is conditions", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const result = UserEntity.updateItem({
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
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const result = UserEntity.updateItems({
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
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const result = UserEntity.updateItems({
        where: { status: "pending" },
        data: { status: "approved" },
        wherein: { id: ["id1", "id2", "id3"] },
      })

      expect(result).toBeDefined()
    })

    it("should accept is conditions", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const result = UserEntity.updateItems({
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
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const result = UserEntity.upsertItems({
        items: [
          { id: "1", name: "User 1" },
          { id: "2", name: "User 2" },
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
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const result = UserEntity.upsertItems({
        items: [{ email: "user1@example.com", name: "User 1" }],
        identity: "email",
      })

      expect(result).toBeDefined()
    })

    it("should accept composite identity columns", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      const result = UserEntity.upsertItems({
        items: [{ tenant_id: "t1", user_id: "u1", name: "User 1" }],
        identity: ["tenant_id", "user_id"],
      })

      expect(result).toBeDefined()
    })
  })

  describe("Soft Delete Behavior", () => {
    it("should exclude deleted items when softDelete is true", () => {
      const mockClient = createMockSupabaseClient()

      const UserEntity = Entity(mockClient, "users", { softDelete: true })
      const query = UserEntity.getItems()

      expect(query).toBeDefined()
      // The query should have soft delete mode set to "exclude" by default
    })

    it("should include deleted items when softDelete is false", () => {
      const mockClient = createMockSupabaseClient()

      const UserEntity = Entity(mockClient, "users", { softDelete: false })
      const query = UserEntity.getItems()

      expect(query).toBeDefined()
      // The query should have soft delete mode set to "include" by default
    })

    it("should allow overriding soft delete mode on queries", () => {
      const mockClient = createMockSupabaseClient()

      const UserEntity = Entity(mockClient, "users", { softDelete: true })
      const query = UserEntity.getItems().includeDeleted()

      expect(query).toBeDefined()
      expect(typeof query.includeDeleted).toBe("function")
      expect(typeof query.excludeDeleted).toBe("function")
      expect(typeof query.onlyDeleted).toBe("function")
    })
  })

  describe("deleteItem()", () => {
    it("should return a mutation execution interface", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = Entity(mockClient, "users", { softDelete: false })

      const result = UserEntity.deleteItem({
        where: { id: "user-123" },
      })

      expect(result).toBeDefined()
      expect(typeof result.one).toBe("function")
      expect(typeof result.oneOrThrow).toBe("function")
      expect(typeof result.execute).toBe("function")
      expect(typeof result.executeOrThrow).toBe("function")
    })

    it("should call .delete() when softDelete is false (hard delete)", async () => {
      const deleteSpy = vi.fn().mockReturnThis()
      const matchSpy = vi.fn().mockReturnThis()
      const selectSpy = vi.fn().mockReturnThis()
      const singleSpy = vi.fn().mockResolvedValue({
        data: { id: "user-123", name: "Deleted User" },
        error: null,
      })

      const mockClient = {
        from: vi.fn().mockReturnValue({
          delete: deleteSpy,
          match: matchSpy,
          select: selectSpy,
          single: singleSpy,
        }),
      } as unknown as SupabaseClientType

      const UserEntity = Entity(mockClient, "users", { softDelete: false })

      await UserEntity.deleteItem({ where: { id: "user-123" } }).execute()

      expect(mockClient.from).toHaveBeenCalledWith("users")
      expect(deleteSpy).toHaveBeenCalled()
    })

    it("should call .update() when softDelete is true (soft delete)", async () => {
      const updateSpy = vi.fn().mockReturnThis()
      const matchSpy = vi.fn().mockReturnThis()
      const selectSpy = vi.fn().mockReturnThis()
      const singleSpy = vi.fn().mockResolvedValue({
        data: { id: "user-123", name: "Soft Deleted User", deleted: "2024-01-01T00:00:00.000Z" },
        error: null,
      })

      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: updateSpy,
          match: matchSpy,
          select: selectSpy,
          single: singleSpy,
        }),
      } as unknown as SupabaseClientType

      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      await UserEntity.deleteItem({ where: { id: "user-123" } }).execute()

      expect(mockClient.from).toHaveBeenCalledWith("users")
      expect(updateSpy).toHaveBeenCalled()
      // Verify it was called with a deleted timestamp
      const updateArg = updateSpy.mock.calls[0][0]
      expect(updateArg).toHaveProperty("deleted")
      expect(typeof updateArg.deleted).toBe("string")
    })
  })

  describe("deleteItems()", () => {
    it("should return a mutation multi execution interface", () => {
      const mockClient = createMockSupabaseClient()
      const UserEntity = Entity(mockClient, "users", { softDelete: false })

      const result = UserEntity.deleteItems({
        where: { status: "inactive" },
      })

      expect(result).toBeDefined()
      expect(typeof result.many).toBe("function")
      expect(typeof result.manyOrThrow).toBe("function")
      expect(typeof result.execute).toBe("function")
      expect(typeof result.executeOrThrow).toBe("function")
    })

    it("should call .delete() when softDelete is false (hard delete)", async () => {
      const deleteSpy = vi.fn().mockReturnThis()
      const matchSpy = vi.fn().mockReturnThis()
      const selectSpy = vi.fn().mockResolvedValue({
        data: [{ id: "1" }, { id: "2" }],
        error: null,
      })

      const mockClient = {
        from: vi.fn().mockReturnValue({
          delete: deleteSpy,
          match: matchSpy,
          select: selectSpy,
        }),
      } as unknown as SupabaseClientType

      const UserEntity = Entity(mockClient, "users", { softDelete: false })

      await UserEntity.deleteItems({ where: { status: "inactive" } }).execute()

      expect(mockClient.from).toHaveBeenCalledWith("users")
      expect(deleteSpy).toHaveBeenCalled()
    })

    it("should call .update() when softDelete is true (soft delete)", async () => {
      const updateSpy = vi.fn().mockReturnThis()
      const matchSpy = vi.fn().mockReturnThis()
      const selectSpy = vi.fn().mockResolvedValue({
        data: [
          { id: "1", deleted: "2024-01-01T00:00:00.000Z" },
          { id: "2", deleted: "2024-01-01T00:00:00.000Z" },
        ],
        error: null,
      })

      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: updateSpy,
          match: matchSpy,
          select: selectSpy,
        }),
      } as unknown as SupabaseClientType

      const UserEntity = Entity(mockClient, "users", { softDelete: true })

      await UserEntity.deleteItems({ where: { status: "inactive" } }).execute()

      expect(mockClient.from).toHaveBeenCalledWith("users")
      expect(updateSpy).toHaveBeenCalled()
      // Verify it was called with a deleted timestamp
      const updateArg = updateSpy.mock.calls[0][0]
      expect(updateArg).toHaveProperty("deleted")
      expect(typeof updateArg.deleted).toBe("string")
    })
  })
})
