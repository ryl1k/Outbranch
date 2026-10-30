import { describe, expect, it } from "vitest"
import { FREE_LIMITS, PRO_PRICE_USD, isActiveSubscription } from "@/lib/billing"

describe("plan definitions", () => {
  it("prices Pro at $100 a month and limits the free plan", () => {
    expect(PRO_PRICE_USD).toBe(100)
    expect(FREE_LIMITS).toEqual({ projects: 2, deepDives: 5 })
  })

  it("treats only active and trialing subscriptions as paid", () => {
    expect(isActiveSubscription("active")).toBe(true)
    expect(isActiveSubscription("trialing")).toBe(true)
    for (const status of ["past_due", "canceled", "unpaid", "incomplete", "incomplete_expired", "paused", null, undefined]) {
      expect(isActiveSubscription(status)).toBe(false)
    }
  })
})
