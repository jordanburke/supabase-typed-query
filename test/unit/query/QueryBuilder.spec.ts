import { describe, expect, it, vi } from "vitest"

import { createMockSupabaseClient } from "../../helpers/mock-client"

import type { QueryBuilderConfig } from "@/query/Query"
import { QueryBuilder } from "@/query/QueryBuilder"
import type { SupabaseClientType } from "@/types"

// Mock row type for testing
type UserRow = {
  id: string
  name: string
  role: string
  active: boolean
  deleted: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConfig = QueryBuilderConfig<any>

// Helper to create test configs with proper typing for mock clients
const testConfig = (config: QueryBuilderConfig<UserRow>): AnyConfig => config as AnyConfig

describe("QueryBuilder", () => {
  // Mock client for testing
  const mockClient: SupabaseClientType = createMockSupabaseClient({
    data: [{ id: "1", name: "Test" }],
    error: null,
  })

  describe("Constructor Function", () => {
    it("should create a Query interface from config", () => {
      const config = testConfig({
        table: "users",
        conditions: [{ where: { id: "test-id" } }],
      })

      const query = QueryBuilder(mockClient, config)

      // Check that all required methods exist
      expect(typeof query.one).toBe("function")
      expect(typeof query.many).toBe("function")
      expect(typeof query.first).toBe("function")
      expect(typeof query.oneOrThrow).toBe("function")
      expect(typeof query.manyOrThrow).toBe("function")
      expect(typeof query.firstOrThrow).toBe("function")
      expect(typeof query.or).toBe("function")
      expect(typeof query.whereId).toBe("function")
      expect(typeof query.orWhereId).toBe("function")
      expect(typeof query.map).toBe("function")
      expect(typeof query.filter).toBe("function")
      expect(typeof query.limit).toBe("function")
      expect(typeof query.offset).toBe("function")
      expect(typeof query.includeDeleted).toBe("function")
      expect(typeof query.excludeDeleted).toBe("function")
      expect(typeof query.onlyDeleted).toBe("function")
    })

    it("should handle empty where conditions", () => {
      const config = testConfig({
        table: "users",
        conditions: [{ where: {} }],
      })

      const query = QueryBuilder(mockClient, config)
      expect(query).toBeDefined()
    })

    it("should handle multiple conditions", () => {
      const config = testConfig({
        table: "users",
        conditions: [{ where: { role: "admin" } }, { where: { role: "contributor" } }, { where: { deleted: null } }],
      })

      const query = QueryBuilder(mockClient, config)
      expect(query).toBeDefined()
    })
  })

  describe("OR Method", () => {
    it("should add OR conditions to existing query", () => {
      const config = testConfig({
        table: "users",
        conditions: [{ where: { role: "admin" } }],
      })

      const query1 = QueryBuilder(mockClient, config)
      const query2 = query1.or({ role: "contributor" })

      // Should return a new query instance
      expect(query2).not.toBe(query1)
      expect(query2).toBeDefined()
      expect(typeof query2.or).toBe("function")
    })

    it("should chain multiple OR conditions", () => {
      const config = testConfig({
        table: "users",
        conditions: [{ where: { role: "admin" } }],
      })

      const query = QueryBuilder(mockClient, config)
        .or({ role: "contributor" })
        .or({ role: "viewer" })
        .or({ active: true })

      expect(query).toBeDefined()
      expect(typeof query.many).toBe("function")
    })

    it("should support IS conditions in OR", () => {
      const config = testConfig({
        table: "users",
        conditions: [{ where: { role: "admin" } }],
      })

      const query = QueryBuilder(mockClient, config).or({ role: "contributor" }, { deleted: null })

      expect(query).toBeDefined()
    })
  })

  describe("Map Method", () => {
    it("should transform query results", () => {
      const data = [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
      ]
      const client = createMockSupabaseClient({ data, error: null })

      const config = testConfig({
        table: "users",
        conditions: [{ where: {} }],
      })

      const query = QueryBuilder(client, config).map((user) => user.name)

      expect(query).toBeDefined()
      expect(typeof query.map).toBe("function")
      expect(typeof query.many).toBe("function")
    })

    it("should chain multiple map operations", () => {
      const config = testConfig({
        table: "users",
        conditions: [{ where: {} }],
      })

      const query = QueryBuilder(mockClient, config)
        .map((user) => user.name)
        .map((name) => (name as string).toUpperCase())

      expect(query).toBeDefined()
    })
  })

  describe("Filter Method", () => {
    it("should filter query results", () => {
      const config = testConfig({
        table: "users",
        conditions: [{ where: {} }],
      })

      const query = QueryBuilder(mockClient, config).filter((user) => user.active === true)

      expect(query).toBeDefined()
      expect(typeof query.filter).toBe("function")
    })

    it("should chain multiple filter operations", () => {
      const config = testConfig({
        table: "users",
        conditions: [{ where: {} }],
      })

      const query = QueryBuilder(mockClient, config)
        .filter((user) => user.active === true)
        .filter((user) => user.role === "admin")

      expect(query).toBeDefined()
    })
  })

  describe("Pagination Methods", () => {
    it("should add limit to query", () => {
      const config = testConfig({
        table: "users",
        conditions: [{ where: {} }],
      })

      const query = QueryBuilder(mockClient, config).limit(10)

      expect(query).toBeDefined()
    })

    it("should add offset to query", () => {
      const config = testConfig({
        table: "users",
        conditions: [{ where: {} }],
      })

      const query = QueryBuilder(mockClient, config).offset(20)

      expect(query).toBeDefined()
    })

    it("should combine limit and offset", () => {
      const config = testConfig({
        table: "users",
        conditions: [{ where: {} }],
      })

      const query = QueryBuilder(mockClient, config).limit(10).offset(20)

      expect(query).toBeDefined()
    })
  })

  describe("Soft Delete Methods", () => {
    it("should support includeDeleted mode", () => {
      const config = testConfig({
        table: "users",
        conditions: [{ where: {} }],
        softDeleteMode: "exclude",
      })

      const query = QueryBuilder(mockClient, config).includeDeleted()

      expect(query).toBeDefined()
    })

    it("should support excludeDeleted mode", () => {
      const config = testConfig({
        table: "users",
        conditions: [{ where: {} }],
        softDeleteMode: "include",
      })

      const query = QueryBuilder(mockClient, config).excludeDeleted()

      expect(query).toBeDefined()
    })

    it("should support onlyDeleted mode", () => {
      const config = testConfig({
        table: "users",
        conditions: [{ where: {} }],
      })

      const query = QueryBuilder(mockClient, config).onlyDeleted()

      expect(query).toBeDefined()
    })
  })

  describe("Query Building", () => {
    it("should call from with correct table name", () => {
      const config = testConfig({
        table: "users",
        conditions: [{ where: { id: "test-id" } }],
      })

      void QueryBuilder(mockClient, config).many()

      expect(mockClient.from).toHaveBeenCalledWith("users")
    })

    it("should build query with where conditions", () => {
      const fromSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        match: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: [], error: null }),
      })

      const client = { from: fromSpy } as unknown as SupabaseClientType

      const config = testConfig({
        table: "users",
        conditions: [{ where: { name: "Test User" } }],
      })

      QueryBuilder(client, config).many()

      expect(fromSpy).toHaveBeenCalledWith("users")
    })
  })
})
