import { cn } from "@/lib/utils"

/** Fan of curves leaving a single origin — the "branching paths" brand element. */
const ORIGIN = { x: 120, y: 400 }
const TARGETS = [40, 150, 260, 340, 400, 460, 540, 650, 760]

function curve(y: number, spread: number) {
  const { x, y: oy } = ORIGIN
  return `M${x} ${oy} C ${x + 260} ${oy}, ${x + 320 + spread} ${y}, 1000 ${y}`
}

export function BranchLines({
  className,
  animated = true,
  showOrigin = true,
}: {
  className?: string
  animated?: boolean
  /** Background uses hide the origin ring so it never lands on content. */
  showOrigin?: boolean
}) {
  return (
    <svg
      viewBox="0 0 1000 800"
      preserveAspectRatio="xMinYMid slice"
      aria-hidden
      className={cn("text-rose", className)}
      fill="none"
    >
      <defs>
        <linearGradient id="branch-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#6B112E" stopOpacity="0.2" />
          <stop offset="0.35" stopColor="#D89AA8" stopOpacity="0.85" />
          <stop offset="1" stopColor="#D89AA8" stopOpacity="0.08" />
        </linearGradient>
        <radialGradient id="branch-glow">
          <stop offset="0" stopColor="#6B112E" stopOpacity="0.55" />
          <stop offset="1" stopColor="#6B112E" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={ORIGIN.x + 340} cy={ORIGIN.y} r="420" fill="url(#branch-glow)" />
      {TARGETS.map((y, i) => (
        <path
          key={y}
          d={curve(y, (i % 3) * 40)}
          stroke="url(#branch-fade)"
          strokeWidth={i === 4 ? 2.2 : 1.1 + (i % 2) * 0.6}
          strokeDasharray={animated ? 1400 : undefined}
          style={
            animated
              ? ({ "--path-length": 1400, animationDelay: `${i * 90}ms` } as React.CSSProperties)
              : undefined
          }
          className={animated ? "animate-draw-path" : undefined}
        />
      ))}
      {showOrigin && (
        <>
          <circle cx={ORIGIN.x} cy={ORIGIN.y} r="7" fill="#F8F3EE" />
          <circle cx={ORIGIN.x} cy={ORIGIN.y} r="15" stroke="#F8F3EE" strokeOpacity="0.5" strokeWidth="1.5" />
        </>
      )}
    </svg>
  )
}
