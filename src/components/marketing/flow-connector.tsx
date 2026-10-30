"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "./motion"

/** Scroll distance, in pixels, over which the horizontal run draws. */
const LANE_SCROLL = 160

/**
 * Joins two sections with one branch: it leaves the element marked
 * `data-flow-start`, runs down the right gutter, crosses the gap marked
 * `data-flow-lane`, and descends the left gutter into `data-flow-end`. The
 * branch draws as the visitor scrolls. Hidden when either anchor is missing.
 */
export function FlowConnector({ children, className }: { children: React.ReactNode; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const [geo, setGeo] = useState<{ w: number; h: number; d: string } | null>(null)
  const [done, setDone] = useState(false)
  const reduced = useReducedMotion()
  const drawn = geo !== null

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    let frame = 0
    let last = ""

    const update = () => {
      frame = 0
      const box = root.getBoundingClientRect()
      const start = root.querySelector("[data-flow-start]")
      const lane = root.querySelector("[data-flow-lane]")
      const end = root.querySelector("[data-flow-end]")
      if (!start || !lane || !end || window.innerWidth < 768) {
        if (last) setGeo(null)
        last = ""
        return
      }
      const at = (el: Element) => {
        const r = el.getBoundingClientRect()
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, top: r.top - box.top }
      }
      const s = at(start)
      const e = at(end)
      const laneY = at(lane).top - 56
      const right = s.x + 24
      const r = Math.max(4, Math.min(32, (laneY - s.y) / 2, (e.y - laneY) / 2))
      const d = [
        `M ${s.x} ${s.y}`,
        `L ${right - r} ${s.y} Q ${right} ${s.y} ${right} ${s.y + r}`,
        `L ${right} ${laneY - r} Q ${right} ${laneY} ${right - r} ${laneY}`,
        `L ${e.x + r} ${laneY} Q ${e.x} ${laneY} ${e.x} ${laneY + r}`,
        `L ${e.x} ${e.y}`,
      ].join(" ")
      if (d !== last) {
        last = d
        setGeo({ w: box.width, h: box.height, d })
      }

      // Scroll-linked draw: the tip follows a line 70% down the viewport.
      const path = pathRef.current
      if (!path || reduced) return
      // The horizontal run gets its own stretch of scroll so it draws, not jumps.
      const down = laneY - s.y
      const across = right - e.x
      const descent = e.y - laneY
      const t = window.innerHeight * 0.7 - box.top - s.y
      const length =
        t <= down
          ? Math.max(0, t)
          : t <= down + LANE_SCROLL
            ? down + ((t - down) / LANE_SCROLL) * across
            : down + across + Math.min(descent, t - down - LANE_SCROLL)
      const progress = Math.min(1, length / (down + across + descent))
      path.style.strokeDashoffset = String(1 - progress)
      setDone(progress >= 1)
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    const ro = new ResizeObserver(schedule)
    ro.observe(root)
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      ro.disconnect()
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [reduced, drawn])

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {children}
      {geo && (
        <svg className="pointer-events-none absolute inset-0 overflow-visible" width={geo.w} height={geo.h} aria-hidden>
          <path
            ref={pathRef}
            d={geo.d}
            fill="none"
            stroke="#6B112E"
            strokeOpacity={0.6}
            strokeWidth={2}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={reduced ? 0 : 1}
          />
          {done && !reduced && (
            <path
              d={geo.d}
              fill="none"
              stroke="#D89AA8"
              strokeWidth={3}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="4 96"
              className="animate-[branch-pulse_5s_linear_infinite]"
            />
          )}
        </svg>
      )}
    </div>
  )
}
