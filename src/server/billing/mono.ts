import "server-only"
import { z } from "zod"
import { addMonth, monoInvoiceSchema, type MonoInvoice } from "@/lib/mono"
import { db } from "@/server/db"
import { env } from "@/server/env"

const API_URL = "https://api.monobank.ua"

export class BillingNotConfiguredError extends Error {
  constructor() {
    super("Subscriptions are currently unavailable.")
    this.name = "BillingNotConfiguredError"
  }
}

async function monoFetch(path: string, init?: RequestInit) {
  if (!env.MONO_TOKEN) throw new BillingNotConfiguredError()
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "X-Token": env.MONO_TOKEN, "Content-Type": "application/json" },
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`monobank returned ${response.status} for ${path.split("?")[0]}`)
  return response.json()
}

/** Webhooks need a public URL, so local development relies on the return page and the renewal job. */
function webhookUrl(origin: string) {
  return /localhost|127\.0\.0\.1/.test(origin) ? undefined : `${origin}/api/mono/webhook`
}

/** Create the first invoice, saving the card for renewals. The workspace id is the wallet id. */
export async function createCheckoutInvoice(workspaceId: string, origin: string) {
  const created = z.object({ invoiceId: z.string(), pageUrl: z.string() }).parse(
    await monoFetch("/api/merchant/invoice/create", {
      method: "POST",
      body: JSON.stringify({
        amount: env.MONO_AMOUNT_MINOR,
        ccy: env.MONO_CCY,
        redirectUrl: `${origin}/api/billing/return`,
        webHookUrl: webhookUrl(origin),
        saveCardData: { saveCard: true, walletId: workspaceId },
      }),
    }),
  )
  await db.monoInvoice.create({ data: { invoiceId: created.invoiceId, workspaceId } })
  return created.pageUrl
}

export async function fetchInvoice(invoiceId: string) {
  return monoInvoiceSchema.parse(await monoFetch(`/api/merchant/invoice/status?invoiceId=${encodeURIComponent(invoiceId)}`))
}

export async function fetchWebhookKey() {
  return z.object({ key: z.string() }).parse(await monoFetch("/api/merchant/pubkey")).key
}

/**
 * Record an invoice's status and update the plan it pays for. Safe to repeat: webhooks can
 * arrive twice or out of order, and each invoice extends the plan only once.
 */
export async function applyInvoice(invoiceId: string, invoice: MonoInvoice) {
  const modifiedDate = invoice.modifiedDate ? new Date(invoice.modifiedDate) : null
  return db.$transaction(async (tx) => {
    const row = await tx.monoInvoice.findUnique({ where: { invoiceId } })
    if (!row) return null
    if (row.modifiedDate && modifiedDate && modifiedDate < row.modifiedDate) return row.status
    await tx.monoInvoice.update({ where: { id: row.id }, data: { status: invoice.status, modifiedDate } })

    if (invoice.status === "success") {
      const claimed = await tx.monoInvoice.updateMany({ where: { id: row.id, appliedAt: null }, data: { appliedAt: new Date() } })
      const cardToken = invoice.walletData?.status === "created" ? invoice.walletData.cardToken : undefined
      if (claimed.count === 1) {
        const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: row.workspaceId } })
        const now = new Date()
        const base = workspace.currentPeriodEnd && workspace.currentPeriodEnd > now ? workspace.currentPeriodEnd : now
        await tx.workspace.update({
          where: { id: row.workspaceId },
          data: { subscriptionStatus: "active", currentPeriodEnd: addMonth(base), cancelAtPeriodEnd: false, monoCardToken: cardToken },
        })
      } else if (cardToken) {
        await tx.workspace.update({ where: { id: row.workspaceId }, data: { monoCardToken: cardToken } })
      }
    } else if (invoice.status === "failure" && row.periodKey) {
      await tx.workspace.update({ where: { id: row.workspaceId }, data: { subscriptionStatus: "past_due" } })
    } else if (invoice.status === "reversed" && row.appliedAt) {
      await tx.workspace.update({
        where: { id: row.workspaceId },
        data: { subscriptionStatus: "canceled", currentPeriodEnd: null, cancelAtPeriodEnd: false, monoCardToken: null },
      })
    }
    return invoice.status
  })
}

/**
 * Refresh the newest invoice, for the buyer returning from the payment page and for card tokens
 * that were still being created when the payment finished. The token is read from the invoice
 * because monobank may keep a known card in the wallet it was first saved to.
 */
export async function syncLatestInvoice(workspaceId: string) {
  const row = await db.monoInvoice.findFirst({ where: { workspaceId, invoiceId: { not: null } }, orderBy: { createdAt: "desc" } })
  if (!row?.invoiceId) return null
  return applyInvoice(row.invoiceId, await fetchInvoice(row.invoiceId))
}

/**
 * Charge one workspace's saved card for the period that just ended. The unique period key is
 * written before charging, so a retry can never bill the same period twice.
 */
export async function chargeRenewal(workspace: { id: string; monoCardToken: string; currentPeriodEnd: Date }, origin: string) {
  const periodKey = `${workspace.id}:${workspace.currentPeriodEnd.toISOString()}`
  const claimed = await db.monoInvoice.createMany({ data: [{ workspaceId: workspace.id, periodKey }], skipDuplicates: true })
  if (claimed.count === 0) return
  try {
    const payment = monoInvoiceSchema.parse(
      await monoFetch("/api/merchant/wallet/payment", {
        method: "POST",
        body: JSON.stringify({
          cardToken: workspace.monoCardToken,
          amount: env.MONO_AMOUNT_MINOR,
          ccy: env.MONO_CCY,
          initiationKind: "merchant",
          webHookUrl: webhookUrl(origin),
        }),
      }),
    )
    if (!payment.invoiceId) throw new Error("monobank did not return an invoice id")
    await db.monoInvoice.update({ where: { periodKey }, data: { invoiceId: payment.invoiceId } })
    await applyInvoice(payment.invoiceId, payment)
  } catch (error) {
    console.error("[billing] renewal failed", error)
    await db.monoInvoice.update({ where: { periodKey }, data: { status: "failure" } })
    await db.workspace.update({ where: { id: workspace.id }, data: { subscriptionStatus: "past_due" } })
  }
}
