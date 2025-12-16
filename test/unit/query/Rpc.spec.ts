import { describe, expect, it } from "vitest"

import { createMockClientWithData, createMockClientWithError } from "../../helpers/mock-client"

import { rpc } from "@/query"

describe("RPC (Remote Procedure Call)", () => {
  describe("one() method", () => {
    it("should return Either<Error, Option<T>> with data", async () => {
      const mockData = { total: 100, active: 50, inactive: 50 }
      const client = createMockClientWithData(mockData)

      const result = await rpc(client, "get_user_stats", { user_id: "123" }).one().run()

      expect(result.isRight()).toBe(true)
      const optionResult = result.orThrow()
      expect(optionResult.isSome()).toBe(true)
      expect(optionResult.orElse(null)).toEqual(mockData)
    })

    it("should return first element when data is an array", async () => {
      const mockData = [
        { id: "1", name: "Result 1" },
        { id: "2", name: "Result 2" },
      ]
      const client = createMockClientWithData(mockData)

      const result = await rpc(client, "search_items", { query: "test" }).one().run()

      expect(result.isRight()).toBe(true)
      const optionResult = result.orThrow()
      expect(optionResult.isSome()).toBe(true)
      expect(optionResult.orElse(null)).toEqual({ id: "1", name: "Result 1" })
    })

    it("should return empty Option when no data returned", async () => {
      const client = createMockClientWithData(null)

      const result = await rpc(client, "get_user_stats", { user_id: "999" }).one().run()

      expect(result.isRight()).toBe(true)
      const optionResult = result.orThrow()
      expect(optionResult.isEmpty).toBe(true)
    })

    it("should return empty Option when empty array returned", async () => {
      const client = createMockClientWithData([])

      const result = await rpc(client, "search_items", { query: "nonexistent" }).one().run()

      expect(result.isRight()).toBe(true)
      const optionResult = result.orThrow()
      expect(optionResult.isEmpty).toBe(true)
    })

    it("should return Left when RPC call fails", async () => {
      const mockError = { message: "Function not found", code: "42883" }
      const client = createMockClientWithError(mockError)

      const result = await rpc(client, "nonexistent_function", {}).one().run()

      expect(result.isLeft()).toBe(true)
    })
  })

  describe("oneOrThrow() method", () => {
    it("should return data directly when found", async () => {
      const mockData = { total: 100, active: 50 }
      const client = createMockClientWithData(mockData)

      const result = await rpc(client, "get_stats", {}).oneOrThrow()

      expect(result).toEqual(mockData)
    })

    it("should throw when no data returned", async () => {
      const client = createMockClientWithData(null)

      await expect(rpc(client, "get_stats", {}).oneOrThrow()).rejects.toThrow("RPC call returned no result")
    })

    it("should throw when empty array returned", async () => {
      const client = createMockClientWithData([])

      await expect(rpc(client, "search_items", {}).oneOrThrow()).rejects.toThrow("RPC call returned no result")
    })

    it("should throw when RPC call fails", async () => {
      const mockError = { message: "Database error" }
      const client = createMockClientWithError(mockError)

      await expect(rpc(client, "get_stats", {}).oneOrThrow()).rejects.toThrow()
    })
  })

  describe("many() method", () => {
    it("should return Either<Error, List<T>> with data", async () => {
      const mockData = [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
        { id: "3", name: "Item 3" },
      ]
      const client = createMockClientWithData(mockData)

      const result = await rpc(client, "search_items", { query: "test" }).many().run()

      expect(result.isRight()).toBe(true)
      const list = result.orThrow()
      expect(list.length).toBe(3)
      expect(list.toArray()).toEqual(mockData)
    })

    it("should wrap single value in List", async () => {
      const mockData = { total: 100 }
      const client = createMockClientWithData(mockData)

      const result = await rpc(client, "get_count", {}).many().run()

      expect(result.isRight()).toBe(true)
      const list = result.orThrow()
      expect(list.length).toBe(1)
      expect(list.head).toEqual(mockData)
    })

    it("should return empty List when no data returned", async () => {
      const client = createMockClientWithData(null)

      const result = await rpc(client, "search_items", {}).many().run()

      expect(result.isRight()).toBe(true)
      const list = result.orThrow()
      expect(list.isEmpty).toBe(true)
    })

    it("should return empty List when empty array returned", async () => {
      const client = createMockClientWithData([])

      const result = await rpc(client, "search_items", { query: "nonexistent" }).many().run()

      expect(result.isRight()).toBe(true)
      const list = result.orThrow()
      expect(list.isEmpty).toBe(true)
    })

    it("should return Left when RPC call fails", async () => {
      const mockError = { message: "Permission denied" }
      const client = createMockClientWithError(mockError)

      const result = await rpc(client, "restricted_function", {}).many().run()

      expect(result.isLeft()).toBe(true)
    })
  })

  describe("manyOrThrow() method", () => {
    it("should return List directly when data found", async () => {
      const mockData = [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ]
      const client = createMockClientWithData(mockData)

      const result = await rpc(client, "search_items", {}).manyOrThrow()

      expect(result.length).toBe(2)
      expect(result.toArray()).toEqual(mockData)
    })

    it("should return empty List when no data found", async () => {
      const client = createMockClientWithData([])

      const result = await rpc(client, "search_items", {}).manyOrThrow()

      expect(result.isEmpty).toBe(true)
    })

    it("should throw when RPC call fails", async () => {
      const mockError = { message: "Database error" }
      const client = createMockClientWithError(mockError)

      await expect(rpc(client, "get_items", {}).manyOrThrow()).rejects.toThrow()
    })
  })

  describe("Error Handling", () => {
    it("should wrap errors in Either", async () => {
      const mockError = { message: "Network error", code: "NETWORK_ERROR" }
      const client = createMockClientWithError(mockError)

      const result = await rpc(client, "any_function", {}).many().run()

      expect(result.isLeft()).toBe(true)
      expect(result.isRight()).toBe(false)
    })

    it("should allow error pattern matching with fold", async () => {
      const mockError = { message: "Function not found" }
      const client = createMockClientWithError(mockError)

      const result = await rpc(client, "nonexistent", {}).one().run()

      const handled = result.fold(
        (error) => `Error: ${error.message}`,
        () => "Success",
      )

      expect(handled).toContain("Error:")
    })
  })

  describe("Function Arguments", () => {
    it("should call RPC with provided arguments", async () => {
      const mockData = { result: "success" }
      const client = createMockClientWithData(mockData)

      await rpc(client, "process_data", { input: "test", limit: 10 }).one().run()

      // Verify rpc was called with correct function name and args
      expect(client.rpc).toHaveBeenCalledWith("process_data", { input: "test", limit: 10 }, { count: undefined })
    })

    it("should handle no arguments", async () => {
      const mockData = { result: "success" }
      const client = createMockClientWithData(mockData)

      await rpc(client, "get_all_items").one().run()

      expect(client.rpc).toHaveBeenCalledWith("get_all_items", {}, { count: undefined })
    })

    it("should pass count option when provided", async () => {
      const mockData = [{ id: "1" }]
      const client = createMockClientWithData(mockData)

      await rpc(client, "search_items", { query: "test" }, { count: "exact" }).many().run()

      expect(client.rpc).toHaveBeenCalledWith("search_items", { query: "test" }, { count: "exact" })
    })
  })
})
