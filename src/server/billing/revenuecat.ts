import "server-only"
import { subscriberPlan } from "@/lib/revenuecat"
import { db } from "@/server/db"
import { env } from "@/server/env"

export class BillingNotConfiguredError extends Error {
  constructor() {
    super("Subscriptions are currently unavailable.")
    this.name = "BillingNotConfiguredError"
  }
}

/**
 * The browser key for the paywall. A paywall that cannot be confirmed by the server would
 * take money without granting Pro, so production also needs the secret key and a live key.
 */
export function paywallApiKey() {
  const key = env.REVENUECAT_PUBLIC_KEY
  if (!key) throw new BillingNotConfiguredError()
  if (env.NODE_ENV === "production" && (key.startsWith("test_") || !env.REVENUECAT_SECRET_KEY)) throw new BillingNotConfiguredError()
  return key
}

export async function fetchSubscriber(workspaceId: string) {
  if (!env.REVENUECAT_SECRET_KEY) throw new BillingNotConfiguredError()
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(workspaceId)}`, {
    headers: { Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}` },
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`RevenueCat returned ${response.status}`)
  return subscriberPlan(await response.json(), env.REVENUECAT_ENTITLEMENT_ID)
}

/** Mirror RevenueCat's current view of the customer onto its workspace. */
export async function syncWorkspacePlan(workspaceId: string) {
  const { plan } = await fetchSubscriber(workspaceId)
  await db.workspace.update({ where: { id: workspaceId }, data: plan })
  return plan
}
