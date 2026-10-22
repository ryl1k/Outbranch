"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useInView, useReducedMotion } from "./motion"

type Point = { x: number; y: number }

/** Time for a branch to reach the first marker, and to travel between markers. */
const ENTRY_MS = 700
const STEP_MS = 420
const ROW_GAP_MS = 250

/**
 * The workflow steps, connected by branches that grow out of the page frame.
 * Wide layouts: one trunk arrives down the left gutter and splits into an arm per
 * row that runs along the step markers. One column: a trunk runs down the left
 * with a twig to each step. Geometry comes from the real marker positions, so the
 * branches stay attached at every width and never cross the copy.
 */
export function WorkflowBranches({ steps }: { steps: readonly (readonly [string, string])[] }) {
  const { ref: frameRef, inView } = useInView<HTMLDivElement>({ threshold: 0.25 })
  const reduced = useReducedMotion()
  const markers = useRef<(HTMLSpanElement | null)[]>([])
  const [geo, setGeo] = useState<{ w: number; h: number; points: Point[] } | null>(null)

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const measure = () => {
      const box = frame.getBoundingClientRect()
      const points = markers.current.map((m) => {
        const r = m!.getBoundingClientRect()
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 }
      })
      setGeo({ w: box.width, h: box.height, points })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(frame)
    window.addEventListener("resize", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [frameRef])

  // Group markers into rows by their vertical position.
  const rows: number[][] = []
  geo?.points.forEach((p, i) => {
    const row = rows.find((r) => Math.abs(geo.points[r[0]].y - p.y) < 4)
    if (row) row.push(i)
    else rows.push([i])
  })
  const singleColumn = rows.length === steps.length

  // When each marker lights up, in milliseconds after the section enters view.
  const timing = steps.map((_, i) => {
    if (singleColumn) return ENTRY_MS * 0.6 + i * STEP_MS
    const r = rows.findIndex((row) => row.includes(i))
    const c = rows[r]?.indexOf(i) ?? 0
    return r * ROW_GAP_MS + ENTRY_MS + c * STEP_MS
  })

  const [started, setStarted] = useState(false)
  useEffect(() => {
    if (inView && !reduced) {
      const t = setTimeout(() => setStarted(true), 50)
      return () => clearTimeout(t)
    }
  }, [inView, reduced])
  const play = started || reduced

  const paths: { d: string; duration: number; delay: number }[] = []
  let origin: Point | null = null
  if (geo && geo.points.length) {
    if (singleColumn) {
      const first = geo.points[0]
      const last = geo.points[geo.points.length - 1]
      origin = { x: first.x, y: Math.max(0, first.y - 64) }
      paths.push({ d: `M ${first.x} ${origin.y} L ${last.x} ${last.y}`, duration: ENTRY_MS * 0.6 + (steps.length - 1) * STEP_MS, delay: 0 })
    } else {
      const ys = rows.map((r) => geo.points[r[0]].y)
      // Split in the left gutter, where the branch from the section above arrives.
      origin = { x: -16, y: (ys[0] + ys[ys.length - 1]) / 2 }
      rows.forEach((row, r) => {
        const first = geo.points[row[0]]
        const last = geo.points[row[row.length - 1]]
        const span = first.x - origin!.x
        paths.push({
          d: `M ${origin!.x} ${origin!.y} C ${origin!.x + span * 0.55} ${origin!.y}, ${first.x - Math.min(170, span * 0.35)} ${first.y}, ${first.x - 36} ${first.y} L ${last.x} ${last.y}`,
          duration: ENTRY_MS + (row.length - 1) * STEP_MS,
          delay: r * ROW_GAP_MS,
        })
      })
    }
  }

  return (
    <div ref={frameRef} className="relative">
      {geo && origin && (
        <svg className="pointer-events-none absolute inset-0 overflow-visible" width={geo.w} height={geo.h} aria-hidden>
          <defs>
            <linearGradient id="wf-branch" gradientUnits="userSpaceOnUse" x1={origin.x} x2={geo.w} y1="0" y2="0">
              <stop offset="0" stopColor="#6B112E" stopOpacity="0.6" />
              <stop offset="0.35" stopColor="#6B112E" stopOpacity="0.6" />
              <stop offset="1" stopColor="#9a4e62" />
            </linearGradient>
          </defs>
          {paths.map((p, i) => (
            <g key={i}>
              <path
                d={p.d}
                fill="none"
                stroke={singleColumn ? "#9a4e62" : "url(#wf-branch)"}
                strokeOpacity={singleColumn ? 0.5 : 1}
                strokeWidth={2}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1"
                strokeDashoffset={play ? 0 : 1}
                style={{ transition: reduced ? undefined : `stroke-dashoffset ${p.duration}ms linear ${p.delay}ms` }}
              />
              {/* A highlight that keeps travelling along each branch once it has grown. */}
              {play && !reduced && (
                <path
                  d={p.d}
                  fill="none"
                  stroke="#D89AA8"
                  strokeWidth={3}
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray="5 95"
                  className="animate-[branch-pulse_4s_linear_infinite]"
                  style={{ animationDelay: `${p.delay + p.duration}ms` }}
                />
              )}
            </g>
          ))}
          {!singleColumn && (
            <circle cx={origin.x} cy={origin.y} r={6} fill="#6B112E" opacity={play ? 1 : 0} className="transition-opacity duration-500" />
          )}
        </svg>
      )}
      {origin && !singleColumn && (
        <span data-flow-end aria-hidden className="absolute size-px" style={{ left: origin.x, top: origin.y }} />
      )}

      <ol className="relative grid gap-y-12 pl-12 md:grid-cols-2 md:gap-x-12 md:gap-y-16 md:pl-16 lg:grid-cols-3 lg:pl-20">
        {steps.map(([title, body], i) => {
          const on = play
          const delay = reduced ? undefined : `${timing[i]}ms`
          return (
            <li key={title} className="relative">
              <span
                ref={(el) => {
                  markers.current[i] = el
                }}
                className={cn(
                  "absolute top-0 -left-12 grid size-10 place-items-center rounded-full border font-heading text-sm font-semibold transition-[background-color,color,border-color,box-shadow] duration-500 md:static",
                  on ? "border-burgundy bg-burgundy text-ivory shadow-[0_0_0_7px_rgb(107_17_46/0.08)]" : "border-burgundy/20 bg-card text-burgundy",
                )}
                style={{ transitionDelay: on ? delay : undefined }}
              >
                {i + 1}
              </span>
              <div
                className={cn("transition-[opacity,translate] duration-700 ease-out md:mt-6", on ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0")}
                style={{ transitionDelay: on ? delay : undefined }}
              >
                <h3 className="font-heading text-lg font-semibold text-aubergine">{title}</h3>
                <p className="mt-2 max-w-sm leading-relaxed text-aubergine/70">{body}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
