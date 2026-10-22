import { useId } from "react"
import { cn } from "@/lib/utils"
import { LOGO_ORIGIN, LOGO_PETALS, LOGO_STEM } from "./logo-paths"

type Tone = "brand" | "light" | "mono" | "outline"

const PETAL_OPACITY = [0.92, 1, 0.82] as const

/**
 * Outbranch symbol — one origin, multiple growth paths.
 * A single origin flows into three rounded branches that fan outward.
 */
export function LogoMark({
  tone = "brand",
  className,
  title = "Outbranch",
}: {
  tone?: Tone
  className?: string
  title?: string
}) {
  const gradient = `ob-grad-${useId().replace(/:/g, "")}`
  const [from, to] = tone === "light" ? ["#F1D3DB", "#D89AA8"] : ["#6B112E", "#D89AA8"]
  const solid = tone === "mono" || tone === "outline"
  const fill = tone === "outline" ? "none" : solid ? "currentColor" : `url(#${gradient})`

  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={cn("shrink-0", className)}>
      {!solid && (
        <defs>
          <linearGradient id={gradient} x1="10" y1="40" x2="54" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={from} />
            <stop offset="0.45" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>
      )}
      <g
        fill={fill}
        stroke={tone === "outline" ? "currentColor" : "none"}
        strokeWidth={1.6}
        strokeLinejoin="round"
      >
        <path d={LOGO_STEM} />
        {LOGO_PETALS.map((d, i) => (
          <path key={d} d={d} opacity={solid ? 1 : PETAL_OPACITY[i]} />
        ))}
      </g>
      {tone !== "outline" && <circle {...LOGO_ORIGIN} fill={solid ? "currentColor" : from} />}
    </svg>
  )
}

export function Logo({
  tone = "brand",
  className,
  markClassName,
}: {
  tone?: Tone
  className?: string
  markClassName?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[0.3em] font-heading font-bold tracking-[-0.035em]",
        tone === "light" && "text-[#F8F3EE]",
        tone === "brand" && "text-aubergine",
        className,
      )}
    >
      <LogoMark tone={tone} className={cn("size-[1.3em]", markClassName)} />
      <span className="leading-none">outbranch</span>
    </span>
  )
}
