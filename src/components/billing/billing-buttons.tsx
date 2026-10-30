"use client"

import { useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { openBillingPortal, startCheckout } from "@/server/billing/actions"

/** Both actions redirect to Stripe on success, so a returned result is always a failure. */
export function CheckoutButton({ className, label = "Subscribe" }: { className?: string; label?: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      size="lg"
      className={className}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await startCheckout()
          if (res && !res.ok) toast.error(res.error)
        })
      }
    >
      {pending && <Loader2 className="animate-spin" />} {label}
    </Button>
  )
}

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
