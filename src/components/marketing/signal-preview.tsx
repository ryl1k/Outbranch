"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Landing-page preview. A fictional brand with invented example signals — it
 * demonstrates the interaction and is labelled as illustrative, never as research.
 */
const SIGNALS = [
  {
    key: "trail",
    signal: "Trail-running podcasts",
    domain: "Podcasts",
    opportunity: "Sponsored long-run fuel kit sold through race organisers",
    mechanism: "Race organisers buy kits per entrant; the brand earns wholesale margin and a direct customer list.",
    category: "Partnership",
  },
  {
    key: "folk",
    signal: "Folk-revival artists",
    domain: "Music artists",
    opportunity: "Limited tour-edition blends sold at merch tables",
    mechanism: "Artists take a royalty per tin; the brand sells through tour merch and its own store.",
    category: "Collaboration",
  },
  {
    key: "parks",
    signal: "National-park destinations",
    domain: "Destinations",
    opportunity: "Visitor-centre retail in gateway towns",
    mechanism: "Concession operators buy wholesale; seasonal packaging lifts price per unit.",
    category: "Geographic expansion",
  },
  {
    key: "apparel",
    signal: "Independent outdoor apparel",
    domain: "Brands",
    opportunity: "Co-branded field mugs and camp kit",
    mechanism: "Licensing fee plus revenue share on each co-branded item.",
    category: "Licensing",
  },
] as const

export function SignalPreview() {
  const [active, setActive] = useState<string>(SIGNALS[0].key)
  const current = SIGNALS.find((s) => s.key === active)!

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
      <div>
        <p className="text-sm text-ivory/60">
          Harbor &amp; Pine, an outdoor coffee roaster. <span className="rounded bg-rose/15 px-1.5 py-0.5 text-xs text-rose">Illustrative</span>
        </p>
        <div className="mt-5 flex flex-col gap-2" role="tablist" aria-label="Cultural signals" aria-orientation="vertical">
          {SIGNALS.map((s) => (
              <button
                key={s.key}
                id={`signal-tab-${s.key}`}
                aria-controls="signal-panel"
                type="button"
                role="tab"
                aria-selected={active === s.key}
                onClick={() => setActive(s.key)}
                className={cn(
                  "flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors",
                  active === s.key ? "border-rose/60 bg-burgundy/40" : "border-ivory/10 hover:border-ivory/25",
                )}
              >
                <span className="font-medium text-ivory">{s.signal}</span>
                <span className="text-xs text-ivory/50">{s.domain}</span>
              </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" id="signal-panel" aria-labelledby={`signal-tab-${current.key}`} className="relative overflow-hidden rounded-2xl border border-ivory/10 bg-ivory/[0.03] p-6 sm:p-8">
        <dl className="relative space-y-6">
          <div>
            <dt className="text-xs text-ivory/50">Shared taste with the brand’s audience</dt>
            <dd className="mt-1 text-lg text-ivory">{current.signal}</dd>
          </div>
          <div className="border-l border-rose/40 pl-4">
            <dt className="text-xs text-ivory/50">Hypothesis · {current.category}</dt>
            <dd className="mt-1 font-editorial text-2xl leading-snug text-ivory">{current.opportunity}</dd>
          </div>
          <div>
            <dt className="text-xs text-ivory/50">How it makes money</dt>
            <dd className="mt-1 text-sm leading-relaxed text-ivory/80">{current.mechanism}</dd>
          </div>
        </dl>
        <p className="relative mt-6 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-rose/30 px-2.5 py-1 text-rose">Cultural evidence from Qloo</span>
          <span className="rounded-full border border-sage/40 px-2.5 py-1 text-sage">Sourced market research</span>
          <span className="rounded-full border border-ivory/20 px-2.5 py-1 text-ivory/70">Partner proposed, not confirmed</span>
        </p>
      </div>
    </div>
  )
}
