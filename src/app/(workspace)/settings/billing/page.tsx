import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { CheckoutButton, RenewalButton } from "@/components/billing/billing-buttons"
import { PlanCards } from "@/components/billing/plan-cards"
import { PageHeader } from "@/components/workspace/primitives"
import { Button } from "@/components/ui/button"
import { PRO_PRICE_USD } from "@/lib/billing"
import { requireViewer } from "@/server/auth/session"
import { getBillingState } from "@/server/billing/entitlements"

export const metadata = { title: "Billing" }

const dateFmt = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" })

export default async function BillingPage({ searchParams }: PageProps<"/settings/billing">) {
  const viewer = await requireViewer()
  const checkout = (await searchParams).checkout
  const state = await getBillingState(viewer.workspace.id, { isGuest: viewer.user.isGuest })
  const guest = viewer.user.isGuest
  const periodEnd = state.currentPeriodEnd && dateFmt.format(state.currentPeriodEnd)

  const summary = state.subscribed
    ? state.cancelAtPeriodEnd
      ? `Cancelled. You keep Pro until ${periodEnd ?? "the end of the paid period"}, then this workspace moves to Free.`
      : `$${PRO_PRICE_USD} per month${periodEnd ? `, renews on ${periodEnd}` : ""}.`
    : state.status
      ? `Your last subscription is ${state.status.replaceAll("_", " ")}. Subscribe again to restore Pro.`
      : `Projects left: ${Math.max(0, state.limits.projects - state.usage.projects)} of ${state.limits.projects}. Deep dives left: ${Math.max(0, state.limits.deepDives - state.usage.deepDives)} of ${state.limits.deepDives}.`

  const upgrade = guest ? (
    <Button asChild size="lg" className="w-full">
      <Link href="/signup?next=/settings/billing">Create an account to subscribe</Link>
    </Button>
  ) : (
    <CheckoutButton className="w-full" label={`Upgrade for $${PRO_PRICE_USD} / month`} />
  )
  const currentButton = (
    <Button size="lg" variant="outline" className="w-full" disabled>
      Your current plan
    </Button>
  )

  return (
    <div className="workspace-width mx-auto space-y-10 px-4 py-8 sm:px-8 sm:py-10">
      <PageHeader eyebrow="Workspace" title="Billing" description="Your plan, how to change it and how billing works." />

      {checkout === "success" && (
        <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft p-3 text-sm text-success" role="status">
          <CheckCircle2 className="size-4" /> Thank you. Your Pro plan is active.
        </p>
      )}
      {checkout === "failed" && (
        <p className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning" role="status">
          The payment did not go through and you have not been charged. You can try again below.
        </p>
      )}
      {checkout === "pending" && !state.subscribed && (
        <p className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning" role="status">
          We have not received confirmation of your payment yet. This page will show Pro as soon as the payment is confirmed. Refresh in a moment.
        </p>
      )}

      <section aria-labelledby="current-plan" className="flex flex-col gap-5 rounded-xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="eyebrow">Current plan</p>
          <h2 id="current-plan" className="text-2xl font-semibold">
            {state.subscribed ? "Pro" : "Free"}
          </h2>
          <p className="text-sm text-muted-foreground">{summary}</p>
          <Link href="/settings/activity" className="inline-block pt-1 text-sm text-primary-ink underline-offset-4 hover:underline">
            See usage and what is left
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.subscribed && state.canChangeRenewal && <RenewalButton cancelled={state.cancelAtPeriodEnd} />}
        </div>
      </section>

      <section aria-labelledby="plans" className="space-y-4">
        <h2 id="plans" className="text-lg font-semibold">
          Plans
        </h2>
        <PlanCards
          current={state.subscribed ? "pro" : "free"}
          freeAction={
            state.subscribed ? (
              <p className="text-center text-xs text-muted-foreground">
                {state.cancelAtPeriodEnd
                  ? `This workspace moves to Free ${periodEnd ? `on ${periodEnd}` : "when the paid period ends"}. Your projects and reports stay.`
                  : "Cancel Pro to switch back. Your projects and reports stay."}
              </p>
            ) : (
              currentButton
            )
          }
          proAction={state.subscribed ? currentButton : upgrade}
        />
      </section>

      <section aria-labelledby="how-billing-works" className="space-y-2 text-sm text-muted-foreground">
        <h2 id="how-billing-works" className="text-base font-semibold text-foreground">
          How billing works
        </h2>
        <p>Payments are taken on a secure monobank page. Your card is saved there and charged each month until you cancel here.</p>
        <p>
          If you cancel, Pro stays active until the end of the period you have paid for. After that, the free limits apply to new research. Nothing
          you have already created is deleted.
        </p>
      </section>
    </div>
  )
}
