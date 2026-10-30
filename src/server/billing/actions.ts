"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { assertViewer } from "@/server/auth/session"
import { db } from "@/server/db"
import { env } from "@/server/env"
import { runAction } from "@/server/projects/action-result"
import { getBillingState } from "./entitlements"
import { createCheckoutInvoice } from "./mono"

async function origin() {
  if (env.APP_URL) return env.APP_URL.replace(/\/$/, "")
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}

const fail = (message: string) => new z.ZodError([{ code: "custom", message, path: [] }])

/** Create a monobank invoice for the Pro plan, then send the browser to its payment page. */
export async function startCheckout() {
  let url: string | null = null
  const result = await runAction(async () => {
    const viewer = await assertViewer()
    if (viewer.user.isGuest) throw fail("Create an account to subscribe. Guest workspaces are temporary.")
    const state = await getBillingState(viewer.workspace.id)
    if (state.subscribed) throw fail("This workspace is already subscribed.")
    url = await createCheckoutInvoice(viewer.workspace.id, await origin())
  })
  if (result.ok && url) redirect(url)
  return result
}

/** Stop or resume renewal. Access continues until the paid period ends either way. */
export async function setCancelAtPeriodEnd(cancel: boolean) {
  return runAction(async () => {
    const viewer = await assertViewer()
    const updated = await db.workspace.updateMany({
      where: { id: viewer.workspace.id, monoCardToken: { not: null } },
      data: { cancelAtPeriodEnd: cancel },
    })
    if (updated.count === 0) throw fail("There is no subscription to change for this workspace.")
    revalidatePath("/settings/billing")
  })
}
