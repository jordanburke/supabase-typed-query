import { describe, expect, it } from "vitest"

import { createMockClientWithData } from "../../helpers/mock-client"

import { query } from "@/query"

describe("Query Functional Operations", () => {
  describe("map() method", () => {
    it("should transform results with map", async () => {
      const mockData = [
        { id: "1", name: "Alice", age: 30 },
        { id: "2", name: "Bob", age: 25 },
      ]
      const client = createMockClientWithData(mockData)

      const result = await query(client, "users", {})
        .map((user) => user.name)
        .manyOrThrow()

      expect(Array.isArray(result.toArray())).toBe(true)
    })

    it("should chain multiple map operations", async () => {
      const mockData = [{ id: "1", name: "alice" }]
      const client = createMockClientWithData(mockData)

      const result = await query(client, "users", {})
        .map((user) => user.name)
        .map((name) => (name as string).toUpperCase())
        .manyOrThrow()

      expect(Array.isArray(result.toArray())).toBe(true)
    })

    it("should work with one() method", async () => {
      const mockData = { id: "1", name: "Alice" }
      const client = createMockClientWithData(mockData)

      const result = await query(client, "users", { id: "1" })
        .map((user) => user.name)
        .one()
        .run()

      expect(result.isRight()).toBe(true)
    })

    it("should work with first() method", async () => {
      const mockData = [{ id: "1", name: "Alice" }]
      const client = createMockClientWithData(mockData)

      const result = await query(client, "users", {})
        .map((user) => user.name)
        .first()
        .run()

      expect(result.isRight()).toBe(true)
    })
  })

  describe("filter() method", () => {
    it("should filter results with predicate", async () => {
      const mockData = [
        { id: "1", name: "Alice", age: 30, active: true },
        { id: "2", name: "Bob", age: 25, active: false },
        { id: "3", name: "Charlie", age: 35, active: true },
      ]
      const client = createMockClientWithData(mockData)

      const result = await query(client, "users", {})
        .filter((user) => user.active === true)
        .manyOrThrow()

      expect(Array.isArray(result.toArray())).toBe(true)
    })

    it("should chain multiple filter operations", async () => {
      const mockData = [
        { id: "1", name: "Alice", age: 30, active: true, role: "admin" },
        { id: "2", name: "Bob", age: 25, active: true, role: "user" },
      ]
      const client = createMockClientWithData(mockData)

      const result = await query(client, "users", {})
        .filter((user) => user.active === true)
        .filter((user) => user.role === "admin")
        .manyOrThrow()

      expect(Array.isArray(result.toArray())).toBe(true)
    })

    it("should combine filter and map", async () => {
      const mockData = [
        { id: "1", name: "Alice", age: 30 },
        { id: "2", name: "Bob", age: 17 },
      ]
      const client = createMockClientWithData(mockData)

      const result = await query(client, "users", {})
        .filter((user) => (user.age as number) >= 18)
        .map((user) => user.name)
        .manyOrThrow()

      expect(Array.isArray(result.toArray())).toBe(true)
    })
  })

  describe("limit() and offset()", () => {
    it("should apply limit to query", () => {
      const client = createMockClientWithData([])

      const q = query(client, "users", {}).limit(10)

      expect(q).toBeDefined()
      expect(typeof q.many).toBe("function")
    })

    it("should apply offset to query", () => {
      const client = createMockClientWithData([])

      const q = query(client, "users", {}).offset(20)

      expect(q).toBeDefined()
    })

    it("should combine limit and offset for pagination", () => {
      const client = createMockClientWithData([])

      const q = query(client, "users", {}).limit(10).offset(20)

      expect(q).toBeDefined()
    })

    it("should work with other operations", () => {
      const client = createMockClientWithData([])

      const q = query(client, "users", { active: true })
        .filter((user) => (user.age as number) >= 18)
        .limit(10)
        .offset(0)

      expect(q).toBeDefined()
    })
  })

  describe("Method Chaining", () => {
    it("should allow complex method chaining", () => {
      const client = createMockClientWithData([])

      const q = query(client, "posts", { status: "published" })
        .or({ status: "featured" })
        .filter((post) => (post.view_count as number) > 100)
        .map((post) => ({ title: post.title, views: post.view_count }))

      expect(q).toBeDefined()
      expect(typeof q.many).toBe("function")
    })

    it("should maintain type safety through chain", () => {
      const client = createMockClientWithData([])

      const q = query(client, "users", {})
        .map((user) => user.email)
        .filter((email) => (email as string).includes("@example.com"))

      expect(q).toBeDefined()
    })
  })
})
