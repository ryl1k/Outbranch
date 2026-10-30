import { z } from "zod"

const dateField = z.string().nullish()

const subscriberSchema = z.object({
  subscriber: z.object({
    management_url: z.string().nullish(),
    entitlements: z.record(z.string(), z.object({ expires_date: dateField, product_identifier: z.string() })).default({}),
    subscriptions: z
      .record(
        z.string(),
        z.object({
          period_type: z.string().nullish(),
          unsubscribe_detected_at: dateField,
          billing_issues_detected_at: dateField,
        }),
      )
      .default({}),
  }),
})

/** Reduce a RevenueCat subscriber to the plan fields mirrored onto a workspace. */
export function subscriberPlan(payload: unknown, entitlementId: string, now = new Date()) {
  const { subscriber } = subscriberSchema.parse(payload)
  const entitlement = subscriber.entitlements[entitlementId]
  const managementUrl = subscriber.management_url ?? null
  if (!entitlement) return { plan: { subscriptionStatus: null, currentPeriodEnd: null, cancelAtPeriodEnd: false }, managementUrl }

  const subscription = subscriber.subscriptions[entitlement.product_identifier]
  const periodEnd = entitlement.expires_date ? new Date(entitlement.expires_date) : null
  const expired = periodEnd !== null && periodEnd <= now
  let subscriptionStatus = subscription?.period_type === "trial" ? "trialing" : "active"
  if (expired) subscriptionStatus = subscription?.billing_issues_detected_at ? "past_due" : "expired"

  return {
    plan: {
      subscriptionStatus,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: Boolean(subscription?.unsubscribe_detected_at) && !expired,
    },
    managementUrl,
  }
}
