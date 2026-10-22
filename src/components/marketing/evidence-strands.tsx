"use client"

import { cn } from "@/lib/utils"
import { useInView, useReducedMotion } from "./motion"

const KINDS = [
  { title: "Cultural signals", body: "Taste affinities from Qloo, each tied to the query that produced it.", color: "#9a4e62", dot: "bg-rose-strong" },
  { title: "Market evidence", body: "Facts from public sources on competitors, costs, licensing and precedent.", color: "#4a6047", dot: "bg-sage-strong" },
  { title: "Hypotheses", body: "AI-generated ideas, always shown as proposals and never as facts.", color: "#6B112E", dot: "bg-burgundy" },
] as const

const ROW = 112 // px per row; strand start points line up with the rows
const H = ROW * KINDS.length
const MERGE = { x: 150, y: H / 2 }

/** Three kinds of knowledge, drawn as strands that merge into one evidence-backed opportunity. */
export function EvidenceStrands() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.35 })
  const reduced = useReducedMotion()
  const on = inView || reduced

  return (
    <div ref={ref} className="grid grid-cols-[1fr_auto] items-start gap-4 sm:gap-8">
      <dl>
        {KINDS.map((k, i) => (
          <div
            key={k.title}
            className={cn("flex flex-col justify-center transition-[opacity,translate] duration-700", on ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0")}
            style={{ height: ROW, transitionDelay: on && !reduced ? `${i * 150}ms` : undefined }}
          >
            <dt className="flex items-center gap-2 font-heading font-semibold text-aubergine">
              <span className={cn("size-2 rounded-full", k.dot)} /> {k.title}
            </dt>
            <dd className="mt-1.5 max-w-sm text-sm text-aubergine/70">{k.body}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col items-center">
        {/* Stretches to the rows' height at any width; strokes stay 2.5px wide. */}
        <div className="relative w-28 sm:w-[190px]" style={{ height: H }}>
          <svg viewBox={`0 0 190 ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
            {KINDS.map((k, i) => {
              const y = ROW * i + ROW / 2
              return (
                <path
                  key={k.title}
                  d={`M 0 ${y} C 70 ${y}, 90 ${MERGE.y}, ${MERGE.x} ${MERGE.y}`}
                  fill="none"
                  stroke={k.color}
                  strokeWidth={2.5}
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="1"
                  strokeDashoffset={on ? 0 : 1}
                  style={{ transition: reduced ? undefined : `stroke-dashoffset 1100ms cubic-bezier(0.22,1,0.36,1) ${i * 150}ms` }}
                />
              )
            })}
            <path
              d={`M ${MERGE.x} ${MERGE.y} L 186 ${MERGE.y}`}
              stroke="#6B112E"
              strokeWidth={5}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset={on ? 0 : 1}
              style={{ transition: reduced ? undefined : "stroke-dashoffset 500ms ease-out 1100ms" }}
            />
          </svg>
          <span
            aria-hidden
            className={cn("absolute size-3.5 -translate-1/2 rounded-full bg-burgundy transition-opacity duration-500", on ? "opacity-100" : "opacity-0")}
            style={{ left: `${(MERGE.x / 190) * 100}%`, top: "50%", transitionDelay: on && !reduced ? "1000ms" : undefined }}
          />
          <span
            aria-hidden
            className={cn("absolute size-7 -translate-1/2 rounded-full border border-burgundy/30", on && !reduced && "animate-ping")}
            style={{ left: `${(MERGE.x / 190) * 100}%`, top: "50%", animationDuration: "2.4s" }}
          />
        </div>
        <p className={cn("mt-1 text-center text-xs font-medium text-burgundy transition-opacity duration-500", on ? "opacity-100" : "opacity-0")} style={{ transitionDelay: on && !reduced ? "1300ms" : undefined }}>
          One evidence-backed
          <br /> opportunity
        </p>
      </div>
    </div>
  )
}
