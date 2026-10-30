import "server-only"
import { unstable_rethrow } from "next/navigation"
import { z } from "zod"
import { AuthError } from "@/server/auth/session"
import { PaywallError } from "@/server/billing/entitlements"
import { BillingNotConfiguredError } from "@/server/billing/mono"
import { RateLimitError } from "@/server/security/rate-limit"

/** `paywall` marks failures caused by a plan limit, so the UI can offer an upgrade. */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; paywall?: boolean }

/** Uniform error handling for Server Actions: typed, user-safe messages only. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (error) {
    unstable_rethrow(error)
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Invalid input" }
    if (error instanceof PaywallError) return { ok: false, error: error.message, paywall: true }
    if (error instanceof AuthError || error instanceof RateLimitError || error instanceof BillingNotConfiguredError) {
      return { ok: false, error: error.message }
    }
    console.error("[action] unexpected error", error)
    return { ok: false, error: "Something went wrong. Please try again." }
  }
}
