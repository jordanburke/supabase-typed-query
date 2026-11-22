/**
 * Supabase/Postgrest error structure
 */
export type SupabaseErrorObject = {
  message: string
  code?: string
  details?: string
  hint?: string
}

/**
 * Custom Error class that preserves Supabase error details
 */
export class SupabaseError extends Error {
  readonly code?: string
  readonly details?: string
  readonly hint?: string

  constructor(error: SupabaseErrorObject | unknown) {
    // Check for Error instances FIRST before checking for Supabase error objects
    // because Error instances also have a message property
    if (error instanceof Error) {
      super(error.message)
      this.name = error.name
      this.stack = error.stack
    } else if (isSupabaseError(error)) {
      super(error.message)
      this.name = "SupabaseError"
      this.code = error.code
      this.details = error.details
      this.hint = error.hint
    } else {
      super(String(error))
      this.name = "SupabaseError"
    }
  }

  /**
   * Override toString to include all error details
   */
  override toString(): string {
    return [
      this.message,
      ...(this.code ? [`[Code: ${this.code}]`] : []),
      ...(this.details ? [`Details: ${this.details}`] : []),
      ...(this.hint ? [`Hint: ${this.hint}`] : []),
    ].join(" | ")
  }
}

/**
 * Type guard for Supabase error objects
 */
function isSupabaseError(error: unknown): error is SupabaseErrorObject {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as SupabaseErrorObject).message === "string"
  )
}

/**
 * Convert any error to a proper Error instance
 */
export const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error
  }
  return new SupabaseError(error)
}
