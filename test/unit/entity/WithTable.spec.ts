import { describe, expect, expectTypeOf, it } from "vitest"

import { createMockSupabaseClient } from "../../helpers/mock-client"

import { Entity } from "@/entity"
import { PartitionedEntity } from "@/entity/PartitionedEntity"
import type { TableNames, TableRow, WithTable } from "@/types"

// A base database that is missing the `digest_history` table in `agent_schedule`,
// mirroring the situation where a migration exists but generated types lag behind.
type BaseDb = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
  agent_schedule: {
    Tables: {
      existing: { Row: { id: string }; Insert: { id: string }; Update: { id?: string } }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

type DigestDef = {
  Row: { id: string; user_id: string; generated_at: string }
  Insert: { id: string; user_id: string; generated_at: string }
  Update: { id?: string; generated_at?: string }
}

type Augmented = WithTable<BaseDb, "agent_schedule", "digest_history", DigestDef>

describe("WithTable", () => {
  it("adds the new table to TableNames for the augmented schema", () => {
    expectTypeOf<"digest_history">().toMatchTypeOf<TableNames<Augmented, "agent_schedule">>()
    // existing table is still present
    expectTypeOf<"existing">().toMatchTypeOf<TableNames<Augmented, "agent_schedule">>()

    // The base type does NOT have the table
    // @ts-expect-error - digest_history is not a table in BaseDb's agent_schedule
    const baseMissing: TableNames<BaseDb, "agent_schedule"> = "digest_history"
    void baseMissing

    expect(true).toBe(true)
  })

  it("exposes the augmented table's Row type", () => {
    expectTypeOf<TableRow<"digest_history", Augmented, "agent_schedule">>().toEqualTypeOf<DigestDef["Row"]>()
    expect(true).toBe(true)
  })

  it("preserves untouched tables", () => {
    expectTypeOf<TableRow<"existing", Augmented, "agent_schedule">>().toEqualTypeOf<{ id: string }>()
    expect(true).toBe(true)
  })

  it("can be passed to Entity / PartitionedEntity as the DB generic", () => {
    const client = createMockSupabaseClient()

    const digests = Entity<"digest_history", Augmented, "agent_schedule">(client, "digest_history", {
      softDelete: false,
      schema: "agent_schedule",
    })

    const partitioned = PartitionedEntity<"digest_history", string, Augmented, "agent_schedule">(
      client,
      "digest_history",
      { partitionField: "user_id", softDelete: false, schema: "agent_schedule" },
    )

    expect(typeof digests.getItems).toBe("function")
    expect(typeof partitioned.getItems).toBe("function")
  })
})
