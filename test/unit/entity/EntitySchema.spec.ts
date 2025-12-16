import { describe, expect, it } from "vitest"

import { createMockSupabaseClient } from "../../helpers/mock-client"

import { Entity } from "@/entity"
import { PartitionedEntity } from "@/entity/PartitionedEntity"

describe("Entity Schema Support", () => {
  describe("Entity with schema config", () => {
    it("should create entity with custom schema", () => {
      const mockClient = createMockSupabaseClient()

      const InventoryEntity = Entity(mockClient, "items", {
        softDelete: false,
        schema: "inventory",
      })

      expect(InventoryEntity).toBeDefined()
      expect(typeof InventoryEntity.getItem).toBe("function")
      expect(typeof InventoryEntity.getItems).toBe("function")
    })

    it("should use schema() method when custom schema is provided", async () => {
      const mockClient = createMockSupabaseClient({ data: [{ id: "1", name: "test" }] })

      const InventoryEntity = Entity(mockClient, "items", {
        softDelete: false,
        schema: "inventory",
      })

      // Execute query to trigger the schema call
      await InventoryEntity.getItems().many().run()

      // Verify schema() was called with the custom schema
      expect(mockClient.schema).toHaveBeenCalledWith("inventory")
    })

    it("should use from() directly when no schema is provided", async () => {
      const mockClient = createMockSupabaseClient({ data: [{ id: "1", name: "test" }] })

      const UserEntity = Entity(mockClient, "users", {
        softDelete: false,
      })

      // Execute query
      await UserEntity.getItems().many().run()

      // Verify from() was called directly (schema() should not be called)
      expect(mockClient.from).toHaveBeenCalledWith("users")
    })
  })

  describe("PartitionedEntity with schema config", () => {
    it("should create partitioned entity with custom schema", () => {
      const mockClient = createMockSupabaseClient()

      const TenantItemsEntity = PartitionedEntity(mockClient, "items", {
        partitionField: "tenant_id",
        softDelete: false,
        schema: "tenant_data",
      })

      expect(TenantItemsEntity).toBeDefined()
      expect(typeof TenantItemsEntity.getItem).toBe("function")
      expect(typeof TenantItemsEntity.getItems).toBe("function")
    })

    it("should use schema() method for partitioned entity queries", async () => {
      const mockClient = createMockSupabaseClient({ data: [{ id: "1", tenant_id: "t1" }] })

      const TenantItemsEntity = PartitionedEntity(mockClient, "items", {
        partitionField: "tenant_id",
        softDelete: false,
        schema: "tenant_data",
      })

      // Execute query
      await TenantItemsEntity.getItems("tenant-123").many().run()

      // Verify schema() was called
      expect(mockClient.schema).toHaveBeenCalledWith("tenant_data")
    })
  })

  describe("Entity config defaults", () => {
    it("should default to public schema when not specified", () => {
      const mockClient = createMockSupabaseClient()

      const UserEntity = Entity(mockClient, "users", {
        softDelete: true,
      })

      expect(UserEntity).toBeDefined()
    })

    it("should accept undefined schema explicitly", () => {
      const mockClient = createMockSupabaseClient()

      const UserEntity = Entity(mockClient, "users", {
        softDelete: true,
        schema: undefined,
      })

      expect(UserEntity).toBeDefined()
    })
  })
})
