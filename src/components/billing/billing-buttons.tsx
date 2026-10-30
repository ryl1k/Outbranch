"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { setCancelAtPeriodEnd, startCheckout } from "@/server/billing/actions"

/** Redirects to monobank on success, so a returned result is always a failure. */
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

export function RenewalButton({ className, cancelled }: { className?: string; cancelled: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      variant="outline"
      className={className}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setCancelAtPeriodEnd(!cancelled)
          if (!res.ok) toast.error(res.error)
          else {
            toast.success(cancelled ? "Your subscription will renew." : "Your subscription will not renew.")
            router.refresh()
          }
        })
      }
    >
      {pending && <Loader2 className="animate-spin" />} {cancelled ? "Resume subscription" : "Cancel subscription"}
    </Button>
  )
}
