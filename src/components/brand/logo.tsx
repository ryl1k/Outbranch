import { useId } from "react"
import { cn } from "@/lib/utils"
import { LOGO_LOWER, LOGO_PETAL, LOGO_STROKE, LOGO_UPPER, LOGO_VIEWBOX } from "./logo-paths"

type Tone = "brand" | "light" | "mono" | "outline"

const PALETTE: Record<"brand" | "light", { arm: [string, string]; armDark: string; petal: [string, string] }> = {
  brand: { arm: ["#4a0b20", "#8a1a3d"], armDark: "#5a0e27", petal: ["#c97f91", "#e2aab6"] },
  light: { arm: ["#f6dfe4", "#f9ecef"], armDark: "#e7b9c4", petal: ["#c4798b", "#e4a9b6"] },
}

/**
 * Outbranch symbol — one origin, multiple growth paths.
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
  const id = useId().replace(/:/g, "")
  if (tone === "mono" || tone === "outline") {
    const outline = tone === "outline"
    return (
      <svg viewBox={LOGO_VIEWBOX} role="img" aria-label={title} className={cn("shrink-0", className)} fill="none" strokeLinecap="round">
        {[LOGO_LOWER, LOGO_UPPER].map((d) => (
          <g key={d}>
            <path d={d} stroke="currentColor" strokeWidth={outline ? LOGO_STROKE + 3 : LOGO_STROKE} />
            {outline && <path d={d} stroke="var(--card, #fff)" strokeWidth={LOGO_STROKE - 1} />}
          </g>
        ))}
        <path d={LOGO_PETAL} fill={outline ? "var(--card, #fff)" : "currentColor"} stroke={outline ? "currentColor" : "none"} strokeWidth={2} strokeOpacity={outline ? 1 : 0} />
      </svg>
    )
  }
  const p = PALETTE[tone]
  return (
    <svg viewBox={LOGO_VIEWBOX} role="img" aria-label={title} className={cn("shrink-0", className)} fill="none" strokeLinecap="round">
      <defs>
        <linearGradient id={`arm-${id}`} x1="10" y1="45" x2="78" y2="11" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={p.arm[0]} />
          <stop offset="1" stopColor={p.arm[1]} />
        </linearGradient>
        <linearGradient id={`low-${id}`} x1="36" y1="49" x2="78" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={p.armDark} />
          <stop offset="1" stopColor={p.arm[1]} />
        </linearGradient>
        {/* Soft shadow where the upper arm crosses the lower arm and petal. */}
        <filter id={`shade-${id}`} filterUnits="userSpaceOnUse" x="-5" y="-5" width="115" height="95">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.3" floodColor="#1a0610" floodOpacity={tone === "light" ? 0.35 : 0.45} />
        </filter>
        <linearGradient id={`petal-${id}`} x1="44" y1="45" x2="100" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={p.petal[0]} stopOpacity="0.55" />
          <stop offset="1" stopColor={p.petal[1]} />
        </linearGradient>
      </defs>
      <path d={LOGO_PETAL} fill={`url(#petal-${id})`} />
      <path d={LOGO_LOWER} stroke={`url(#low-${id})`} strokeWidth={LOGO_STROKE} />
      <path d={LOGO_UPPER} stroke={`url(#arm-${id})`} strokeWidth={LOGO_STROKE} filter={`url(#shade-${id})`} />
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
        "inline-flex items-center gap-[0.25em] font-heading font-bold tracking-[-0.035em]",
        tone === "light" && "text-[#F8F3EE]",
        tone === "brand" && "text-aubergine dark:text-[#F8F3EE]",
        className,
      )}
    >
      {tone === "brand" ? (
        <>
          {/* The brand mark is dark burgundy; swap to the light mark where the dark theme applies. */}
          <LogoMark tone="brand" className={cn("size-[1.45em] dark:hidden", markClassName)} />
          <LogoMark tone="light" className={cn("hidden size-[1.45em] dark:block", markClassName)} />
        </>
      ) : (
        <LogoMark tone={tone} className={cn("size-[1.45em]", markClassName)} />
      )}
      <span className="leading-none">outbranch</span>
    </span>
  )
}
