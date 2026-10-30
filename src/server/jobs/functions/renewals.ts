import { applyInvoice, chargeRenewal, fetchInvoice, syncLatestInvoice } from "@/server/billing/mono"
import { db } from "@/server/db"
import { env } from "@/server/env"
import { inngest } from "../client"

const OPEN_INVOICE_GRACE_MS = 60 * 60 * 1000

/**
 * monobank charges saved cards only when asked, so renewals run from here: finish cancelled
 * plans, reconcile invoices whose webhook never came, then charge what is due.
 */
export const renewSubscriptions = inngest.createFunction(
  { id: "renew-subscriptions", triggers: [{ cron: "0 * * * *" }] },
  async ({ step }) => {
    if (!env.MONO_TOKEN) return { skipped: true }

    await step.run("save-missing-card-tokens", async () => {
      const missing = await db.workspace.findMany({
        where: { subscriptionStatus: "active", monoCardToken: null, monoInvoices: { some: { appliedAt: { not: null } } } },
        select: { id: true },
        take: 100,
      })
      for (const workspace of missing) await syncLatestInvoice(workspace.id)
    })

    await step.run("end-cancelled-plans", async () => {
      await db.workspace.updateMany({
        where: {
          subscriptionStatus: "active",
          currentPeriodEnd: { lte: new Date() },
          // Without a saved card there is nothing to charge, so the plan ends too.
          OR: [{ cancelAtPeriodEnd: true }, { monoCardToken: null }],
        },
        data: { subscriptionStatus: "canceled", cancelAtPeriodEnd: false, monoCardToken: null },
      })
    })

    await step.run("reconcile-open-invoices", async () => {
      const open = await db.monoInvoice.findMany({
        where: {
          invoiceId: { not: null },
          status: { in: ["created", "processing"] },
          createdAt: { lt: new Date(Date.now() - OPEN_INVOICE_GRACE_MS) },
        },
        take: 100,
      })
      for (const row of open) await applyInvoice(row.invoiceId!, await fetchInvoice(row.invoiceId!))
    })

    return step.run("charge-due-renewals", async () => {
      const due = await db.workspace.findMany({
        where: {
          subscriptionStatus: "active",
          cancelAtPeriodEnd: false,
          monoCardToken: { not: null },
          currentPeriodEnd: { lte: new Date() },
        },
        select: { id: true, monoCardToken: true, currentPeriodEnd: true },
        take: 100,
      })
      const origin = env.APP_URL?.replace(/\/$/, "") ?? "http://localhost"
      for (const workspace of due) {
        await chargeRenewal({ id: workspace.id, monoCardToken: workspace.monoCardToken!, currentPeriodEnd: workspace.currentPeriodEnd! }, origin)
      }
      return { charged: due.length }
    })
  },
)
