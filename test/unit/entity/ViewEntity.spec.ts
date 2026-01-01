import { describe, expect, it } from "vitest"

import type {
  IPartitionedViewEntity,
  IViewEntity,
  PartitionedViewEntityConfig,
  PartitionKey,
  ViewEntityConfig,
} from "@/entity"
import type { DatabaseSchema, SchemaDefinition, ViewNames, ViewRow } from "@/types"

import type { Brand } from "functype"

// Define a test database schema with views
interface TestDatabase extends DatabaseSchema {
  public: SchemaDefinition & {
    Tables: {
      users: {
        Row: { id: string; name: string; email: string }
        Insert: { name: string; email: string }
        Update: { name?: string; email?: string }
      }
    }
    Views: {
      active_users_view: {
        Row: { id: string; name: string; email: string; is_active: boolean }
      }
      user_stats_view: {
        Row: { user_id: string; total_orders: number; total_spent: number }
      }
    }
  }
  analytics: SchemaDefinition & {
    Tables: {
      events: {
        Row: { id: string; event_type: string }
        Insert: { event_type: string }
        Update: { event_type?: string }
      }
    }
    Views: {
      daily_stats_view: {
        Row: { date: string; event_count: number; unique_users: number }
      }
    }
  }
}

describe("ViewEntity Types", () => {
  it("should extract ViewNames from database schema", () => {
    // ViewNames extracts view names from the public schema
    type PublicViewNames = ViewNames<TestDatabase, "public">

    // Type-level test: these should be valid view names
    const activeUsersView: PublicViewNames = "active_users_view"
    const userStatsView: PublicViewNames = "user_stats_view"

    expect(activeUsersView).toBe("active_users_view")
    expect(userStatsView).toBe("user_stats_view")
  })

  it("should extract ViewNames from custom schema", () => {
    type AnalyticsViewNames = ViewNames<TestDatabase, "analytics">

    const dailyStatsView: AnalyticsViewNames = "daily_stats_view"
    expect(dailyStatsView).toBe("daily_stats_view")
  })

  it("should extract ViewRow type correctly", () => {
    type ActiveUsersRow = ViewRow<"active_users_view", TestDatabase, "public">

    // Type-level test: ViewRow should have the correct properties
    const row: ActiveUsersRow = {
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
      is_active: true,
    }

    expect(row.id).toBe("user-123")
    expect(row.name).toBe("Test User")
    expect(row.is_active).toBe(true)
  })

  it("should type check ViewEntityConfig", () => {
    const configDefault: ViewEntityConfig = {}

    const configWithSchema: ViewEntityConfig = {
      schema: "analytics",
    }

    expect(configDefault).toBeDefined()
    expect(configWithSchema.schema).toBe("analytics")
  })

  it("should type check PartitionedViewEntityConfig", () => {
    const config: PartitionedViewEntityConfig = {
      partitionField: "tenant_id",
    }

    const configWithSchema: PartitionedViewEntityConfig = {
      partitionField: "user_id",
      schema: "public",
    }

    expect(config.partitionField).toBe("tenant_id")
    expect(configWithSchema.schema).toBe("public")
  })

  it("should type check IViewEntity interface - read-only methods only", () => {
    type TestView = "active_users_view"

    // IViewEntity should only have read methods (getItem, getItems)
    const mockFn = (() => {}) as never

    const viewEntity: IViewEntity<TestView, TestDatabase, "public"> = {
      getItem: mockFn,
      getItems: mockFn,
    }

    expect(viewEntity).toBeDefined()
    expect(viewEntity.getItem).toBeDefined()
    expect(viewEntity.getItems).toBeDefined()

    // Type-level test: IViewEntity should NOT have write methods
    // @ts-expect-error - addItems should not exist on IViewEntity
    expect(viewEntity.addItems).toBeUndefined()
    // @ts-expect-error - updateItem should not exist on IViewEntity
    expect(viewEntity.updateItem).toBeUndefined()
    // @ts-expect-error - deleteItem should not exist on IViewEntity
    expect(viewEntity.deleteItem).toBeUndefined()
  })

  it("should type check IPartitionedViewEntity interface", () => {
    type TestView = "user_stats_view"
    type UserId = Brand<string, "UserId">

    // IPartitionedViewEntity should have read methods with partition key
    const mockFn = (() => {}) as never

    const partitionedViewEntity: IPartitionedViewEntity<TestView, UserId, TestDatabase, "public"> = {
      getItem: mockFn,
      getItems: mockFn,
    }

    expect(partitionedViewEntity).toBeDefined()
    expect(partitionedViewEntity.getItem).toBeDefined()
    expect(partitionedViewEntity.getItems).toBeDefined()

    // Type-level test: IPartitionedViewEntity should NOT have write methods
    // @ts-expect-error - addItems should not exist on IPartitionedViewEntity
    expect(partitionedViewEntity.addItems).toBeUndefined()
    // @ts-expect-error - updateItem should not exist on IPartitionedViewEntity
    expect(partitionedViewEntity.updateItem).toBeUndefined()
  })

  it("should type check PartitionKey with branded types for views", () => {
    // PartitionKey can be a string
    const stringKey: PartitionKey = "user-123"
    expect(stringKey).toBe("user-123")

    // PartitionKey can also be a branded type
    type TenantId = Brand<string, "TenantId">
    const brandedKey: PartitionKey = "tenant-456" as TenantId
    expect(brandedKey).toBe("tenant-456")
  })

  it("should differentiate ViewRow from TableRow", () => {
    // ViewRow only provides Row type (read-only)
    type ActiveUsersRow = ViewRow<"active_users_view", TestDatabase, "public">

    const viewRow: ActiveUsersRow = {
      id: "123",
      name: "Test",
      email: "test@example.com",
      is_active: true,
    }

    expect(viewRow).toBeDefined()
    expect(viewRow.is_active).toBe(true)

    // Type-level verification: ViewRow should not have Insert/Update types
    // This is enforced by the type system - Views only have Row in the schema
  })

  it("should support ViewRow from custom schema", () => {
    type DailyStatsRow = ViewRow<"daily_stats_view", TestDatabase, "analytics">

    const statsRow: DailyStatsRow = {
      date: "2024-01-01",
      event_count: 100,
      unique_users: 50,
    }

    expect(statsRow.date).toBe("2024-01-01")
    expect(statsRow.event_count).toBe(100)
    expect(statsRow.unique_users).toBe(50)
  })
})
