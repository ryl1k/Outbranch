"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { assertViewer } from "@/server/auth/session"
import { runAction } from "@/server/projects/action-result"
import { getBillingState } from "./entitlements"
import { fetchSubscriber, paywallApiKey } from "./revenuecat"

const fail = (message: string) => new z.ZodError([{ code: "custom", message, path: [] }])

/** Check the workspace can subscribe and give the browser what it needs to show the paywall. */
export async function startCheckout() {
  let checkout = null as { apiKey: string; appUserId: string; email: string | null } | null
  const result = await runAction(async () => {
    const viewer = await assertViewer()
    if (viewer.user.isGuest) throw fail("Create an account to subscribe. Guest workspaces are temporary.")
    const state = await getBillingState(viewer.workspace.id)
    if (state.subscribed) throw fail("This workspace is already subscribed.")
    // Workspaces are the RevenueCat customers: the workspace id is the App User ID.
    checkout = { apiKey: paywallApiKey(), appUserId: viewer.workspace.id, email: viewer.user.email }
  })
  return { ...result, checkout }
}

/** Open the page where the customer updates their card, views invoices or cancels. */
export async function openBillingPortal() {
  let url: string | null = null
  const result = await runAction(async () => {
    const viewer = await assertViewer()
    const { managementUrl } = await fetchSubscriber(viewer.workspace.id)
    if (!managementUrl) throw fail("There is no active subscription to manage for this workspace.")
    url = managementUrl
  })
  if (result.ok && url) redirect(url)
  return result
}
