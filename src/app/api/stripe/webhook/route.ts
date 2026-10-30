import type Stripe from "stripe"
import { applySubscription } from "@/server/billing/sync"
import { getStripe } from "@/server/billing/stripe"
import { env } from "@/server/env"

export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) return new Response("Webhook not configured", { status: 503 })
  const signature = request.headers.get("stripe-signature")
  if (!signature) return new Response("Missing signature", { status: 400 })

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    // The signature covers the raw body, so read it as text, not JSON.
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return new Response("Invalid signature", { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const subscription = event.data.object.subscription
      if (subscription) {
        const id = typeof subscription === "string" ? subscription : subscription.id
        await applySubscription(await stripe.subscriptions.retrieve(id))
      }
      break
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(event.data.object)
      break
  }
  return new Response(null, { status: 200 })
}
