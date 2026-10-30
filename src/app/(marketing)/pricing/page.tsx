import { Suspense } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { CheckoutButton } from "@/components/billing/billing-buttons"
import { Button } from "@/components/ui/button"
import { ThemeToggle, WorkspaceTheme } from "@/components/workspace/theme"
import { FREE_FEATURES, PRO_FEATURES, PRO_PRICE_USD } from "@/lib/billing"
import { getViewer } from "@/server/auth/session"
import { getBillingState } from "@/server/billing/entitlements"

export const metadata = { title: "Pricing" }

async function ProCta() {
  const viewer = await getViewer()
  if (!viewer || viewer.user.isGuest) {
    return (
      <Button asChild size="lg" className="w-full">
        <Link href="/signup?next=/pricing">Create an account to subscribe</Link>
      </Button>
    )
  }
  const state = await getBillingState(viewer.workspace.id)
  if (state.subscribed) {
    return (
      <Button asChild size="lg" variant="outline" className="w-full">
        <Link href="/settings/billing">You are on Pro. Manage plan</Link>
      </Button>
    )
  }
  return <CheckoutButton className="w-full" label={`Subscribe for $${PRO_PRICE_USD} / month`} />
}

function FeatureList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-2.5 text-sm">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <Check className="mt-0.5 size-4 shrink-0 text-sage-strong" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function PricingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Same saved light/dark choice as the workspace. */}
      <WorkspaceTheme />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-8">
        <Link href="/" aria-label="Outbranch home">
          <Logo className="text-xl" />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle className="text-muted-foreground" />
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link href="/projects">Open workspace</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-4 pt-8 pb-20 sm:px-8">
        <div className="max-w-2xl space-y-3">
          <p className="eyebrow">Pricing</p>
          <h1 className="font-editorial text-4xl text-balance sm:text-5xl">Start free. Upgrade when research becomes routine.</h1>
          <p className="text-muted-foreground">
            Every plan runs the same Qloo-backed research. Pro removes the limits on how much of it you can run.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="flex flex-col gap-6 rounded-2xl border bg-card p-7 shadow-soft">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Free</h2>
              <p className="text-4xl font-semibold">
                $0<span className="text-base font-normal text-muted-foreground"> / month</span>
              </p>
            </div>
            <FeatureList items={FREE_FEATURES} />
            <Button asChild variant="outline" size="lg" className="mt-auto w-full">
              <Link href="/projects/new">Start researching</Link>
            </Button>
          </section>

          <section className="flex flex-col gap-6 rounded-2xl border-2 border-primary bg-card p-7 shadow-soft">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Pro</h2>
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Most popular</span>
              </div>
              <p className="text-4xl font-semibold">
                ${PRO_PRICE_USD}
                <span className="text-base font-normal text-muted-foreground"> / month</span>
              </p>
            </div>
            <FeatureList items={PRO_FEATURES} />
            <div className="mt-auto space-y-2">
              <Suspense fallback={<Button size="lg" className="w-full" disabled>Loading…</Button>}>
                <ProCta />
              </Suspense>
              <p className="text-center text-xs text-muted-foreground">Billed monthly. Cancel any time.</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
