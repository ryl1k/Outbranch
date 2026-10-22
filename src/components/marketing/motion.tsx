"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { cn } from "@/lib/utils"

const REDUCED = "(prefers-reduced-motion: reduce)"

export function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(REDUCED)
      mq.addEventListener("change", cb)
      return () => mq.removeEventListener("change", cb)
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  )
}

/** True once the element has scrolled into view (fires once). */
export function useInView<T extends Element>(options: { threshold?: number; rootMargin?: string } = {}) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  const { threshold = 0.2, rootMargin = "0px 0px -10% 0px" } = options

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold, rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [inView, threshold, rootMargin])

  return { ref, inView }
}

const OFFSET = {
  up: "translate-y-6",
  left: "-translate-x-6",
  right: "translate-x-6",
  none: "",
} as const

/** Fades and slides its children in when they enter the viewport. */
export function Reveal({
  children,
  className,
  delay = 0,
  from = "up",
  as: Tag = "div",
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  from?: keyof typeof OFFSET
  as?: "div" | "li" | "section" | "p" | "h2" | "dl"
}) {
  const { ref, inView } = useInView<HTMLElement>()
  const reduced = useReducedMotion()
  const shown = inView || reduced
  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn(
        "transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        shown ? "translate-x-0 translate-y-0 opacity-100" : cn("opacity-0", OFFSET[from]),
        className,
      )}
      style={{ transitionDelay: shown && !reduced ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  )
}
