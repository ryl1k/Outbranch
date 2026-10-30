import { Check } from "lucide-react"
import { FREE_FEATURES, PRO_FEATURES, PRO_PRICE_USD } from "@/lib/billing"
import { cn } from "@/lib/utils"

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

function CurrentBadge() {
  return <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Current plan</span>
}

/** Free and Pro side by side. Shared by the pricing page and billing; each caller supplies the actions. */
export function PlanCards({
  current,
  freeAction,
  proAction,
  className,
}: {
  current: "free" | "pro" | null
  freeAction: React.ReactNode
  proAction: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid gap-6 md:grid-cols-2", className)}>
      <section className={cn("flex flex-col gap-6 rounded-2xl border bg-card p-7 shadow-soft", current === "free" && "border-2 border-primary-ink")}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Free</h3>
            {current === "free" && <CurrentBadge />}
          </div>
          <p className="text-4xl font-semibold">
            $0<span className="text-base font-normal text-muted-foreground"> / month</span>
          </p>
        </div>
        <FeatureList items={FREE_FEATURES} />
        <div className="mt-auto">{freeAction}</div>
      </section>

      <section className={cn("flex flex-col gap-6 rounded-2xl border bg-card p-7 shadow-soft", current !== "free" && "border-2 border-primary-ink")}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Pro</h3>
            {current === "pro" ? (
              <CurrentBadge />
            ) : (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Most popular</span>
            )}
          </div>
          <p className="text-4xl font-semibold">
            ${PRO_PRICE_USD}
            <span className="text-base font-normal text-muted-foreground"> / month</span>
          </p>
        </div>
        <FeatureList items={PRO_FEATURES} />
        <div className="mt-auto space-y-2">
          {proAction}
          <p className="text-center text-xs text-muted-foreground">Billed monthly. Cancel any time.</p>
        </div>
      </section>
    </div>
  )
}
