"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { PRO_PRICE_USD } from "@/lib/billing"
import { assertViewer } from "@/server/auth/session"
import { db } from "@/server/db"
import { env } from "@/server/env"
import { runAction } from "@/server/projects/action-result"
import { getBillingState } from "./entitlements"
import { getStripe } from "./stripe"

async function origin() {
  if (env.APP_URL) return env.APP_URL.replace(/\/$/, "")
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}

const fail = (message: string) => new z.ZodError([{ code: "custom", message, path: [] }])

/** Start Stripe Checkout for the Pro plan, then send the browser there. */
export async function startCheckout() {
  let url: string | null = null
  const result = await runAction(async () => {
    const viewer = await assertViewer()
    if (viewer.user.isGuest) throw fail("Create an account to subscribe. Guest workspaces are temporary.")
    const state = await getBillingState(viewer.workspace.id)
    if (state.subscribed) throw fail("This workspace is already subscribed.")

    const stripe = getStripe()
    let customer = (await db.workspace.findUniqueOrThrow({ where: { id: viewer.workspace.id } })).stripeCustomerId
    if (!customer) {
      const created = await stripe.customers.create({
        email: viewer.user.email ?? undefined,
        name: viewer.workspace.name,
        metadata: { workspaceId: viewer.workspace.id },
      })
      customer = created.id
      await db.workspace.update({ where: { id: viewer.workspace.id }, data: { stripeCustomerId: customer } })
    }

    const base = await origin()
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: viewer.workspace.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: PRO_PRICE_USD * 100,
            recurring: { interval: "month" },
            product_data: {
              name: "Outbranch Pro",
              description: "Unlimited research projects and deep dives",
            },
          },
        },
      ],
      subscription_data: { metadata: { workspaceId: viewer.workspace.id } },
      metadata: { workspaceId: viewer.workspace.id },
      success_url: `${base}/api/billing/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pricing`,
    })
    url = session.url
    if (!url) throw new Error("Stripe did not return a checkout URL")
  })
  if (result.ok && url) redirect(url)
  return result
}

/** Open the Stripe customer portal to update the card, view invoices or cancel. */
export async function openBillingPortal() {
  let url: string | null = null
  const result = await runAction(async () => {
    const viewer = await assertViewer()
    const workspace = await db.workspace.findUniqueOrThrow({ where: { id: viewer.workspace.id } })
    if (!workspace.stripeCustomerId) throw fail("There is no billing account for this workspace yet.")
    const session = await getStripe().billingPortal.sessions.create({
      customer: workspace.stripeCustomerId,
      return_url: `${await origin()}/settings/billing`,
    })
    url = session.url
  })
  if (result.ok && url) redirect(url)
  return result
}
