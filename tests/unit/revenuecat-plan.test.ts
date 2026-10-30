import { describe, expect, it } from "vitest"
import { subscriberPlan } from "@/lib/revenuecat"

const now = new Date("2026-10-30T00:00:00Z")
const payload = (expires: string | null, subscription: Record<string, unknown> = {}) => ({
  subscriber: {
    management_url: "https://example.com/manage",
    entitlements: { pro: { expires_date: expires, product_identifier: "pro_monthly" } },
    subscriptions: { pro_monthly: { period_type: "normal", ...subscription } },
  },
})

describe("subscriberPlan", () => {
  it("treats a customer without the entitlement as free", () => {
    const { plan } = subscriberPlan({ subscriber: { entitlements: {}, subscriptions: {} } }, "pro", now)
    expect(plan).toEqual({ subscriptionStatus: null, currentPeriodEnd: null, cancelAtPeriodEnd: false })
  })

  it("activates an unexpired entitlement and records its period end", () => {
    const { plan, managementUrl } = subscriberPlan(payload("2026-11-30T00:00:00Z"), "pro", now)
    expect(plan.subscriptionStatus).toBe("active")
    expect(plan.currentPeriodEnd).toEqual(new Date("2026-11-30T00:00:00Z"))
    expect(managementUrl).toBe("https://example.com/manage")
  })

  it("keeps access until the period ends after cancelling", () => {
    const { plan } = subscriberPlan(payload("2026-11-30T00:00:00Z", { unsubscribe_detected_at: "2026-10-29T00:00:00Z" }), "pro", now)
    expect(plan).toMatchObject({ subscriptionStatus: "active", cancelAtPeriodEnd: true })
  })

  it("reports trials and expiry", () => {
    const status = (expires: string, subscription?: Record<string, unknown>) => subscriberPlan(payload(expires, subscription), "pro", now).plan.subscriptionStatus
    expect(status("2026-11-30T00:00:00Z", { period_type: "trial" })).toBe("trialing")
    expect(status("2026-10-01T00:00:00Z")).toBe("expired")
    expect(status("2026-10-01T00:00:00Z", { billing_issues_detected_at: "2026-10-01T00:00:00Z" })).toBe("past_due")
  })

  it("ignores other entitlements", () => {
    expect(subscriberPlan(payload("2026-11-30T00:00:00Z"), "other", now).plan.subscriptionStatus).toBeNull()
  })
})
