import { Suspense } from "react"
import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { CheckoutButton } from "@/components/billing/billing-buttons"
import { PlanCards } from "@/components/billing/plan-cards"
import { Button } from "@/components/ui/button"
import { ThemeToggle, WorkspaceTheme } from "@/components/workspace/theme"
import { PRO_PRICE_USD } from "@/lib/billing"
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

        <PlanCards
          current={null}
          freeAction={
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/projects/new">Start researching</Link>
            </Button>
          }
          proAction={
            <Suspense fallback={<Button size="lg" className="w-full" disabled>Loading…</Button>}>
              <ProCta />
            </Suspense>
          }
        />
      </main>
    </div>
  )
}
