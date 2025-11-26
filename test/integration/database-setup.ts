// test/integration/database-setup.ts
import type { SupabaseClientType } from "@/types"

import { createClient } from "@supabase/supabase-js"

export class DatabaseSetup {
  private client: SupabaseClientType | undefined

  /**
   * Initialize the test database connection
   * Supports both Supabase (local dev) and PostgREST (CI)
   */
  async initialize(): Promise<void> {
    const url = this.getTestDatabaseUrl()
    const key = this.getTestDatabaseKey()

    if (!url || !key) {
      throw new Error(
        "Integration test database credentials not found. " +
          "Please set TEST_SUPABASE_URL and TEST_SUPABASE_ANON_KEY environment variables " +
          "for local development, or TEST_POSTGREST_URL and TEST_POSTGREST_ANON_KEY for CI.",
      )
    }

    console.log(`🔗 Integration tests using ${url?.includes("supabase") ? "Supabase" : "PostgREST"}`)

    // Create Supabase client
    this.client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }) as unknown as SupabaseClientType

    // Verify connection works
    await this.verifyConnection()
  }

  /**
   * Get the database client for tests
   */
  getClient(): SupabaseClientType {
    if (!this.client) {
      throw new Error("Database not initialized. Call initialize() first.")
    }
    return this.client
  }

  /**
   * Clean up test data and close connections
   */
  async cleanup(): Promise<void> {
    if (!this.client) return

    // Clean up test data in reverse dependency order
    await this.cleanupTestData()
  }

  /**
   * Clean up all test data from the database
   * This ensures tests start with a clean state
   * Deletes all records that match the test data pattern (test_* prefix)
   */
  async cleanupTestData(): Promise<void> {
    if (!this.client) return

    try {
      // Clean up test users (prefix: test_)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: usersError } = await (this.client.from("users") as any)
        .delete()
        .ilike("email", "test_%@example.com")

      if (usersError && (usersError as { code?: string }).code !== "PGRST116") {
        // PGRST116 = no rows to delete (not an error)
        console.warn("Warning: Could not clean users:", (usersError as { message?: string }).message)
      }

      // Clean up test posts (prefix: test_)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: postsError } = await (this.client.from("posts") as any).delete().ilike("title", "test_%")

      if (postsError && (postsError as { code?: string }).code !== "PGRST116") {
        console.warn("Warning: Could not clean posts:", (postsError as { message?: string }).message)
      }

      // Clean up test comments (prefix: test_)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: commentsError } = await (this.client.from("comments") as any).delete().ilike("text", "test_%")

      if (commentsError && (commentsError as { code?: string }).code !== "PGRST116") {
        console.warn("Warning: Could not clean comments:", (commentsError as { message?: string }).message)
      }
    } catch (error) {
      console.warn("Warning: Error during test data cleanup:", error)
    }
  }

  /**
   * Create test data for integration tests
   * Returns IDs of created test records for use in tests
   */
  async createTestData(): Promise<TestDataIds> {
    if (!this.client) {
      throw new Error("Database not initialized")
    }

    // Create test user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users, error: userError } = await (this.client.from("users") as any)
      .insert({
        name: "Test User",
        email: "test_user@example.com",
        age: 30,
        active: true,
        role: "admin",
      })
      .select()

    if (userError || !users || !Array.isArray(users) || users.length === 0) {
      throw new Error(`Failed to create test user: ${(userError as { message?: string })?.message ?? "Unknown error"}`)
    }

    const testUserId = (users[0] as { id: string }).id

    // Create test post
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: posts, error: postError } = await (this.client.from("posts") as any)
      .insert({
        title: "Test Post",
        content: "Test content for integration testing",
        author_id: testUserId,
        status: "published",
        view_count: 0,
      })
      .select()

    if (postError || !posts || !Array.isArray(posts) || posts.length === 0) {
      throw new Error(`Failed to create test post: ${(postError as { message?: string })?.message ?? "Unknown error"}`)
    }

    const testPostId = (posts[0] as { id: string }).id

    // Create test comment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: comments, error: commentError } = await (this.client.from("comments") as any)
      .insert({
        post_id: testPostId,
        user_id: testUserId,
        text: "Test comment",
      })
      .select()

    if (commentError || !comments || !Array.isArray(comments) || comments.length === 0) {
      throw new Error(
        `Failed to create test comment: ${(commentError as { message?: string })?.message ?? "Unknown error"}`,
      )
    }

    return {
      userId: testUserId,
      postId: testPostId,
      commentId: (comments[0] as { id: string }).id,
    }
  }

  /**
   * Create multiple test users for batch testing
   */
  async createTestUsers(count: number): Promise<string[]> {
    if (!this.client) {
      throw new Error("Database not initialized")
    }

    const usersToCreate = Array.from({ length: count }, (_, i) => ({
      name: `Test User ${i + 1}`,
      email: `test_user_${i + 1}@example.com`,
      age: 20 + i,
      active: i % 2 === 0, // Alternate active/inactive
      role: i % 3 === 0 ? "admin" : i % 3 === 1 ? "moderator" : "user",
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users, error } = await (this.client.from("users") as any).insert(usersToCreate).select()

    if (error || !users || !Array.isArray(users)) {
      throw new Error(`Failed to create test users: ${(error as { message?: string })?.message ?? "Unknown error"}`)
    }

    return users.map((u) => (u as { id: string }).id)
  }

  /**
   * Create multiple test posts for batch testing
   */
  async createTestPosts(authorId: string, count: number): Promise<string[]> {
    if (!this.client) {
      throw new Error("Database not initialized")
    }

    const postsToCreate = Array.from({ length: count }, (_, i) => ({
      title: `Test Post ${i + 1}`,
      content: `Test content for post ${i + 1}`,
      author_id: authorId,
      status: i % 3 === 0 ? "draft" : i % 3 === 1 ? "published" : "archived",
      view_count: i * 10,
      published_at: i % 3 === 1 ? new Date().toISOString() : null,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: posts, error } = await (this.client.from("posts") as any).insert(postsToCreate).select()

    if (error || !posts || !Array.isArray(posts)) {
      throw new Error(`Failed to create test posts: ${(error as { message?: string })?.message ?? "Unknown error"}`)
    }

    return posts.map((p) => (p as { id: string }).id)
  }

  /**
   * Create test data with soft deletes for testing soft delete functionality
   */
  async createSoftDeleteTestData(): Promise<{ activeId: string; deletedId: string }> {
    if (!this.client) {
      throw new Error("Database not initialized")
    }

    // Create active user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: activeUsers, error: activeError } = await (this.client.from("users") as any)
      .insert({
        name: "Test Active User",
        email: "test_active@example.com",
        age: 25,
        active: true,
        role: "user",
        deleted: null,
      })
      .select()

    if (activeError || !activeUsers || !Array.isArray(activeUsers) || activeUsers.length === 0) {
      throw new Error(
        `Failed to create active user: ${(activeError as { message?: string })?.message ?? "Unknown error"}`,
      )
    }

    // Create soft-deleted user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: deletedUsers, error: deletedError } = await (this.client.from("users") as any)
      .insert({
        name: "Test Deleted User",
        email: "test_deleted@example.com",
        age: 30,
        active: false,
        role: "user",
        deleted: new Date().toISOString(),
      })
      .select()

    if (deletedError || !deletedUsers || !Array.isArray(deletedUsers) || deletedUsers.length === 0) {
      throw new Error(
        `Failed to create deleted user: ${(deletedError as { message?: string })?.message ?? "Unknown error"}`,
      )
    }

    return {
      activeId: (activeUsers[0] as { id: string }).id,
      deletedId: (deletedUsers[0] as { id: string }).id,
    }
  }

  private getTestDatabaseUrl(): string | undefined {
    return (
      // PostgREST for CI
      process.env.TEST_POSTGREST_URL ??
      // Supabase for local development
      process.env.TEST_SUPABASE_URL ??
      process.env.SUPABASE_TEST_URL
    )
  }

  private getTestDatabaseKey(): string | undefined {
    return (
      // PostgREST for CI
      process.env.TEST_POSTGREST_ANON_KEY ??
      // Supabase for local development
      process.env.TEST_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_TEST_ANON_KEY
    )
  }

  private async verifyConnection(): Promise<void> {
    if (!this.client) {
      throw new Error("Client not initialized")
    }

    try {
      // Test database connection with a simple query
      // Most Supabase projects won't have this table, so we just test the connection works
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (this.client.from("users") as any).select("id").limit(1)

      if (error) {
        // If table doesn't exist (42P01), that's actually OK - connection works
        const errorCode = (error as { code?: string }).code
        const errorMessage = (error as { message?: string }).message
        if (errorCode === "42P01" || errorMessage?.includes("does not exist")) {
          console.log("✅ Database connection successful (schema may need setup)")
          return
        }
        throw new Error(`Database connection failed: ${errorMessage ?? "Unknown database error"}`)
      }

      console.log("✅ Database connection successful")
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Database connection failed:")) {
        throw error
      }
      throw new Error(`Database connection verification failed: ${error}`)
    }
  }
}

export type TestDataIds = {
  userId: string
  postId: string
  commentId: string
}
