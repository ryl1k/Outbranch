"use client"

import { cn } from "@/lib/utils"
import { useInView, useReducedMotion } from "./motion"

/** The evaluation criteria, hanging off a rail that grows as the list scrolls in. */
export function CriteriaRail({ criteria }: { criteria: readonly (readonly [string, string])[] }) {
  const { ref, inView } = useInView<HTMLDListElement>({ threshold: 0.2 })
  const reduced = useReducedMotion()
  const on = inView || reduced

  return (
    <dl ref={ref} className="relative pl-8">
      <span
        aria-hidden
        className={cn(
          "absolute top-2 bottom-2 left-[7px] w-px origin-top bg-gradient-to-b from-burgundy via-burgundy/50 to-rose transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          on ? "scale-y-100" : "scale-y-0",
        )}
      />
      {criteria.map(([name, question], i) => {
        const delay = on && !reduced ? `${200 + i * 140}ms` : undefined
        return (
          <div key={name} className="relative grid gap-1 border-b border-aubergine/10 py-4 last:border-b-0 sm:grid-cols-[200px_1fr] sm:gap-6">
            <span
              aria-hidden
              className={cn("absolute top-[1.45rem] -left-8 h-px w-5 origin-left bg-burgundy/50 transition-transform duration-500", on ? "scale-x-100" : "scale-x-0")}
              style={{ transitionDelay: delay }}
            />
            <span
              aria-hidden
              className={cn("absolute top-[1.2rem] -left-[30px] size-2.5 rounded-full border-2 border-burgundy bg-card transition-transform duration-500", on ? "scale-100" : "scale-0")}
              style={{ transitionDelay: delay }}
            />
            <dt className={cn("font-heading font-semibold text-aubergine transition-[opacity,translate] duration-600", on ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0")} style={{ transitionDelay: delay }}>
              {name}
            </dt>
            <dd className={cn("text-aubergine/70 transition-opacity duration-700", on ? "opacity-100" : "opacity-0")} style={{ transitionDelay: delay }}>
              {question}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
