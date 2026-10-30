"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useInView, useReducedMotion } from "./motion"

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

/** How long each signal stays selected while the preview plays on its own. */
const CYCLE_MS = 5200

type Geo = { w: number; h: number; d: string } | null

export function SignalPreview() {
  const [index, setIndex] = useState(0)
  const [userTook, setUserTook] = useState(false)
  const [hovering, setHovering] = useState(false)
  const reduced = useReducedMotion()
  const { ref: rootRef, inView } = useInView<HTMLDivElement>({ threshold: 0.3 })
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const firstNode = useRef<HTMLSpanElement | null>(null)
  const [geo, setGeo] = useState<Geo>(null)
  const current = SIGNALS[index]
  const autoplay = inView && !userTook && !hovering && !reduced

  // Advance through the signals until the visitor takes over.
  useEffect(() => {
    if (!autoplay) return
    const t = setTimeout(() => setIndex((i) => (i + 1) % SIGNALS.length), CYCLE_MS)
    return () => clearTimeout(t)
  }, [autoplay, index])

  // Connector from the selected signal to the first node in the panel.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const measure = () => {
      const item = items.current[index]
      const node = firstNode.current
      if (!item || !node) return
      const box = root.getBoundingClientRect()
      const a = item.getBoundingClientRect()
      const b = node.getBoundingClientRect()
      const x0 = a.right - box.left
      const y0 = a.top + a.height / 2 - box.top
      const x1 = b.left + b.width / 2 - box.left
      const y1 = b.top + b.height / 2 - box.top
      // Only draw when the panel sits beside the list (wide layouts).
      if (x1 - x0 < 40) return setGeo(null)
      const mid = (x1 - x0) * 0.5
      setGeo({ w: box.width, h: box.height, d: `M ${x0} ${y0} C ${x0 + mid} ${y0}, ${x1 - mid} ${y1}, ${x1} ${y1}` })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    return () => ro.disconnect()
  }, [index, rootRef])

  const select = (i: number) => {
    setUserTook(true)
    setIndex(i)
  }

  const steps = [
    { label: "Shared taste with the brand’s audience", value: current.signal, tone: "text-lg text-ivory" },
    { label: `Hypothesis · ${current.category}`, value: current.opportunity, tone: "font-editorial text-2xl leading-snug text-ivory" },
    { label: "How it makes money", value: current.mechanism, tone: "text-sm leading-relaxed text-ivory/80" },
  ]

  return (
    <div
      ref={rootRef}
      className="relative grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-24"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={() => setHovering(false)}
    >
      {geo && (
        <svg className="pointer-events-none absolute inset-0 hidden overflow-visible lg:block" width={geo.w} height={geo.h} aria-hidden>
          <defs>
            <linearGradient id="sp-link" x1="0" x2="1">
              <stop offset="0" stopColor="#D89AA8" stopOpacity="0.4" />
              <stop offset="1" stopColor="#FFF4F6" />
            </linearGradient>
            <filter id="sp-glow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>
          {/* Keyed by the selection so the branch re-grows each time. */}
          <g key={current.key}>
            <path d={geo.d} fill="none" stroke="#D89AA8" strokeWidth="10" strokeOpacity="0.35" filter="url(#sp-glow)" className="animate-rise" />
            <path
              d={geo.d}
              fill="none"
              stroke="url(#sp-link)"
              strokeWidth="2.5"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1"
              className={reduced ? undefined : "animate-draw-path"}
              style={{ "--path-length": 1, animationDuration: "700ms" } as React.CSSProperties}
            />
          </g>
        </svg>
      )}

      <div>
        <p className="text-sm text-ivory/60">
          Harbor &amp; Pine, an outdoor coffee roaster.{" "}
          <span className="rounded bg-rose/15 px-1.5 py-0.5 text-xs text-rose">Illustrative</span>
        </p>
        <div className="mt-5 flex flex-col gap-2" role="tablist" aria-label="Cultural signals" aria-orientation="vertical">
          {SIGNALS.map((s, i) => {
            const on = i === index
            return (
              <button
                key={s.key}
                ref={(el) => {
                  items.current[i] = el
                }}
                id={`signal-tab-${s.key}`}
                aria-controls="signal-panel"
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => select(i)}
                className={cn(
                  "relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-xl border px-4 py-3.5 text-left transition-all duration-300",
                  on ? "border-rose/60 bg-burgundy/45 lg:translate-x-2" : "border-ivory/10 hover:border-ivory/25 hover:bg-ivory/[0.03]",
                )}
              >
                <span className="flex items-center gap-3 font-medium text-ivory">
                  <span className={cn("size-2 rounded-full transition-colors", on ? "bg-rose shadow-[0_0_10px_2px_rgb(216_154_168/0.6)]" : "bg-ivory/20")} />
                  {s.signal}
                </span>
                <span className="text-xs text-ivory/50">{s.domain}</span>
                {/* Time until the preview moves on by itself. */}
                {on && autoplay && (
                  <span
                    key={`${s.key}-${index}`}
                    aria-hidden
                    className="absolute bottom-0 left-0 h-0.5 w-full origin-left bg-rose/70 animate-[grow-x_linear_forwards]"
                    style={{ animationDuration: `${CYCLE_MS}ms` }}
                  />
                )}
              </button>
            )
          })}
        </div>
        <p className="mt-4 text-xs text-ivory/45">{userTook ? "Choose any signal to follow its path." : "Playing through the signals. Choose one to take over."}</p>
      </div>

      <div
        role="tabpanel"
        id="signal-panel"
        aria-labelledby={`signal-tab-${current.key}`}
        aria-live="polite"
        className="relative overflow-hidden rounded-2xl border border-ivory/10 bg-gradient-to-br from-ivory/[0.05] to-transparent p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-burgundy/40 blur-3xl" aria-hidden />
        <ol key={current.key} className="relative space-y-7 pl-9">
          {/* The path inside the panel: signal → hypothesis → revenue. */}
          <span
            aria-hidden
            className={cn(
              "absolute top-2 bottom-2 left-[9px] w-px origin-top bg-gradient-to-b from-rose via-rose/50 to-sage/60",
              !reduced && "animate-[grow-y_900ms_cubic-bezier(0.22,1,0.36,1)_both]",
            )}
          />
          {steps.map((step, i) => (
            <li key={step.label} className={cn("relative", !reduced && "animate-rise")} style={{ animationDelay: reduced ? undefined : `${120 + i * 220}ms` }}>
              <span
                ref={i === 0 ? firstNode : undefined}
                aria-hidden
                className={cn(
                  "absolute top-1 -left-9 grid size-[19px] place-items-center rounded-full border",
                  i === 0 ? "border-rose bg-rose/25" : i === 1 ? "border-rose/70 bg-burgundy" : "border-sage/70 bg-aubergine",
                )}
              >
                <span className={cn("size-1.5 rounded-full", i === 2 ? "bg-sage" : "bg-rose")} />
              </span>
              <p className="text-xs text-ivory/50">{step.label}</p>
              <p className={cn("mt-1", step.tone)}>{step.value}</p>
            </li>
          ))}
        </ol>
        <p className="relative mt-7 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-rose/30 px-2.5 py-1 text-rose">Cultural evidence from Qloo</span>
          <span className="rounded-full border border-sage/40 px-2.5 py-1 text-sage">Sourced market research</span>
          <span className="rounded-full border border-ivory/20 px-2.5 py-1 text-ivory/70">Partner proposed, not confirmed</span>
        </p>
      </div>
    </div>
  )
}
