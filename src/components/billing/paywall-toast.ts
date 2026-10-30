import { toast } from "sonner"

/** Show a failed action; plan-limit failures get an Upgrade button that opens the pricing page. */
export function toastActionError(result: { error: string; paywall?: boolean }, router: { push: (href: string) => void }) {
  if (result.paywall) {
    toast.error(result.error, { action: { label: "Upgrade", onClick: () => router.push("/pricing") } })
  } else {
    toast.error(result.error)
  }
}
