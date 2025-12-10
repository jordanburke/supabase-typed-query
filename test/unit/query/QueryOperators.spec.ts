import { describe, expect, it } from "vitest"

import { createMockSupabaseClient } from "../../helpers/mock-client"

import { query } from "@/query"

describe("Query Comparison Operators", () => {
  const mockClient = createMockSupabaseClient({
    data: [],
    error: null,
  })

  describe("Greater Than (gt)", () => {
    it("should support gt operator", () => {
      const q = query(mockClient, "posts", { view_count: { gt: 100 } })

      expect(q).toBeDefined()
      expect(typeof q.many).toBe("function")
    })

    it("should support gt in top-level object", () => {
      const q = query(mockClient, "posts", { gt: { view_count: 100 } })

      expect(q).toBeDefined()
    })
  })

  describe("Greater Than or Equal (gte)", () => {
    it("should support gte operator", () => {
      const q = query(mockClient, "posts", { view_count: { gte: 100 } })

      expect(q).toBeDefined()
    })

    it("should support gte with Date values", () => {
      const date = new Date("2024-01-01")
      const q = query(mockClient, "posts", { created_at: { gte: date } })

      expect(q).toBeDefined()
    })
  })

  describe("Less Than (lt)", () => {
    it("should support lt operator", () => {
      const q = query(mockClient, "posts", { view_count: { lt: 1000 } })

      expect(q).toBeDefined()
    })
  })

  describe("Less Than or Equal (lte)", () => {
    it("should support lte operator", () => {
      const q = query(mockClient, "posts", { view_count: { lte: 1000 } })

      expect(q).toBeDefined()
    })
  })

  describe("Not Equal (neq)", () => {
    it("should support neq operator", () => {
      const q = query(mockClient, "posts", { status: { neq: "draft" } })

      expect(q).toBeDefined()
    })

    it("should support neq with null", () => {
      const q = query(mockClient, "posts", { published_at: { neq: null } })

      expect(q).toBeDefined()
    })
  })

  describe("IN operator", () => {
    it("should support in operator with array", () => {
      const q = query(mockClient, "posts", { status: { in: ["draft", "published"] } })

      expect(q).toBeDefined()
    })

    it("should support in operator with multiple IDs", () => {
      const q = query(mockClient, "posts", { id: { in: ["id1", "id2", "id3"] } })

      expect(q).toBeDefined()
    })
  })

  describe("IS NULL checks", () => {
    it("should support is null check", () => {
      const q = query(mockClient, "posts", { published_at: { is: null } })

      expect(q).toBeDefined()
    })

    it("should support is true check", () => {
      const q = query(mockClient, "users", { active: { is: true } })

      expect(q).toBeDefined()
    })

    it("should support is false check", () => {
      const q = query(mockClient, "users", { active: { is: false } })

      expect(q).toBeDefined()
    })

    it("should support direct null comparison", () => {
      const q = query(mockClient, "posts", { deleted: null })

      expect(q).toBeDefined()
    })
  })

  describe("Pattern Matching", () => {
    it("should support like operator", () => {
      const q = query(mockClient, "posts", { title: { like: "%typescript%" } })

      expect(q).toBeDefined()
    })

    it("should support ilike operator (case-insensitive)", () => {
      const q = query(mockClient, "posts", { title: { ilike: "%TypeScript%" } })

      expect(q).toBeDefined()
    })

    it("should support like in top-level object", () => {
      const q = query(mockClient, "posts", { like: { title: "%test%" } } as never)

      expect(q).toBeDefined()
    })
  })

  describe("Combined Operators", () => {
    it("should support multiple operators on different fields", () => {
      const q = query(mockClient, "posts", {
        view_count: { gte: 100 },
        status: { in: ["published", "archived"] },
        title: { ilike: "%test%" },
      })

      expect(q).toBeDefined()
    })

    it("should support range queries with gt and lt", () => {
      const q = query(mockClient, "posts", {
        view_count: { gt: 10 },
        created_at: { lt: new Date() },
      })

      expect(q).toBeDefined()
    })
  })

  describe("Operator Type Safety", () => {
    it("should work with numeric comparisons", () => {
      const q = query(mockClient, "users", {
        age: { gte: 18, lte: 65 },
      })

      expect(q).toBeDefined()
    })

    it("should work with string pattern matching", () => {
      const q = query(mockClient, "users", {
        email: { ilike: "%@example.com" },
        name: { like: "John%" },
      })

      expect(q).toBeDefined()
    })
  })

  describe("NOT operator", () => {
    it("should support not is null (IS NOT NULL)", () => {
      const q = query(mockClient, "posts", { not: { is: { published_at: null } } })

      expect(q).toBeDefined()
      expect(typeof q.many).toBe("function")
    })

    it("should support not is true (IS NOT TRUE)", () => {
      const q = query(mockClient, "users", { not: { is: { active: true } } })

      expect(q).toBeDefined()
    })

    it("should support not is false (IS NOT FALSE)", () => {
      const q = query(mockClient, "users", { not: { is: { active: false } } })

      expect(q).toBeDefined()
    })

    it("should support not in (NOT IN)", () => {
      const q = query(mockClient, "posts", { not: { in: { status: ["draft", "archived"] } } })

      expect(q).toBeDefined()
    })

    it("should support combined not conditions", () => {
      const q = query(mockClient, "posts", {
        not: {
          is: { deleted: null },
          in: { status: ["spam", "trash"] },
        },
      })

      expect(q).toBeDefined()
    })

    it("should support not with other operators", () => {
      const q = query(mockClient, "posts", {
        status: "published",
        not: { is: { external_id: null } },
      })

      expect(q).toBeDefined()
    })
  })
})
