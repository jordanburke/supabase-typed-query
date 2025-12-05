/**
 * Test database types for type-safe unit tests
 * These types simulate a Supabase-generated database type
 */
export interface TestDatabase {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          role: string
          active: boolean
          status: string
          age: number
          deleted: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          role?: string
          active?: boolean
          status?: string
          age?: number
          deleted?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: string
          active?: boolean
          status?: string
          age?: number
          deleted?: string | null
          created_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          title: string
          content: string
          status: string
          view_count: number
          published_at: string | null
          deleted: string | null
          created_at: string
          author_id: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          status?: string
          view_count?: number
          published_at?: string | null
          deleted?: string | null
          created_at?: string
          author_id: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          status?: string
          view_count?: number
          published_at?: string | null
          deleted?: string | null
          created_at?: string
          author_id?: string
        }
      }
      items: {
        Row: {
          id: string
          name: string
          org_id: string
          active: boolean
          deleted: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          org_id: string
          active?: boolean
          deleted?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          org_id?: string
          active?: boolean
          deleted?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
