import "server-only"
import { unstable_rethrow } from "next/navigation"
import { z } from "zod"
import { AuthError } from "@/server/auth/session"
import { RateLimitError } from "@/server/security/rate-limit"

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

/** Uniform error handling for Server Actions: typed, user-safe messages only. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (error) {
    unstable_rethrow(error)
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Invalid input" }
    if (error instanceof AuthError || error instanceof RateLimitError) return { ok: false, error: error.message }
    console.error("[action] unexpected error", error)
    return { ok: false, error: "Something went wrong. Please try again." }
  }
}
