"use client"

import { useState } from "react"
import { ArrowRight, BarChart3, Globe2, Package, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const ORIGIN = { x: 210, y: 300 }

const DESTINATIONS = [
  { key: "markets", label: "New markets", icon: BarChart3, y: 92, detail: "Regions where your audience's taste is already present." },
  { key: "partners", label: "Strategic partners", icon: Users, y: 228, detail: "Brands and IP that share your audience's affinities." },
  { key: "signals", label: "Cultural signals", icon: Globe2, y: 372, detail: "Artists, shows, games and places your audience loves." },
  { key: "products", label: "New products", icon: Package, y: 508, detail: "Adjacent categories with a credible commercial path." },
] as const

/** Secondary hairlines that give the fan its depth; they never end in a destination. */
const HAIRLINES = [40, 160, 300, 440, 560]

function path(y: number, bend = 0) {
  return `M ${ORIGIN.x} ${ORIGIN.y} C ${ORIGIN.x + 190} ${ORIGIN.y}, ${ORIGIN.x + 230 + bend} ${y}, 640 ${y}`
}

/** A filled ribbon that leaves the origin as a point and widens toward its destination. */
function ribbon(y: number, width: number) {
  const { x, y: oy } = ORIGIN
  return `M ${x} ${oy} C ${x + 200} ${oy - 2}, ${x + 240} ${y - width}, 640 ${y - width} L 640 ${y + width} C ${x + 250} ${y + width}, ${x + 210} ${oy + 2}, ${x} ${oy} Z`
}

export function HeroFlow() {
  const [active, setActive] = useState<string | null>(null)
  const current = DESTINATIONS.find((d) => d.key === active)

  return (
    <div>
      <div className="relative">
      <svg viewBox="0 0 640 600" className="h-auto w-full" aria-hidden>
        <defs>
          <linearGradient id="hero-path" x1="0" x2="1">
            <stop offset="0" stopColor="#6B112E" stopOpacity="0.4" />
            <stop offset="0.5" stopColor="#D89AA8" stopOpacity="0.9" />
            <stop offset="1" stopColor="#F8F3EE" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="hero-ribbon" x1="0" x2="1">
            <stop offset="0" stopColor="#6B112E" stopOpacity="0.9" />
            <stop offset="0.55" stopColor="#D89AA8" stopOpacity="0.35" />
            <stop offset="1" stopColor="#D89AA8" stopOpacity="0.05" />
          </linearGradient>
          <radialGradient id="hero-glow">
            <stop offset="0" stopColor="#6B112E" stopOpacity="0.7" />
            <stop offset="1" stopColor="#6B112E" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={ORIGIN.x + 120} cy={ORIGIN.y} r="300" fill="url(#hero-glow)" />
        {[
          { y: 140, w: 34 },
          { y: 300, w: 22 },
          { y: 470, w: 40 },
        ].map((r, i) => (
          <path
            key={r.y}
            d={ribbon(r.y, r.w)}
            fill="url(#hero-ribbon)"
            className="animate-rise"
            style={{ animationDelay: `${500 + i * 150}ms`, opacity: active ? 0.45 : 0.8 }}
          />
        ))}
        {HAIRLINES.map((y, i) => (
          <path
            key={y}
            d={path(y, 60)}
            fill="none"
            stroke="#D89AA8"
            strokeOpacity="0.18"
            strokeWidth="1"
            strokeDasharray="1400"
            className="animate-draw-path"
            style={{ "--path-length": 1400, animationDelay: `${300 + i * 80}ms` } as React.CSSProperties}
          />
        ))}
        {DESTINATIONS.map((d, i) => {
          const on = active === d.key
          const dim = active !== null && !on
          return (
            <path
              key={d.key}
              d={path(d.y)}
              fill="none"
              stroke="url(#hero-path)"
              strokeWidth={on ? 3.5 : 2}
              strokeOpacity={dim ? 0.25 : 1}
              strokeDasharray="1400"
              className="animate-draw-path transition-[stroke-width,stroke-opacity] duration-300"
              style={{ "--path-length": 1400, animationDelay: `${i * 120}ms` } as React.CSSProperties}
            />
          )
        })}
        <circle cx={ORIGIN.x} cy={ORIGIN.y} r="26" fill="none" stroke="#F8F3EE" strokeOpacity="0.25" />
        <circle cx={ORIGIN.x} cy={ORIGIN.y} r="12" fill="#F8F3EE" />
        <circle cx={ORIGIN.x} cy={ORIGIN.y} r="5" fill="#6B112E" />
      </svg>

      <ul className="absolute inset-0">
        {DESTINATIONS.map((d) => {
          const Icon = d.icon
          return (
            <li key={d.key} className="absolute right-0" style={{ top: `${(d.y / 600) * 100}%`, transform: "translateY(-50%)" }}>
              <button
                type="button"
                onMouseEnter={() => setActive(d.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(d.key)}
                onBlur={() => setActive(null)}
                aria-describedby="hero-flow-detail"
                className={cn(
                  "flex items-center gap-3 rounded-full border px-4 py-2.5 text-sm font-medium whitespace-nowrap backdrop-blur transition-colors sm:px-5 sm:py-3",
                  active === d.key
                    ? "border-rose bg-burgundy text-ivory"
                    : "border-rose/30 bg-burgundy/45 text-ivory/90 hover:border-rose/60",
                )}
              >
                <Icon className="size-4 text-rose" />
                {d.label}
                <ArrowRight className="hidden size-4 opacity-70 sm:block" />
              </button>
            </li>
          )
        })}
      </ul>
      </div>

      <p id="hero-flow-detail" aria-live="polite" className="mt-2 min-h-6 text-sm text-ivory/60">
        {current ? current.detail : "One origin. Multiple growth paths."}
      </p>
    </div>
  )
}
