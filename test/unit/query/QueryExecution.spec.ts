import { describe, expect, it } from "vitest"

import { createMockClientWithData, createMockClientWithError } from "../../helpers/mock-client"

import { query } from "@/query"

describe("Query Execution Methods", () => {
  describe("one() method", () => {
    it("should return Either<Error, Option<T>> with data", async () => {
      const mockData = { id: "1", name: "Test User", email: "test@example.com" }
      const client = createMockClientWithData(mockData)

      const result = await query(client, "users", { id: "1" }).one().run()

      expect(result.isRight()).toBe(true)
      const optionResult = result.orThrow()
      expect(optionResult.isSome()).toBe(true)
    })

    it("should return empty Option when no data found", async () => {
      const client = createMockClientWithData(null)

      const result = await query(client, "users", { id: "999" }).one().run()

      expect(result.isRight()).toBe(true)
      const optionResult = result.orThrow()
      expect(optionResult.isEmpty).toBe(true)
    })

    it("should return Left when query fails", async () => {
      const mockError = { message: "Database error", code: "42P01" }
      const client = createMockClientWithError(mockError)

      const result = await query(client, "users", { id: "1" }).one().run()

      expect(result.isLeft()).toBe(true)
    })
  })

  describe("oneOrThrow() method", () => {
    it("should return data directly when found", async () => {
      const mockData = { id: "1", name: "Test User", email: "test@example.com" }
      const client = createMockClientWithData(mockData)

      const result = await query(client, "users", { id: "1" }).oneOrThrow()

      expect(result).toBeDefined()
      expect(result.id).toBe("1")
    })

    it("should throw when no data found", async () => {
      const client = createMockClientWithData(null)

      await expect(query(client, "users", { id: "999" }).oneOrThrow()).rejects.toThrow()
    })

    it("should throw when query fails", async () => {
      const mockError = { message: "Database error" }
      const client = createMockClientWithError(mockError)

      await expect(query(client, "users", { id: "1" }).oneOrThrow()).rejects.toThrow()
    })
  })

  describe("many() method", () => {
    it("should return Either<Error, List<T>> with data", async () => {
      const mockData = [
        { id: "1", name: "User 1" },
        { id: "2", name: "User 2" },
      ]
      const client = createMockClientWithData(mockData)

      const result = await query(client, "users", { active: true }).many().run()

      expect(result.isRight()).toBe(true)
      const list = result.orThrow()
      expect(Array.isArray(list.toArray())).toBe(true)
      expect(list.length).toBe(2)
    })

    it("should return empty List when no data found", async () => {
      const client = createMockClientWithData([])

      const result = await query(client, "users", { deleted: null }).many().run()

      expect(result.isRight()).toBe(true)
      const list = result.orThrow()
      expect(list.isEmpty).toBe(true)
    })

    it("should return Left when query fails", async () => {
      const mockError = { message: "Database error" }
      const client = createMockClientWithError(mockError)

      const result = await query(client, "users", {}).many().run()

      expect(result.isLeft()).toBe(true)
    })
  })

  describe("manyOrThrow() method", () => {
    it("should return List directly when data found", async () => {
      const mockData = [
        { id: "1", name: "User 1" },
        { id: "2", name: "User 2" },
      ]
      const client = createMockClientWithData(mockData)

      const result = await query(client, "users", {}).manyOrThrow()

      expect(Array.isArray(result.toArray())).toBe(true)
      expect(result.length).toBe(2)
    })

    it("should return empty List when no data found", async () => {
      const client = createMockClientWithData([])

      const result = await query(client, "users", {}).manyOrThrow()

      expect(Array.isArray(result.toArray())).toBe(true)
      expect(result.isEmpty).toBe(true)
    })

    it("should throw when query fails", async () => {
      const mockError = { message: "Database error" }
      const client = createMockClientWithError(mockError)

      await expect(query(client, "users", {}).manyOrThrow()).rejects.toThrow()
    })
  })

  describe("first() method", () => {
    it("should return first item from results", async () => {
      const mockData = [
        { id: "1", name: "User 1" },
        { id: "2", name: "User 2" },
      ]
      const client = createMockClientWithData(mockData)

      const result = await query(client, "users", {}).first().run()

      expect(result.isRight()).toBe(true)
      const optionResult = result.orThrow()
      expect(optionResult.isSome()).toBe(true)
    })

    it("should return empty Option when no results", async () => {
      const client = createMockClientWithData([])

      const result = await query(client, "users", {}).first().run()

      expect(result.isRight()).toBe(true)
      const optionResult = result.orThrow()
      expect(optionResult.isEmpty).toBe(true)
    })

    it("should return Left when query fails", async () => {
      const mockError = { message: "Database error" }
      const client = createMockClientWithError(mockError)

      const result = await query(client, "users", {}).first().run()

      expect(result.isLeft()).toBe(true)
    })
  })

  describe("firstOrThrow() method", () => {
    it("should return first item directly", async () => {
      const mockData = [
        { id: "1", name: "User 1" },
        { id: "2", name: "User 2" },
      ]
      const client = createMockClientWithData(mockData)

      const result = await query(client, "users", {}).firstOrThrow()

      expect(result).toBeDefined()
      expect(result.id).toBe("1")
    })

    it("should throw when no results", async () => {
      const client = createMockClientWithData([])

      await expect(query(client, "users", {}).firstOrThrow()).rejects.toThrow()
    })

    it("should throw when query fails", async () => {
      const mockError = { message: "Database error" }
      const client = createMockClientWithError(mockError)

      await expect(query(client, "users", {}).firstOrThrow()).rejects.toThrow()
    })
  })

  describe("Error Handling with Either", () => {
    it("should wrap errors in Either", async () => {
      const mockError = { message: "Network error", code: "NETWORK_ERROR" }
      const client = createMockClientWithError(mockError)

      const result = await query(client, "users", {}).many().run()

      expect(result.isLeft()).toBe(true)
      expect(result.isRight()).toBe(false)
    })

    it("should allow error pattern matching", async () => {
      const mockError = { message: "Not found" }
      const client = createMockClientWithError(mockError)

      const result = await query(client, "users", { id: "999" }).one().run()

      const handled = result.fold(
        (error) => `Error: ${error.message}`,
        (data) => `Success: ${data}`,
      )

      expect(handled).toContain("Error:")
    })
  })
})
