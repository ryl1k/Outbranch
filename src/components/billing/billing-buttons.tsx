"use client"

import { useState, useTransition } from "react"
import type { Package, Purchases } from "@revenuecat/purchases-js"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { openBillingPortal, startCheckout } from "@/server/billing/actions"

type Checkout = NonNullable<Awaited<ReturnType<typeof startCheckout>>["checkout"]>
type PlanChoice = { purchases: Purchases; packages: Package[]; email: string | null }

const CHECKOUT_FAILED = "The checkout could not be opened. Please try again."
const PERIOD_LABELS: Partial<Record<string, string>> = { $rc_monthly: "Monthly", $rc_annual: "Yearly" }

async function loadPlans({ apiKey, appUserId, email }: Checkout): Promise<PlanChoice> {
  // The SDK touches the browser on load, so it is only imported once it is needed.
  const { Purchases } = await import("@revenuecat/purchases-js")
  const purchases = Purchases.isConfigured() ? Purchases.getSharedInstance() : Purchases.configure({ apiKey, appUserId })
  if (purchases.getAppUserId() !== appUserId) await purchases.changeUser(appUserId)
  const offerings = await purchases.getOfferings()
  return { purchases, packages: offerings.current?.availablePackages ?? [], email }
}

/** Runs RevenueCat's checkout overlay. Returns false if the buyer closed it. */
async function purchasePlan({ purchases, email }: PlanChoice, rcPackage: Package) {
  const { ErrorCode, PurchasesError } = await import("@revenuecat/purchases-js")
  try {
    await purchases.purchase({ rcPackage, customerEmail: email ?? undefined })
    return true
  } catch (error) {
    if (error instanceof PurchasesError && error.errorCode === ErrorCode.UserCancelledError) return false
    throw error
  }
}

export function CheckoutButton({ className, label = "Subscribe" }: { className?: string; label?: string }) {
  const [pending, start] = useTransition()
  const [choice, setChoice] = useState<PlanChoice | null>(null)

  const openPlans = () =>
    start(async () => {
      const res = await startCheckout()
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      if (!res.checkout) return
      try {
        const plans = await loadPlans(res.checkout)
        if (plans.packages.length === 0) toast.error("Subscriptions are currently unavailable.")
        else setChoice(plans)
      } catch (error) {
        console.error("[billing] could not load plans", error)
        toast.error(CHECKOUT_FAILED)
      }
    })

  const buy = (plans: PlanChoice, rcPackage: Package) => {
    // Close first: the dialog's focus trap would otherwise block the checkout overlay.
    setChoice(null)
    start(async () => {
      try {
        // The server confirms the entitlement with RevenueCat; the browser's word is not enough.
        if (await purchasePlan(plans, rcPackage)) window.location.assign("/api/billing/return")
      } catch (error) {
        console.error("[billing] checkout failed", error)
        toast.error(CHECKOUT_FAILED)
      }
    })
  }

  return (
    <>
      <Button size="lg" className={className} disabled={pending} onClick={openPlans}>
        {pending && <Loader2 className="animate-spin" />} {label}
      </Button>
      <Dialog open={choice !== null} onOpenChange={(open) => !open && setChoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose your Pro plan</DialogTitle>
            <DialogDescription>Unlimited research projects and deep dives. Cancel any time.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {choice?.packages.map((rcPackage) => (
              <li key={rcPackage.identifier}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-muted/50 dark:hover:border-rose"
                  onClick={() => buy(choice, rcPackage)}
                >
                  <span className="font-semibold">{PERIOD_LABELS[rcPackage.identifier] ?? rcPackage.webBillingProduct.title}</span>
                  <span className="font-mono text-sm">{rcPackage.webBillingProduct.price.formattedPrice}</span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Redirects to the management page on success, so a returned result is always a failure. */
export function ManageBillingButton({ className }: { className?: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="outline"
      className={className}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await openBillingPortal()
          if (res && !res.ok) toast.error(res.error)
        })
      }
    >
      {pending && <Loader2 className="animate-spin" />} Manage billing
    </Button>
  )
}
