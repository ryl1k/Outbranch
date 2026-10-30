import "server-only"
import type Stripe from "stripe"
import { db } from "@/server/db"
import { getStripe } from "./stripe"

function customerId(customer: Stripe.Subscription["customer"]) {
  return typeof customer === "string" ? customer : customer.id
}

/** Stripe reports the billing period on the subscription's items. */
function periodEnd(subscription: Stripe.Subscription) {
  const end = subscription.items.data[0]?.current_period_end
  return end ? new Date(end * 1000) : null
}

/** Mirror a Stripe subscription onto the workspace it was bought for. */
export async function applySubscription(subscription: Stripe.Subscription) {
  const customer = customerId(subscription.customer)
  const metaWorkspace = subscription.metadata?.workspaceId
  const workspace = await db.workspace.findFirst({
    where: metaWorkspace ? { OR: [{ id: metaWorkspace }, { stripeCustomerId: customer }] } : { stripeCustomerId: customer },
    select: { id: true },
  })
  if (!workspace) return false
  await db.workspace.update({
    where: { id: workspace.id },
    data: {
      stripeCustomerId: customer,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: periodEnd(subscription),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  })
  return true
}

/**
 * Called when the user returns from Checkout so the plan is active immediately,
 * without waiting for (or depending on) the webhook.
 */
export async function syncCheckoutSession(sessionId: string, workspaceId: string) {
  const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] })
  if (session.client_reference_id !== workspaceId) return false
  const subscription = session.subscription
  if (!subscription || typeof subscription === "string") return false
  return applySubscription(subscription)
}
