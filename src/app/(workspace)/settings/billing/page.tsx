import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { CheckoutButton, ManageBillingButton } from "@/components/billing/billing-buttons"
import { PageHeader } from "@/components/workspace/primitives"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PRO_FEATURES, PRO_PRICE_USD } from "@/lib/billing"
import { requireViewer } from "@/server/auth/session"
import { getBillingState } from "@/server/billing/entitlements"

export const metadata = { title: "Billing" }

const dateFmt = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" })

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {used} of {limit} used
        </span>
      </div>
      <Progress value={Math.min(100, (used / limit) * 100)} className="h-2" />
    </div>
  )
}

export default async function BillingPage({ searchParams }: PageProps<"/settings/billing">) {
  const viewer = await requireViewer()
  const checkout = (await searchParams).checkout
  const state = await getBillingState(viewer.workspace.id, { isGuest: viewer.user.isGuest })

  return (
    <div className="workspace-width mx-auto space-y-8 px-4 py-8 sm:px-8 sm:py-10">
      <PageHeader eyebrow="Workspace" title="Billing" description="Your plan, what it includes and how much of the free allowance you have used." />

      {checkout === "success" && (
        <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft p-3 text-sm text-success" role="status">
          <CheckCircle2 className="size-4" /> Thank you. Your Pro plan is active.
        </p>
      )}
      {checkout === "pending" && !state.subscribed && (
        <p className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning" role="status">
          We have not received confirmation of your payment yet. This page will show Pro as soon as Stripe confirms it. Refresh in a moment.
        </p>
      )}

      <section className="space-y-5 rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="eyebrow">Current plan</p>
            <h2 className="text-2xl font-semibold">{state.subscribed ? "Pro" : "Free"}</h2>
            <p className="text-sm text-muted-foreground">
              {state.subscribed
                ? state.currentPeriodEnd
                  ? state.cancelAtPeriodEnd
                    ? `Cancels on ${dateFmt.format(state.currentPeriodEnd)}. You keep Pro until then.`
                    : `$${PRO_PRICE_USD} per month. Renews on ${dateFmt.format(state.currentPeriodEnd)}.`
                  : `$${PRO_PRICE_USD} per month.`
                : state.status
                  ? `Your last subscription is ${state.status.replaceAll("_", " ")}. Update your payment method to restore Pro.`
                  : "Upgrade for unlimited projects and deep dives."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {state.hasCustomer && <ManageBillingButton />}
            {!state.subscribed && !viewer.user.isGuest && <CheckoutButton label={`Upgrade for $${PRO_PRICE_USD} / month`} />}
            {!state.subscribed && viewer.user.isGuest && (
              <Button asChild>
                <Link href="/signup?next=/pricing">Create an account to subscribe</Link>
              </Button>
            )}
          </div>
        </div>

        {!state.subscribed && (
          <div className="grid gap-5 border-t pt-5 sm:grid-cols-2">
            <Meter label="Research projects" used={state.usage.projects} limit={state.limits.projects} />
            <Meter label="Deep dives" used={state.usage.deepDives} limit={state.limits.deepDives} />
          </div>
        )}
      </section>

      {!state.subscribed && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">What Pro adds</h2>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-sage-strong" aria-hidden /> {feature}
              </li>
            ))}
          </ul>
          <Link href="/pricing" className="inline-block text-sm text-primary-ink underline underline-offset-4">
            Compare plans
          </Link>
        </section>
      )}
    </div>
  )
}
