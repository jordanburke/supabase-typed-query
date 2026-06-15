import { describe, expect, it, vi } from "vitest"

import { createMockSupabaseClient } from "../../helpers/mock-client"

import { Entity } from "@/entity"
import { PartitionedEntity } from "@/entity/PartitionedEntity"
import type { SupabaseClientType } from "@/types"

/**
 * Grabs the query builder that the mock client's `from()` produced for the
 * most recent call, so we can assert which PostgREST methods were invoked.
 */
const lastBuilder = (client: SupabaseClientType) => {
  const fromMock = client.from as unknown as ReturnType<typeof vi.fn>
  const result = fromMock.mock.results.at(-1)
  if (!result) throw new Error("from() was never called")
  return result.value as { limit: ReturnType<typeof vi.fn>; range: ReturnType<typeof vi.fn> }
}

describe("Entity getItems pagination", () => {
  describe("limit/offset via params (Entity)", () => {
    it("applies limit via PostgREST .limit()", async () => {
      const client = createMockSupabaseClient({ data: [] })
      const Users = Entity(client, "users", { softDelete: false })

      await Users.getItems({ limit: 5 }).many().run()

      expect(lastBuilder(client).limit).toHaveBeenCalledWith(5)
    })

    it("applies offset-only via .range(offset, MAX_SAFE_INTEGER)", async () => {
      const client = createMockSupabaseClient({ data: [] })
      const Users = Entity(client, "users", { softDelete: false })

      await Users.getItems({ offset: 20 }).many().run()

      expect(lastBuilder(client).range).toHaveBeenCalledWith(20, Number.MAX_SAFE_INTEGER)
    })

    it("applies limit + offset via .range(offset, offset + limit - 1)", async () => {
      const client = createMockSupabaseClient({ data: [] })
      const Users = Entity(client, "users", { softDelete: false })

      await Users.getItems({ limit: 10, offset: 20 }).many().run()

      expect(lastBuilder(client).range).toHaveBeenCalledWith(20, 29)
    })

    it("applies no pagination when neither is provided", async () => {
      const client = createMockSupabaseClient({ data: [] })
      const Users = Entity(client, "users", { softDelete: false })

      await Users.getItems().many().run()

      const builder = lastBuilder(client)
      expect(builder.limit).not.toHaveBeenCalled()
      expect(builder.range).not.toHaveBeenCalled()
    })
  })

  describe("params form matches chainable form", () => {
    it("getItems({ limit }) === getItems().limit()", async () => {
      const paramsClient = createMockSupabaseClient({ data: [] })
      const chainClient = createMockSupabaseClient({ data: [] })
      const ParamsUsers = Entity(paramsClient, "users", { softDelete: false })
      const ChainUsers = Entity(chainClient, "users", { softDelete: false })

      await ParamsUsers.getItems({ limit: 7 }).many().run()
      await ChainUsers.getItems().limit(7).many().run()

      expect(lastBuilder(paramsClient).limit.mock.calls).toEqual(lastBuilder(chainClient).limit.mock.calls)
    })

    it("getItems({ limit, offset }) === getItems().limit().offset()", async () => {
      const paramsClient = createMockSupabaseClient({ data: [] })
      const chainClient = createMockSupabaseClient({ data: [] })
      const ParamsUsers = Entity(paramsClient, "users", { softDelete: false })
      const ChainUsers = Entity(chainClient, "users", { softDelete: false })

      await ParamsUsers.getItems({ limit: 3, offset: 6 }).many().run()
      await ChainUsers.getItems().limit(3).offset(6).many().run()

      expect(lastBuilder(paramsClient).range.mock.calls).toEqual(lastBuilder(chainClient).range.mock.calls)
    })
  })

  describe("limit/offset via params (PartitionedEntity)", () => {
    it("applies limit alongside the partition filter", async () => {
      const client = createMockSupabaseClient({ data: [] })
      const Tasks = PartitionedEntity(client, "tasks", { partitionField: "user_id", softDelete: false })

      await Tasks.getItems("user-1", { order: ["created_at", { ascending: false }], limit: 5 })
        .many()
        .run()

      expect(lastBuilder(client).limit).toHaveBeenCalledWith(5)
    })
  })
})
